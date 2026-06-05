import {
  doc, setDoc, getDoc,
  serverTimestamp, collection, getDocs
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { fabric } from 'fabric'

// ─── Firestore path ───────────────────────────────────
// drawings/{projectId}/floors/{floorId}

export interface DrawingData {
  projectId:  string
  floorId:    string
  canvasJSON: string
  updatedAt:  any
  objectCount: number
}

// ─── Save canvas for a floor ─────────────────────────
export async function saveDrawing(
  projectId: string,
  floorId:   string,
  canvas:    fabric.Canvas
): Promise<void> {
  // Serialize canvas — keep BIM properties, exclude grid
  const json = canvas.toJSON([
    '__layerId', '__objectType', '__props', '__isGrid'
  ])

  // Remove grid objects before saving
  const cleaned = {
    ...json,
    objects: (json.objects as any[]).filter(
      (o: any) => !o.__isGrid
    ),
  }

  const objectCount = cleaned.objects.length

  await setDoc(
    doc(db, 'drawings', projectId, 'floors', floorId),
    {
      projectId,
      floorId,
      canvasJSON:  JSON.stringify(cleaned),
      updatedAt:   serverTimestamp(),
      objectCount,
    } satisfies Omit<DrawingData, 'updatedAt'> & { updatedAt: any }
  )
}

// ─── Load canvas for a floor ──────────────────────────
export async function loadDrawing(
  projectId: string,
  floorId:   string,
  canvas:    fabric.Canvas
): Promise<boolean> {
  const snap = await getDoc(
    doc(db, 'drawings', projectId, 'floors', floorId)
  )

  if (!snap.exists()) return false

  const data = snap.data() as DrawingData
  if (!data.canvasJSON) return false

  return new Promise((resolve) => {
    canvas.loadFromJSON(
      JSON.parse(data.canvasJSON),
      () => {
        canvas.renderAll()
        resolve(true)
      }
    )
  })
}

// ─── Check if a floor has saved drawing ──────────────
export async function hasDrawing(
  projectId: string,
  floorId:   string
): Promise<boolean> {
  const snap = await getDoc(
    doc(db, 'drawings', projectId, 'floors', floorId)
  )
  return snap.exists()
}

// ─── Get all saved floors for project ────────────────
export async function getSavedFloors(projectId: string): Promise<string[]> {
  const col  = collection(db, 'drawings', projectId, 'floors')
  const snap = await getDocs(col)
  return snap.docs.map((d) => d.id)
}

// ─── Auto-save to localStorage (offline backup) ──────
export function autoSaveLocal(
  projectId: string,
  floorId:   string,
  canvas:    fabric.Canvas
): void {
  try {
    const json = canvas.toJSON(['__layerId', '__objectType', '__isGrid'])
    const cleaned = {
      ...json,
      objects: (json.objects as any[]).filter((o: any) => !o.__isGrid),
    }
    const key = `civilos-arch-${projectId}-${floorId}`
    localStorage.setItem(key, JSON.stringify(cleaned))
    localStorage.setItem(`${key}-ts`, Date.now().toString())
  } catch { /* storage full — ignore */ }
}

// ─── Load from localStorage (fallback) ───────────────
export function loadLocal(
  projectId: string,
  floorId:   string,
  canvas:    fabric.Canvas
): boolean {
  try {
    const key  = `civilos-arch-${projectId}-${floorId}`
    const data = localStorage.getItem(key)
    if (!data) return false

    canvas.loadFromJSON(JSON.parse(data), () => canvas.renderAll())
    return true
  } catch {
    return false
  }
}

// ─── Extract BIM summary for Hub ─────────────────────
export function extractBIMSummary(canvas: fabric.Canvas) {
  const objects = canvas.getObjects().filter(
    (o) => !(o as any).__isGrid
  )

  const count = (type: string) =>
    objects.filter((o) => (o as any).__objectType === type).length

  return {
    wallCount:   count('wall'),
    doorCount:   count('door'),
    windowCount: count('window'),
    columnCount: count('column'),
    roomCount:   count('room'),
    totalObjects: objects.length,
  }
}
