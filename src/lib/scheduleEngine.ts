import { fabric } from 'fabric'
import { getBIMMeta } from '@/lib/bimObjects'
import type {
  DoorProps, WindowProps, RoomProps,
  ColumnProps, WallProps,
} from '@/types'

// ─── Schedule Row Types ───────────────────────────────

export interface DoorScheduleRow {
  id:           string
  type:         string
  width:        number       // mm
  height:       number       // mm
  material:     string
  openDirection: string
  quantity:     number
  remarks:      string
}

export interface WindowScheduleRow {
  id:          string
  type:        string
  width:       number        // mm
  height:      number        // mm
  sillLevel:   number        // mm
  material:    string
  quantity:    number
  area:        number        // m² (width × height)
  remarks:     string
}

export interface RoomScheduleRow {
  id:           string
  number:       string
  name:         string
  area:         number       // m²
  perimeter:    number       // m (approx)
  floorFinish:  string
  wallFinish:   string
  ceilingFinish: string
  occupancy:    number
  remarks:      string
}

export interface ColumnScheduleRow {
  id:       string
  gridRef:  string
  shape:    string
  width:    number           // mm
  depth:    number           // mm
  diameter: number           // mm (circular)
  quantity: number
  remarks:  string
}

export interface WallScheduleRow {
  type:      string
  thickness: number          // mm
  height:    number          // mm
  material:  string
  finish:    string
  totalLength: number        // mm (sum of all walls of this type)
  area:      number          // m² (length × height / 1e6)
  count:     number
}

export interface FullSchedule {
  doors:   DoorScheduleRow[]
  windows: WindowScheduleRow[]
  rooms:   RoomScheduleRow[]
  columns: ColumnScheduleRow[]
  walls:   WallScheduleRow[]
  summary: ScheduleSummary
}

export interface ScheduleSummary {
  totalDoors:    number
  totalWindows:  number
  totalRooms:    number
  totalColumns:  number
  totalWallArea: number      // m²
  totalFloorArea: number     // m²
  extractedAt:   string
  floorId:       string
}

// ─── Main Extractor ───────────────────────────────────
export function extractSchedules(
  canvas:  fabric.Canvas,
  floorId: string
): FullSchedule {
  const objects = canvas.getObjects().filter(
    (o: any) => o.__isBIM === true
  )

  const doorMap:   Map<string, DoorScheduleRow>   = new Map()
  const windowMap: Map<string, WindowScheduleRow> = new Map()
  const rooms:     RoomScheduleRow[]              = []
  const colMap:    Map<string, ColumnScheduleRow> = new Map()
  const wallMap:   Map<string, WallScheduleRow>   = new Map()

  for (const obj of objects) {
    const meta = getBIMMeta(obj)
    if (!meta) continue

    // ── DOORS ────────────────────────────────────────
    if (meta.__objectType === 'door') {
      const p    = meta.__props as DoorProps
      const key  = `${p.type}-${p.width}-${p.height}-${p.material}`
      const id   = meta.__id

      if (doorMap.has(id)) {
        doorMap.get(id)!.quantity++
      } else {
        doorMap.set(id, {
          id,
          type:          p.type,
          width:         p.width,
          height:        p.height,
          material:      p.material,
          openDirection: p.openDirection,
          quantity:      1,
          remarks:       '',
        })
      }
    }

    // ── WINDOWS ──────────────────────────────────────
    if (meta.__objectType === 'window') {
      const p   = meta.__props as WindowProps
      const id  = meta.__id
      const area = (p.width * p.height) / 1_000_000

      if (windowMap.has(id)) {
        windowMap.get(id)!.quantity++
      } else {
        windowMap.set(id, {
          id,
          type:      p.type,
          width:     p.width,
          height:    p.height,
          sillLevel: p.sillLevel,
          material:  p.material,
          quantity:  1,
          area:      Number(area.toFixed(3)),
          remarks:   '',
        })
      }
    }

    // ── ROOMS ────────────────────────────────────────
    if (meta.__objectType === 'room') {
      const p = meta.__props as RoomProps
      const bounds = obj.getBoundingRect()
      const perim  = 2 * (bounds.width + bounds.height) / 1000   // rough mm→m

      rooms.push({
        id:            meta.__id,
        number:        p.number,
        name:          p.name,
        area:          Number(p.area.toFixed(2)),
        perimeter:     Number(perim.toFixed(1)),
        floorFinish:   p.floorFinish,
        wallFinish:    p.wallFinish,
        ceilingFinish: p.ceilingFinish,
        occupancy:     p.occupancy,
        remarks:       '',
      })
    }

    // ── COLUMNS ──────────────────────────────────────
    if (meta.__objectType === 'column') {
      const p  = meta.__props as ColumnProps
      const id = meta.__id

      if (colMap.has(id)) {
        colMap.get(id)!.quantity++
      } else {
        colMap.set(id, {
          id,
          gridRef:  p.gridRef ?? '',
          shape:    p.shape,
          width:    p.width,
          depth:    p.depth,
          diameter: p.diameter ?? 0,
          quantity: 1,
          remarks:  '',
        })
      }
    }

    // ── WALLS ────────────────────────────────────────
    if (meta.__objectType === 'wall') {
      const p      = meta.__props as WallProps
      const key    = `${p.type}-${p.thickness}`
      const bounds = obj.getBoundingRect()
      const length = Math.max(bounds.width, bounds.height)   // px → mm (1:1)
      const area   = (length * p.height) / 1_000_000         // m²

      if (wallMap.has(key)) {
        const row = wallMap.get(key)!
        row.totalLength += length
        row.area        += area
        row.count++
      } else {
        wallMap.set(key, {
          type:        p.type,
          thickness:   p.thickness,
          height:      p.height,
          material:    p.material,
          finish:      p.finish,
          totalLength: length,
          area:        Number(area.toFixed(2)),
          count:       1,
        })
      }
    }
  }

  // ── Build arrays ──────────────────────────────────
  const doors   = Array.from(doorMap.values())
    .sort((a, b) => a.id.localeCompare(b.id))
  const windows = Array.from(windowMap.values())
    .sort((a, b) => a.id.localeCompare(b.id))
  const columns = Array.from(colMap.values())
    .sort((a, b) => a.id.localeCompare(b.id))
  const walls   = Array.from(wallMap.values())
    .sort((a, b) => a.type.localeCompare(b.type))

  // ── Summary ───────────────────────────────────────
  const totalWallArea  = walls.reduce((s, w) => s + w.area, 0)
  const totalFloorArea = rooms.reduce((s, r) => s + r.area, 0)

  return {
    doors,
    windows,
    rooms,
    columns,
    walls,
    summary: {
      totalDoors:     doors.reduce((s, d) => s + d.quantity, 0),
      totalWindows:   windows.reduce((s, w) => s + w.quantity, 0),
      totalRooms:     rooms.length,
      totalColumns:   columns.reduce((s, c) => s + c.quantity, 0),
      totalWallArea:  Number(totalWallArea.toFixed(2)),
      totalFloorArea: Number(totalFloorArea.toFixed(2)),
      extractedAt:    new Date().toISOString(),
      floorId,
    },
  }
}

// ─── Export to CSV ────────────────────────────────────
export function exportScheduleCSV(
  schedule: FullSchedule,
  type:     'doors' | 'windows' | 'rooms' | 'columns' | 'walls'
): string {
  const headers: Record<string, string[]> = {
    doors:   ['ID', 'Type', 'Width(mm)', 'Height(mm)', 'Material', 'Opens', 'Qty', 'Remarks'],
    windows: ['ID', 'Type', 'Width(mm)', 'Height(mm)', 'Sill(mm)', 'Material', 'Qty', 'Area(m²)', 'Remarks'],
    rooms:   ['ID', 'No.', 'Name', 'Area(m²)', 'Perimeter(m)', 'Floor Finish', 'Wall Finish', 'Ceiling', 'Occupancy', 'Remarks'],
    columns: ['ID', 'Grid Ref', 'Shape', 'Width(mm)', 'Depth(mm)', 'Dia(mm)', 'Qty', 'Remarks'],
    walls:   ['Type', 'Thick(mm)', 'Height(mm)', 'Material', 'Finish', 'Length(mm)', 'Area(m²)', 'Count'],
  }

  const rows: Record<string, (row: any) => string[]> = {
    doors:   (r: DoorScheduleRow)   => [r.id, r.type, String(r.width), String(r.height), r.material, r.openDirection, String(r.quantity), r.remarks],
    windows: (r: WindowScheduleRow) => [r.id, r.type, String(r.width), String(r.height), String(r.sillLevel), r.material, String(r.quantity), String(r.area), r.remarks],
    rooms:   (r: RoomScheduleRow)   => [r.id, r.number, r.name, String(r.area), String(r.perimeter), r.floorFinish, r.wallFinish, r.ceilingFinish, String(r.occupancy), r.remarks],
    columns: (r: ColumnScheduleRow) => [r.id, r.gridRef, r.shape, String(r.width), String(r.depth), String(r.diameter), String(r.quantity), r.remarks],
    walls:   (r: WallScheduleRow)   => [r.type, String(r.thickness), String(r.height), r.material, r.finish, String(Math.round(r.totalLength)), String(r.area.toFixed(2)), String(r.count)],
  }

  const csv = [
    headers[type].join(','),
    ...(schedule[type] as any[]).map((row) =>
      rows[type](row).map((v: string) => `"${v}"`).join(',')
    ),
  ].join('\n')

  return csv
}

// ─── Export to JSON (for Estimating App) ─────────────
export function exportScheduleJSON(schedule: FullSchedule): string {
  return JSON.stringify(
    {
      version:   '1.0',
      generatedAt: new Date().toISOString(),
      ...schedule,
    },
    null,
    2
  )
}

// ─── Save to Firestore path ───────────────────────────
// Estimating App reads from: projects/{id}/schedules/data
export function getScheduleFirestorePath(projectId: string): string {
  return `projects/${projectId}/schedules/data`
}

// ─── Format helpers ───────────────────────────────────
export function fmm(mm: number): string {
  if (mm >= 1000) return `${(mm / 1000).toFixed(2)}m`
  return `${mm}mm`
}

export function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    single:      'Single Door',
    double:      'Double Door',
    sliding:     'Sliding Door',
    folding:     'Folding Door',
    casement:    'Casement Win.',
    fixed:       'Fixed Win.',
    awning:      'Awning Win.',
    brick:       'Brick Wall',
    rcc:         'RCC Wall',
    partition:   'Partition Wall',
    curtain:     'Curtain Wall',
    square:      'Square Col.',
    rectangular: 'Rect. Col.',
    circular:    'Circular Col.',
  }
  return labels[type] ?? type
}
