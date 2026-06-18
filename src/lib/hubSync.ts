import {
  doc, getDoc, collection, getDocs,
  query, orderBy, setDoc, serverTimestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type {
  HubProject, SiteInfo, BNBCSettings,
  BuildingInfo, Floor
} from '@/types'

// ─── Collection paths (matching Hub's Firestore structure) ────
// Hub uses: projects/{id}/site_information/data
//           projects/{id}/bnbc_settings/data
//           projects/{id}/building_information/data

export interface FullProjectData {
  project:      HubProject
  siteInfo:     SiteInfo     | null
  bnbcSettings: BNBCSettings | null
  buildingInfo: BuildingInfo | null
  floors:       Floor[]
}

// ─── Fetch full project ───────────────────────────────
export async function fetchProjectData(
  projectId: string
): Promise<FullProjectData> {

  // 1. Project base doc
  const projSnap = await getDoc(doc(db, 'projects', projectId))
  if (!projSnap.exists()) {
    throw new Error(`Project "${projectId}" পাওয়া যায়নি`)
  }
  const project = { id: projSnap.id, ...projSnap.data() } as HubProject

  // 2. Site Info — Hub saves to: projects/{id}/site_information/data
  let siteInfo: SiteInfo | null = null
  try {
    const snap = await getDoc(
      doc(db, 'projects', projectId, 'site_information', 'data')
    )
    if (snap.exists()) siteInfo = snap.data() as SiteInfo
  } catch { /* optional */ }

  // 3. BNBC Settings — Hub saves to: projects/{id}/bnbc_settings/data
  let bnbcSettings: BNBCSettings | null = null
  try {
    const snap = await getDoc(
      doc(db, 'projects', projectId, 'bnbc_settings', 'data')
    )
    if (snap.exists()) bnbcSettings = snap.data() as BNBCSettings
  } catch { /* optional */ }

  // 4. Building Info — Hub saves to: projects/{id}/building_information/data
  let buildingInfo: BuildingInfo | null = null
  try {
    const snap = await getDoc(
      doc(db, 'projects', projectId, 'building_information', 'data')
    )
    if (snap.exists()) buildingInfo = snap.data() as BuildingInfo
  } catch { /* optional */ }

  // 5. Auto-generate floors from building info
  const floors = generateFloors(buildingInfo)

  return { project, siteInfo, bnbcSettings, buildingInfo, floors }
}

// ─── Fetch all projects list ──────────────────────────
export async function fetchAllProjects(): Promise<HubProject[]> {
  const q = query(
    collection(db, 'projects'),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as HubProject[]
}

// ─── Generate floors from BuildingInfo ───────────────
// Hub uses numFloors (not totalFloors)
export function generateFloors(info: BuildingInfo | null): Floor[] {
  const totalFloors = info?.numFloors ?? 0

  if (!info || totalFloors <= 0) {
    // Default: Ground + 1st Floor
    return [
      { id: 'gf', name: 'Ground Floor', level: 0,    height: 3000, order: 0 },
      { id: '1f', name: '1st Floor',    level: 3000, height: 3000, order: 1 },
    ]
  }

  const floors: Floor[] = []
  const heightMm = (info.floorHeight ?? 3) * 1000

  // Basements
  for (let i = info.basementCount ?? 0; i > 0; i--) {
    floors.push({
      id:     `b${i}`,
      name:   `Basement ${i}`,
      level:  -i * heightMm,
      height: heightMm,
      order:  -i,
    })
  }

  // Ground + upper floors
  for (let i = 0; i < totalFloors; i++) {
    floors.push({
      id:     i === 0 ? 'gf' : `${i}f`,
      name:   i === 0 ? 'Ground Floor' : `${getOrdinal(i)} Floor`,
      level:  i * heightMm,
      height: heightMm,
      order:  i,
    })
  }

  // Roof floor
  floors.push({
    id:     'roof',
    name:   'Roof',
    level:  totalFloors * heightMm,
    height: 0,
    order:  totalFloors,
  })

  return floors.sort((a, b) => a.order - b.order)
}

// ─── Mark drawing as started in Hub ──────────────────
export async function markDrawingStarted(projectId: string): Promise<void> {
  try {
    await setDoc(
      doc(db, 'projects', projectId, 'architecturalStatus', 'data'),
      {
        status:    'in_progress',
        startedAt: serverTimestamp(),
        app:       'CivilOS-Architectural v1.0',
      },
      { merge: true }
    )
  } catch {
    // Non-critical — don't throw
  }
}

// ─── Save drawing completion status to Hub ────────────
export async function markDrawingComplete(
  projectId: string,
  summary: {
    wallCount:   number
    doorCount:   number
    windowCount: number
    columnCount: number
    floorCount:  number
  }
): Promise<void> {
  await setDoc(
    doc(db, 'projects', projectId, 'architecturalStatus', 'data'),
    {
      status:      'complete',
      completedAt: serverTimestamp(),
      summary,
      app:         'CivilOS-Architectural v1.0',
    },
    { merge: true }
  )
}

// ─── Helper ───────────────────────────────────────────
function getOrdinal(n: number): string {
  const s  = ['th', 'st', 'nd', 'rd']
  const v  = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}
