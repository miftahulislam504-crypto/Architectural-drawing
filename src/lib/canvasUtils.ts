import { fabric } from 'fabric'

// ── Constants ────────────────────────────────────────
export const MIN_ZOOM      = 0.1
export const MAX_ZOOM      = 10
export const DEFAULT_SCALE = 5   // 1 grid unit = 5mm

// ── Zoom clamp ───────────────────────────────────────
export function clampZoom(zoom: number): number {
  return Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM)
}

// ── px → mm conversion ───────────────────────────────
export function pxToMm(px: number, zoom: number): number {
  return Math.round((px / zoom) * DEFAULT_SCALE) / 10
}

// ── Format mm for display ────────────────────────────
export function formatMm(mm: number): string {
  return mm.toFixed(1) + ' mm'
}

// ── Snap point to grid ───────────────────────────────
export function snapPoint(
  x: number,
  y: number,
  gridSize: number,
  zoom: number
): { x: number; y: number } {
  const step = gridSize / zoom
  return {
    x: Math.round(x / step) * step,
    y: Math.round(y / step) * step,
  }
}

// ── Find nearest endpoint on canvas ─────────────────
export function findNearestEndpoint(
  canvas: fabric.Canvas,
  point: fabric.Point,
  threshold = 15
): { x: number; y: number } | null {
  let nearest: { x: number; y: number } | null = null
  let minDist = threshold

  canvas.getObjects().forEach((obj: any) => {
    const candidates: { x: number; y: number }[] = []

    if (obj instanceof fabric.Line) {
      candidates.push({ x: obj.x1 ?? 0, y: obj.y1 ?? 0 })
      candidates.push({ x: obj.x2 ?? 0, y: obj.y2 ?? 0 })
    } else if (obj.left !== undefined && obj.top !== undefined) {
      candidates.push({ x: obj.left, y: obj.top })
    }

    candidates.forEach(pt => {
      const dist = Math.hypot(pt.x - point.x, pt.y - point.y)
      if (dist < minDist) {
        minDist  = dist
        nearest = pt
      }
    })
  })

  return nearest
}

// ── Draw grid on canvas ──────────────────────────────
interface DrawGridOptions {
  gridSize:  number
  scale:     number
  width:     number
  height:    number
  showGrid:  boolean
}

export function drawGrid(
  canvas: fabric.Canvas,
  { gridSize, width, height, showGrid }: DrawGridOptions
): void {
  // Remove existing grid objects
  const existing = canvas.getObjects().filter((o: any) => o.__grid === true)
  existing.forEach(o => canvas.remove(o))

  if (!showGrid) return

  const step = gridSize

  // Vertical lines
  for (let x = 0; x <= width; x += step) {
    const line = new fabric.Line([x, 0, x, height], {
      stroke:          '#1E2530',
      strokeWidth:     1,
      selectable:      false,
      evented:         false,
      hoverCursor:     'default',
      excludeFromExport: true,
    }) as any
    line.__grid = true
    canvas.add(line)
    canvas.sendToBack(line)
  }

  // Horizontal lines
  for (let y = 0; y <= height; y += step) {
    const line = new fabric.Line([0, y, width, y], {
      stroke:          '#1E2530',
      strokeWidth:     1,
      selectable:      false,
      evented:         false,
      hoverCursor:     'default',
      excludeFromExport: true,
    }) as any
    line.__grid = true
    canvas.add(line)
    canvas.sendToBack(line)
  }
}
