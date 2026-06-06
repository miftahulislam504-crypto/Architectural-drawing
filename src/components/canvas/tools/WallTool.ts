import { fabric } from 'fabric'
import { createWall, DEFAULT_WALL_PROPS } from '@/lib/bimObjects'
import type { WallProps } from '@/types'
import { snapPoint, formatMm } from '@/lib/canvasUtils'

export interface WallToolState {
  isDrawing:  boolean
  startPt:    { x: number; y: number } | null
  previewObj: fabric.Object | null
  lengthLabel: fabric.Text | null
}

export class WallTool {
  private canvas:    fabric.Canvas
  private state:     WallToolState
  private props:     WallProps
  private gridSize:  number
  private zoom:      number
  private onFinish?: (wall: fabric.Group) => void

  constructor(
    canvas:   fabric.Canvas,
    gridSize: number,
    zoom:     number,
    props?:   Partial<WallProps>,
    onFinish?: (wall: fabric.Group) => void
  ) {
    this.canvas   = canvas
    this.gridSize = gridSize
    this.zoom     = zoom
    this.props    = { ...DEFAULT_WALL_PROPS, ...props }
    this.onFinish = onFinish
    this.state    = {
      isDrawing:   false,
      startPt:     null,
      previewObj:  null,
      lengthLabel: null,
    }
  }

  setZoom(zoom: number)         { this.zoom = zoom }
  setGridSize(size: number)     { this.gridSize = size }
  setProps(p: Partial<WallProps>) { this.props = { ...this.props, ...p } }

  private snap(x: number, y: number) {
    return snapPoint(x, y, this.gridSize, this.zoom)
  }

  // ── Mouse Down ─────────────────────────────────────
  onMouseDown(x: number, y: number): void {
    const pt = this.snap(x, y)

    if (!this.state.isDrawing) {
      // First click — set start point
      this.state.isDrawing = true
      this.state.startPt   = pt

      // Start marker dot
      const dot = new fabric.Circle({
        left:   pt.x - 4,
        top:    pt.y - 4,
        radius: 4,
        fill:   '#00B4D8',
        stroke: '#0D0F12',
        strokeWidth: 1,
        selectable:  false,
        evented:     false,
      }) as any
      dot.__temp = true
      this.canvas.add(dot)

    } else {
      // Second click — commit wall
      this.commitWall(pt.x, pt.y)
    }
  }

  // ── Mouse Move — live preview ──────────────────────
  onMouseMove(x: number, y: number): void {
    if (!this.state.isDrawing || !this.state.startPt) return

    const pt    = this.snap(x, y)
    const start = this.state.startPt

    // Remove old preview
    this.clearPreview()

    const dx    = pt.x - start.x
    const dy    = pt.y - start.y
    const lenPx = Math.hypot(dx, dy)
    const lenMm = lenPx  // 1px = 1mm

    if (lenPx < 2) return

    // Live wall preview line
    const preview = new fabric.Line(
      [start.x, start.y, pt.x, pt.y],
      {
        stroke:      '#64748B',
        strokeWidth: this.props.thickness,
        strokeLineCap: 'square',
        opacity:     0.5,
        selectable:  false,
        evented:     false,
      }
    ) as any
    preview.__temp = true
    this.canvas.add(preview)
    this.state.previewObj = preview

    // Length label
    const midX   = (start.x + pt.x) / 2
    const midY   = (start.y + pt.y) / 2
    const angle  = Math.atan2(dy, dx) * (180 / Math.PI)
    const label  = new fabric.Text(formatMm(lenMm), {
      left:      midX,
      top:       midY - 16,
      fontSize:  11,
      fill:      '#00B4D8',
      fontFamily: 'JetBrains Mono',
      originX:   'center',
      angle:     angle > 90 || angle < -90 ? angle + 180 : angle,
      selectable: false,
      evented:   false,
      backgroundColor: 'rgba(13,15,18,0.7)',
    }) as any
    label.__temp = true
    this.canvas.add(label)
    this.state.lengthLabel = label

    this.canvas.renderAll()
  }

  // ── Key ESC — cancel ──────────────────────────────
  onEscape(): void {
    this.clearPreview()
    this.clearTempDots()
    this.state = {
      isDrawing:   false,
      startPt:     null,
      previewObj:  null,
      lengthLabel: null,
    }
    this.canvas.renderAll()
  }

  // ── Commit final wall ──────────────────────────────
  private commitWall(ex: number, ey: number): void {
    const start = this.state.startPt!
    const pt    = this.snap(ex, ey)

    this.clearPreview()
    this.clearTempDots()

    const dx  = pt.x - start.x
    const dy  = pt.y - start.y
    const len = Math.hypot(dx, dy)
    if (len < 5) {
      this.state.isDrawing = false
      this.state.startPt   = null
      return
    }

    const id   = `W-${Date.now()}`
    const wall = createWall(
      { x1: start.x, y1: start.y, x2: pt.x, y2: pt.y },
      this.props,
      id
    )

    this.canvas.add(wall)
    this.canvas.setActiveObject(wall)
    this.canvas.renderAll()

    this.onFinish?.(wall)

    // Reset for next wall (continuous drawing)
    this.state.startPt = pt
  }

  // ── Double click / finish ──────────────────────────
  onDoubleClick(): void {
    this.onEscape()
  }

  private clearPreview(): void {
    if (this.state.previewObj) {
      this.canvas.remove(this.state.previewObj)
      this.state.previewObj = null
    }
    if (this.state.lengthLabel) {
      this.canvas.remove(this.state.lengthLabel)
      this.state.lengthLabel = null
    }
  }

  private clearTempDots(): void {
    const temps = this.canvas.getObjects().filter(
      (o: any) => o.__temp === true
    )
    temps.forEach((o) => this.canvas.remove(o))
  }

  dispose(): void {
    this.onEscape()
  }
}
