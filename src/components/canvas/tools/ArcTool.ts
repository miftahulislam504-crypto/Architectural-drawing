import { fabric } from 'fabric'
import { snapPoint, formatMm } from '@/lib/canvasUtils'

export class ArcTool {
  private canvas:   fabric.Canvas
  private gridSize: number
  private zoom:     number
  private step:     number = 0
  private center:   { x: number; y: number } | null = null
  private startPt:  { x: number; y: number } | null = null
  private preview:  fabric.Object[] = []

  constructor(canvas: fabric.Canvas, gridSize: number, zoom: number) {
    this.canvas   = canvas
    this.gridSize = gridSize
    this.zoom     = zoom
  }

  setZoom(z: number) { this.zoom = z }

  private snap(x: number, y: number) {
    return snapPoint(x, y, this.gridSize, this.zoom)
  }

  private clearPreview() {
    this.preview.forEach((o) => this.canvas.remove(o))
    this.preview = []
  }

  private clearTemps() {
    this.canvas.getObjects()
      .filter((o: any) => o.__temp)
      .forEach((o) => this.canvas.remove(o))
  }

  // ── Mouse Down: step 0 = center, 1 = start, 2 = end ─
  onMouseDown(x: number, y: number): void {
    const pt = this.snap(x, y)

    if (this.step === 0) {
      this.center = pt
      this.step   = 1
      const dot = makeDot(pt.x, pt.y, '#00B4D8', 5)
      this.canvas.add(dot)
      this.canvas.renderAll()

    } else if (this.step === 1) {
      this.startPt = pt
      this.step    = 2
      const dot = makeDot(pt.x, pt.y, '#F59E0B', 4)
      this.canvas.add(dot)
      this.canvas.renderAll()

    } else if (this.step === 2) {
      this.commitArc(pt)
    }
  }

  // ── Mouse Move — preview arc ───────────────────────
  onMouseMove(x: number, y: number): void {
    if (!this.center || this.step === 0) return
    const pt = this.snap(x, y)
    this.clearPreview()

    if (this.step === 1) {
      // Preview radius circle
      const r    = Math.hypot(pt.x - this.center.x, pt.y - this.center.y)
      const circ = new fabric.Circle({
        left:        this.center.x - r,
        top:         this.center.y - r,
        radius:      r,
        fill:        'transparent',
        stroke:      'rgba(0,180,216,0.3)',
        strokeWidth: 1,
        strokeDashArray: [4, 4],
        selectable:  false,
        evented:     false,
      }) as any
      circ.__temp = true
      this.canvas.add(circ)
      this.preview = [circ]

    } else if (this.step === 2 && this.startPt) {
      // Preview arc from startPt to cursor
      const c    = this.center
      const r    = Math.hypot(this.startPt.x - c.x, this.startPt.y - c.y)
      const sa   = Math.atan2(this.startPt.y - c.y, this.startPt.x - c.x) * (180 / Math.PI)
      const ea   = Math.atan2(pt.y - c.y, pt.x - c.x) * (180 / Math.PI)

      const path = makeArcPath(c.x, c.y, r, sa, ea)
      const arc  = new fabric.Path(path, {
        stroke:      '#00B4D8',
        strokeWidth: 1.5,
        fill:        'transparent',
        opacity:     0.7,
        selectable:  false,
        evented:     false,
      }) as any
      arc.__temp = true
      this.canvas.add(arc)
      this.preview = [arc]

      // Radius label
      const lbl = new fabric.Text(`R: ${formatMm(r / this.zoom)}`, {
        left:       c.x + 8,
        top:        c.y - 16,
        fontSize:   10,
        fill:       '#00B4D8',
        fontFamily: 'JetBrains Mono',
        selectable: false,
        evented:    false,
        backgroundColor: 'rgba(13,15,18,0.8)',
      }) as any
      lbl.__temp = true
      this.canvas.add(lbl)
      this.preview.push(lbl)
    }

    this.canvas.renderAll()
  }

  // ── Commit Arc ─────────────────────────────────────
  private commitArc(endPt: { x: number; y: number }): void {
    if (!this.center || !this.startPt) return
    const c  = this.center
    const sp = this.startPt
    const r  = Math.hypot(sp.x - c.x, sp.y - c.y)
    const sa = Math.atan2(sp.y     - c.y, sp.x     - c.x) * (180 / Math.PI)
    const ea = Math.atan2(endPt.y  - c.y, endPt.x  - c.x) * (180 / Math.PI)

    this.clearPreview()
    this.clearTemps()

    const path = makeArcPath(c.x, c.y, r, sa, ea)
    const arc  = new fabric.Path(path, {
      stroke:      '#E8EAF0',
      strokeWidth: 1,
      fill:        'transparent',
      selectable:  true,
      hasControls: true,
    }) as any
    arc.__objectType = 'arc'
    arc.__layerId    = 'walls'

    this.canvas.add(arc)
    this.canvas.setActiveObject(arc)
    this.canvas.renderAll()

    this.step    = 0
    this.center  = null
    this.startPt = null
  }

  onEscape(): void {
    this.clearPreview()
    this.clearTemps()
    this.step    = 0
    this.center  = null
    this.startPt = null
    this.canvas.renderAll()
  }

  dispose(): void { this.onEscape() }
}

// ─── Helpers ──────────────────────────────────────────
function makeArcPath(
  cx: number, cy: number, r: number,
  startDeg: number, endDeg: number
): string {
  const toRad = (d: number) => d * Math.PI / 180
  const sx = cx + r * Math.cos(toRad(startDeg))
  const sy = cy + r * Math.sin(toRad(startDeg))
  const ex = cx + r * Math.cos(toRad(endDeg))
  const ey = cy + r * Math.sin(toRad(endDeg))
  const diff = ((endDeg - startDeg) + 360) % 360
  const lg   = diff > 180 ? 1 : 0
  return `M ${sx} ${sy} A ${r} ${r} 0 ${lg} 1 ${ex} ${ey}`
}

function makeDot(x: number, y: number, color: string, r: number): fabric.Circle {
  const dot = new fabric.Circle({
    left: x - r, top: y - r, radius: r,
    fill: color, stroke: '#0D0F12', strokeWidth: 1,
    selectable: false, evented: false,
  }) as any
  dot.__temp = true
  return dot
}
