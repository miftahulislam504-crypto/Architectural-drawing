import { fabric } from 'fabric'
import { snapPoint, formatMm } from '@/lib/canvasUtils'

export class PolylineTool {
  private canvas:   fabric.Canvas
  private gridSize: number
  private zoom:     number
  private points:   { x: number; y: number }[] = []
  private segments: fabric.Line[]  = []
  private dots:     fabric.Circle[] = []
  private preview:  fabric.Line | null = null
  private totalLabel: fabric.Text | null = null
  private closed:   boolean = false

  constructor(canvas: fabric.Canvas, gridSize: number, zoom: number, closed = false) {
    this.canvas   = canvas
    this.gridSize = gridSize
    this.zoom     = zoom
    this.closed   = closed
  }

  setZoom(z: number)    { this.zoom = z }
  setClosed(c: boolean) { this.closed = c }

  private snap(x: number, y: number) {
    return snapPoint(x, y, this.gridSize, this.zoom)
  }

  // ── Mouse Down — add point ─────────────────────────
  onMouseDown(x: number, y: number, isDouble = false): void {
    const pt = this.snap(x, y)

    if (isDouble && this.points.length >= 2) {
      this.commitPolyline()
      return
    }

    // Check snap-to-start for closed polyline
    if (this.closed && this.points.length >= 3) {
      const first = this.points[0]
      if (Math.hypot(pt.x - first.x, pt.y - first.y) < 15) {
        this.commitPolyline(true)
        return
      }
    }

    // Add line from previous point
    if (this.points.length > 0) {
      const prev = this.points[this.points.length - 1]
      const seg  = new fabric.Line([prev.x, prev.y, pt.x, pt.y], {
        stroke:      '#E8EAF0',
        strokeWidth: 1.5,
        strokeLineCap: 'round',
        selectable:  false,
        evented:     false,
      }) as any
      seg.__temp = true
      this.canvas.add(seg)
      this.segments.push(seg)
    }

    // Corner dot
    const dot = new fabric.Circle({
      left:   pt.x - 3, top: pt.y - 3, radius: 3,
      fill:   this.points.length === 0 ? '#00B4D8' : 'rgba(232,234,240,0.6)',
      stroke: '#E8EAF0', strokeWidth: 0.5,
      selectable: false, evented: false,
    }) as any
    dot.__temp = true
    this.canvas.add(dot)
    this.dots.push(dot)

    this.points.push(pt)
    this.canvas.renderAll()
  }

  // ── Mouse Move — live segment ──────────────────────
  onMouseMove(x: number, y: number): void {
    if (this.points.length === 0) return
    const pt   = this.snap(x, y)
    const prev = this.points[this.points.length - 1]

    if (this.preview) {
      this.canvas.remove(this.preview)
      this.preview = null
    }
    if (this.totalLabel) {
      this.canvas.remove(this.totalLabel)
      this.totalLabel = null
    }

    const seg = new fabric.Line([prev.x, prev.y, pt.x, pt.y], {
      stroke:          '#E8EAF0',
      strokeWidth:     1,
      strokeDashArray: [4, 4],
      opacity:         0.5,
      selectable:      false,
      evented:         false,
    }) as any
    seg.__temp = true
    this.canvas.add(seg)
    this.preview = seg

    // Total length label
    if (this.points.length >= 1) {
      let total = 0
      for (let i = 0; i < this.points.length - 1; i++) {
        total += Math.hypot(
          this.points[i+1].x - this.points[i].x,
          this.points[i+1].y - this.points[i].y
        )
      }
      total += Math.hypot(pt.x - prev.x, pt.y - prev.y)

      const lbl = new fabric.Text(`Total: ${formatMm(total / this.zoom)}`, {
        left:       pt.x + 8,
        top:        pt.y - 20,
        fontSize:   10,
        fill:       '#9CA3AF',
        fontFamily: 'JetBrains Mono',
        selectable: false,
        evented:    false,
        backgroundColor: 'rgba(13,15,18,0.8)',
      }) as any
      lbl.__temp = true
      this.canvas.add(lbl)
      this.totalLabel = lbl
    }

    this.canvas.renderAll()
  }

  // ── Commit polyline ────────────────────────────────
  private commitPolyline(closePath = false): void {
    if (this.points.length < 2) {
      this.reset()
      return
    }

    this.clearTemps()

    // Build SVG path
    let d = this.points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ')
    if (closePath) d += ' Z'

    const poly = new fabric.Path(d, {
      stroke:        '#E8EAF0',
      strokeWidth:   1.5,
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      fill:          closePath ? 'rgba(232,234,240,0.05)' : 'transparent',
      selectable:    true,
      hasControls:   true,
    }) as any
    poly.__objectType = closePath ? 'polygon' : 'polyline'
    poly.__layerId    = 'walls'

    this.canvas.add(poly)
    this.canvas.setActiveObject(poly)
    this.canvas.renderAll()

    this.reset()
  }

  onDoubleClick(): void {
    this.commitPolyline(this.closed)
  }

  onEscape(): void {
    this.clearTemps()
    this.reset()
  }

  private clearTemps(): void {
    this.canvas.getObjects()
      .filter((o: any) => o.__temp)
      .forEach((o) => this.canvas.remove(o))
    this.canvas.renderAll()
  }

  private reset(): void {
    this.points   = []
    this.segments = []
    this.dots     = []
    this.preview  = null
    this.totalLabel = null
  }

  dispose(): void { this.onEscape() }
}
