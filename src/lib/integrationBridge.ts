import { fabric } from 'fabric'
import {
  doc, setDoc, getDoc,
  collection, getDocs,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { extractQuantities } from '@/lib/quantityEngine'
import { extractSchedules  } from '@/lib/scheduleEngine'
import { exportForStructural } from '@/lib/gridSystem'
import { getBIMMeta } from '@/lib/bimObjects'
import type {
  GridSystem, StructuralGridExport,
} from '@/lib/gridSystem'
import type { BOQData      } from '@/lib/quantityEngine'
import type { FullSchedule } from '@/lib/scheduleEngine'
import type { Floor, SiteInfo, BNBCSettings, BuildingInfo } from '@/types'

// ─── Integration Payload ──────────────────────────────
export interface ArchitecturalPayload {
  version:     string
  projectId:   string
  exportedAt:  string
  exportedBy:  string          // 'CivilOS-Architectural v1.0'

  // For Structural App
  structural: {
    grid:          StructuralGridExport | null
    columnLocations: ColumnLocation[]
    beamLayout:    BeamLayout[]
    slabAreas:     SlabArea[]
    floorLevels:   FloorLevel[]
    materials:     StructuralMaterials
  }

  // For Estimating App
  estimating: {
    boq:       BOQData      | null
    schedules: FullSchedule | null
    floorArea: number
    wallArea:  number
  }

  // For Project Management
  projectManagement: {
    completionPercent: number
    drawingStatus:     'not_started' | 'in_progress' | 'complete' | 'approved'
    floorCount:        number
    totalObjects:      number
    lastModified:      string
  }

  // Shared metadata
  metadata: {
    siteInfo:     SiteInfo     | null
    bnbcSettings: BNBCSettings | null
    buildingInfo: BuildingInfo | null
    floors:       Floor[]
  }
}

// ─── Sub-types ────────────────────────────────────────
export interface ColumnLocation {
  id:      string
  gridRef: string
  x_mm:    number
  y_mm:    number
  width:   number
  depth:   number
  shape:   string
}

export interface BeamLayout {
  id:    string
  fromX: number
  fromY: number
  toX:   number
  toY:   number
  span:  number    // mm
}

export interface SlabArea {
  floorId: string
  area:    number  // m²
  level:   number  // mm
}

export interface FloorLevel {
  floorId: string
  name:    string
  level:   number  // mm from datum
  height:  number  // mm floor-to-floor
}

export interface StructuralMaterials {
  concreteGrade: string
  steelGrade:    string
  brickClass:    string
}

// ─── Extract structural data from canvas ─────────────
export function extractStructuralData(
  canvas:    fabric.Canvas,
  floors:    Floor[],
  gridSystem?: GridSystem | null
): ArchitecturalPayload['structural'] {

  const objects = canvas.getObjects().filter(
    (o: any) => o.__isBIM === true
  )

  // Column locations
  const columnLocations: ColumnLocation[] = []
  // Beam layout (inferred from walls between columns)
  const beamLayout: BeamLayout[] = []

  for (const obj of objects) {
    const meta = getBIMMeta(obj)
    if (!meta) continue
    const bounds = obj.getBoundingRect()
    const cx     = bounds.left + bounds.width  / 2
    const cy     = bounds.top  + bounds.height / 2

    if (meta.__objectType === 'column') {
      const p = meta.__props as any
      columnLocations.push({
        id:      meta.__id,
        gridRef: p.gridRef ?? '',
        x_mm:    Math.round(cx),
        y_mm:    Math.round(cy),
        width:   p.width,
        depth:   p.depth,
        shape:   p.shape,
      })
    }

    if (meta.__objectType === 'wall') {
      const p = meta.__props as any
      if (p.type === 'rcc' || p.type === 'brick') {
        beamLayout.push({
          id:    meta.__id,
          fromX: Math.round(bounds.left),
          fromY: Math.round(bounds.top),
          toX:   Math.round(bounds.left + bounds.width),
          toY:   Math.round(bounds.top  + bounds.height),
          span:  Math.round(Math.max(bounds.width, bounds.height)),
        })
      }
    }
  }

  // Slab areas from rooms
  const slabAreas: SlabArea[] = []
  const roomObjects = objects.filter(
    (o: any) => o.__objectType === 'room'
  )
  for (const obj of roomObjects) {
    const meta = getBIMMeta(obj)
    if (!meta) continue
    const p = meta.__props as any
    // Use first floor as default (multi-floor handled by floor-by-floor export)
    slabAreas.push({
      floorId: floors[0]?.id ?? 'gf',
      area:    p.area ?? 0,
      level:   floors[0]?.level ?? 0,
    })
  }

  // Floor levels from floor list
  const floorLevels: FloorLevel[] = floors.map((f) => ({
    floorId: f.id,
    name:    f.name,
    level:   f.level,
    height:  f.height,
  }))

  // Grid export
  const gridExport = gridSystem
    ? exportForStructural(gridSystem, '', columnLocations.map((c) => c.gridRef))
    : null

  return {
    grid:            gridExport,
    columnLocations,
    beamLayout,
    slabAreas,
    floorLevels,
    materials: {
      concreteGrade: 'M25',
      steelGrade:    'Fe500',
      brickClass:    '1st class',
    },
  }
}

// ─── Build full payload ───────────────────────────────
export async function buildPayload(
  canvas:       fabric.Canvas,
  projectId:    string,
  floors:       Floor[],
  activeFloorId: string,
  siteInfo:     SiteInfo     | null,
  bnbcSettings: BNBCSettings | null,
  buildingInfo: BuildingInfo | null,
  gridSystem?:  GridSystem   | null
): Promise<ArchitecturalPayload> {

  const boq       = extractQuantities(canvas, activeFloorId, projectId,
                      buildingInfo?.floorHeight ?? 3)
  const schedules = extractSchedules(canvas, activeFloorId)
  const structural = extractStructuralData(canvas, floors, gridSystem)

  // Count total BIM objects
  const totalObjects = canvas.getObjects().filter(
    (o: any) => o.__isBIM
  ).length

  // Completion estimate
  const hasWalls   = structural.beamLayout.length > 0
  const hasColumns = structural.columnLocations.length > 0
  const hasDoors   = schedules.doors.length   > 0
  const hasWindows = schedules.windows.length > 0
  const hasRooms   = schedules.rooms.length   > 0
  const completionPercent = [
    hasWalls, hasColumns, hasDoors, hasWindows, hasRooms,
  ].filter(Boolean).length * 20

  return {
    version:    '1.0',
    projectId,
    exportedAt: new Date().toISOString(),
    exportedBy: 'CivilOS-Architectural v1.0',

    structural,

    estimating: {
      boq,
      schedules,
      floorArea: schedules.summary.totalFloorArea,
      wallArea:  boq.summary.brickWallArea + boq.summary.rccWallArea,
    },

    projectManagement: {
      completionPercent,
      drawingStatus:  completionPercent >= 80 ? 'complete' : 'in_progress',
      floorCount:     floors.length,
      totalObjects,
      lastModified:   new Date().toISOString(),
    },

    metadata: {
      siteInfo,
      bnbcSettings,
      buildingInfo,
      floors,
    },
  }
}

// ─── Push to all apps ─────────────────────────────────
export interface PushResult {
  app:     string
  success: boolean
  error?:  string
}

export async function pushToAllApps(
  payload:   ArchitecturalPayload,
  projectId: string
): Promise<PushResult[]> {

  const results: PushResult[] = []

  // ── 1. Structural App ─────────────────────────────
  try {
    await setDoc(
      doc(db, `projects/${projectId}/structuralInput/data`),
      {
        grid:            payload.structural.grid,
        columnLocations: payload.structural.columnLocations,
        beamLayout:      payload.structural.beamLayout,
        slabAreas:       payload.structural.slabAreas,
        floorLevels:     payload.structural.floorLevels,
        materials:       payload.structural.materials,
        metadata:        payload.metadata,
        pushedAt:        serverTimestamp(),
        source:          'CivilOS-Architectural',
      }
    )
    results.push({ app: 'Structural App', success: true })
  } catch (e: any) {
    results.push({ app: 'Structural App', success: false, error: e.message })
  }

  // ── 2. Estimating App ─────────────────────────────
  try {
    await setDoc(
      doc(db, `projects/${projectId}/estimatingInput/data`),
      {
        boq:       payload.estimating.boq,
        schedules: payload.estimating.schedules,
        floorArea: payload.estimating.floorArea,
        wallArea:  payload.estimating.wallArea,
        metadata:  payload.metadata,
        pushedAt:  serverTimestamp(),
        source:    'CivilOS-Architectural',
      }
    )
    results.push({ app: 'Estimating App', success: true })
  } catch (e: any) {
    results.push({ app: 'Estimating App', success: false, error: e.message })
  }

  // ── 3. Project Management App ─────────────────────
  try {
    await setDoc(
      doc(db, `projects/${projectId}/architecturalStatus/data`),
      {
        ...payload.projectManagement,
        pushedAt: serverTimestamp(),
        source:   'CivilOS-Architectural',
      },
      { merge: true }
    )
    results.push({ app: 'Project Management', success: true })
  } catch (e: any) {
    results.push({ app: 'Project Management', success: false, error: e.message })
  }

  // ── 4. Hub (master summary) ───────────────────────
  try {
    await setDoc(
      doc(db, `projects/${projectId}/architecturalSummary/data`),
      {
        completionPercent: payload.projectManagement.completionPercent,
        drawingStatus:     payload.projectManagement.drawingStatus,
        totalObjects:      payload.projectManagement.totalObjects,
        floorCount:        payload.projectManagement.floorCount,
        floorArea:         payload.estimating.floorArea,
        columnCount:       payload.structural.columnLocations.length,
        exportedAt:        serverTimestamp(),
      },
      { merge: true }
    )
    results.push({ app: 'CivilOS Hub', success: true })
  } catch (e: any) {
    results.push({ app: 'CivilOS Hub', success: false, error: e.message })
  }

  return results
}

// ─── Check if other apps have read the data ───────────
export async function checkIntegrationStatus(
  projectId: string
): Promise<Record<string, boolean>> {
  const status: Record<string, boolean> = {}

  const paths = [
    { key: 'structural',   path: `projects/${projectId}/structuralInput/data`   },
    { key: 'estimating',   path: `projects/${projectId}/estimatingInput/data`   },
    { key: 'projectMgmt',  path: `projects/${projectId}/architecturalStatus/data` },
  ]

  for (const { key, path } of paths) {
    try {
      const snap = await getDoc(doc(db, path))
      status[key] = snap.exists()
    } catch {
      status[key] = false
    }
  }

  return status
}

// ─── Firestore paths reference ────────────────────────
export const INTEGRATION_PATHS = {
  // Written by Architectural App, Read by Structural App
  structuralInput:    (pid: string) => `projects/${pid}/structuralInput/data`,
  // Written by Architectural App, Read by Estimating App
  estimatingInput:    (pid: string) => `projects/${pid}/estimatingInput/data`,
  // Written by Architectural App, Read by Project Mgmt
  architecturalStatus:(pid: string) => `projects/${pid}/architecturalStatus/data`,
  // Written by Structural App, Read by Estimating
  structuralOutput:   (pid: string) => `projects/${pid}/structuralOutput/data`,
  // Written by Estimating App
  boqFinal:           (pid: string) => `projects/${pid}/boqFinal/data`,
  // Grid export for ETABS
  structuralGrid:     (pid: string) => `projects/${pid}/structuralGrid/data`,
  // Schedules for Estimating
  schedules:          (pid: string) => `projects/${pid}/schedules/data`,
}
