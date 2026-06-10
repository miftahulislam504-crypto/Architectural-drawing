import { fabric } from 'fabric'
import { snapPoint, formatMm } from '@/lib/canvasUtils'

export type DimensionType = 'linear' | 'aligned' | 'angular'

export class DimensionTool {
  private canvas:   fabric.Canvas
  private gridSize: number
  private zoom:     number
  private type:     DimensionType
  private step:     number = 0
  private pt1:      { x: number; y: number } | null = null
  private pt2:      { x: number; y: number } | null = null
  private preview:  fabric.Object[] = []
  private OFFSET:   number = 30   // px offset for dimension line

  constructor(
    canvas:   fabric.Canvas,
    gridSize: number,
    zoom:     number,
    type:     DimensionType = 'linear'
  ) {
    this.canvas   = canvas
    this.gridSize = gridSize
    this.zoom     = zoom
    this.type     = type
  }

  setZoom(z: number)             { this.zoom    = z }
  setType(t: DimensionType)      { this.type    = t }
  setOffset(o: number)           { this.OFFSET  = o }

  private snap(x: number, y: number) {
    return snapPoint(x, y, this.gridSize, this.zoom)
  }

  private clearPreview() {
    this.preview.forEach((o) => this.canvas.remove(o))
    this.preview = []
  }

  // ── Mouse Down ─────────────────────────────────────
  onMouseDown(x: number, y: number): void {
    const pt = this.snap(x, y)

    if (this.step === 0) {
      this.pt1  = pt
      this.step = 1
      // Start dot
      const dot = new fabric.Circle({
        left: pt.x - 4, top: pt.y - 4, radius: 4,
        fill: '#00B4D8', stroke: '#0D0F12', strokeWidth: 1,
        selectable: false, evented: false,
      }) as any
      dot.__temp = true
      this.canvas.add(dot)
      this.canvas.renderAll()

    } else if (this.step === 1) {
      this.pt2  = pt
      this.step = 2
      this.commitDimension(pt)
    }
  }

  // ── Mouse Move — live preview ──────────────────────
  onMouseMove(x: number, y: number): void {
    if (!this.pt1 || this.step === 0) return
    const pt = this.snap(x, y)
    this.clearPreview()

    if (this.type === 'linear') {
      this.previewLinear(this.pt1, pt)
    } else if (this.type === 'aligned') {
      this.previewAligned(this.pt1, pt)
    } else {
      this.previewAngular(this.pt1, pt)
    }
    this.canvas.renderAll()
  }

  // ── Preview linear (horizontal or vertical) ────────
  private previewLinear(
    p1: { x: number; y: number },
    p2: { x: number; y: number }
  ) {
    const isH = Math.abs(p2.x - p1.x) >= Math.abs(p2.y - p1.y)
    const OFF  = this.OFFSET

    let x1: number, y1: number, x2: number, y2: number, labelVal: string

    if (isH) {
      const oy = Math.min(p1.y, p2.y) - OFF
      x1 = p1.x; y1 = oy; x2 = p2.x; y2 = oy
      labelVal = formatMm(Math.abs(p2.x - p1.x) / this.zoom)
    } else {
      const ox = Math.min(p1.x, p2.x) - OFF
      x1 = ox; y1 = p1.y; x2 = ox; y2 = p2.y
      labelVal = formatMm(Math.abs(p2.y - p1.y) / this.zoom)
    }

    this.preview = this.buildDimObjects(x1, y1, x2, y2, labelVal, isH)
    this.preview.forEach((o) => {
      ;(o as any).__temp = true
      this.canvas.add(o)
    })
  }

  // ── Preview aligned (actual distance) ─────────────
  private previewAligned(
    p1: { x: number; y: number },
    p2: { x: number; y: number }
  ) {
    const dx    = p2.x - p1.x
    const dy    = p2.y - p1.y
    const len   = Math.hypot(dx, dy)
    const angle = Math.atan2(dy, dx)
    const OFF   = this.OFFSET
    const nx    = -Math.sin(angle) * OFF
    const ny    =  Math.cos(angle) * OFF

    const x1 = p1.x + nx; const y1 = p1.y + ny
    const x2 = p2.x + nx; const y2 = p2.y + ny
    const labelVal = formatMm(len / this.zoom)

    this.preview = this.buildDimObjects(x1, y1, x2, y2, labelVal, false, angle * 180 / Math.PI)
    this.preview.forEach((o) => {
      ;(o as any).__temp = true
      this.canvas.add(o)
    })
  }

  // ── Preview angular ────────────────────────────────
  private previewAngular(
    p1: { x: number; y: number },
    p2: { x: number; y: number }
  ) {
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI)
    const label = new fabric.Text(`${Math.abs(angle).toFixed(1)}°`, {
      left:      (p1.x + p2.x) / 2,
      top:       (p1.y + p2.y) / 2 - 16,
      fontSize:  11,
      fill:      '#00B4D8',
      fontFamily: 'JetBrains Mono',
      originX:   'center',
      selectable: false, evented: false,
    }) as any
    label.__temp = true
    this.canvas.add(label)
    this.preview = [label]
  }

  // ── Build dimension objects ────────────────────────
  private buildDimObjects(
    x1: number, y1: number,
    x2: number, y2: number,
    labelVal: string,
    isHoriz:  boolean,
    textAngle = 0
  ): fabric.Object[] {
    const objects: fabric.Object[] = []
    const COLOR = '#00B4D8'

    // Main dimension line
    const dimLine = new fabric.Line([x1, y1, x2, y2], {
      stroke: COLOR, strokeWidth: 0.8,
      selectable: false, evented: false,
    })
    objects.push(dimLine)

    // Arrow heads
    objects.push(...makeArrow(x1, y1, x2, y2, true,  COLOR))
    objects.push(...makeArrow(x1, y1, x2, y2, false, COLOR))

    // Extension lines
    const p1Orig = isHoriz
      ? { x: x1, y: Math.max(y1, y2) + this.OFFSET + 5 }
      : { x: Math.max(x1, x2) + this.OFFSET + 5, y: y1 }
    const p2Orig = isHoriz
      ? { x: x2, y: Math.max(y1, y2) + this.OFFSET + 5 }
      : { x: Math.max(x1, x2) + this.OFFSET + 5, y: y2 }

    objects.push(
      new fabric.Line([x1, y1, x1, p1Orig.y], {
        stroke: COLOR, strokeWidth: 0.5, strokeDashArray: [3, 3],
        selectable: false, evented: false,
      }),
      new fabric.Line([x2, y2, x2, p2Orig.y], {
        stroke: COLOR, strokeWidth: 0.5, strokeDashArray: [3, 3],
        selectable: false, evented: false,
      })
    )

    // Measurement text
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2
    const label = new fabric.Text(labelVal, {
      left:        mx,
      top:         my - 10,
      fontSize:    11,
      fill:        COLOR,
      fontFamily:  'JetBrains Mono',
      originX:     'center',
      originY:     'bottom',
      angle:       isHoriz ? 0 : (textAngle || -90),
      selectable:  false,
      evented:     false,
      backgroundColor: 'rgba(13,15,18,0.85)',
    })
    objects.push(label)

    return objects
  }

  // ── Commit dimension ───────────────────────────────
  private commitDimension(pt: { x: number; y: number }): void {
    if (!this.pt1) return
    const p1 = this.pt1
    this.clearPreview()

    // Clear temp dots
    this.canvas.getObjects()
      .filter((o: any) => o.__temp)
      .forEach((o) => this.canvas.remove(o))

    const dx = pt.x - p1.x
    const dy = pt.y - p1.y

    let x1: number, y1: number, x2: number, y2: number, labelVal: string, isHoriz = true

    if (this.type === 'linear') {
      const isH = Math.abs(dx) >= Math.abs(dy)
      const OFF = this.OFFSET
      if (isH) {
        const oy = Math.min(p1.y, pt.y) - OFF
        x1 = p1.x; y1 = oy; x2 = pt.x; y2 = oy
        labelVal = formatMm(Math.abs(dx) / this.zoom)
        isHoriz  = true
      } else {
        const ox = Math.min(p1.x, pt.x) - OFF
        x1 = ox; y1 = p1.y; x2 = ox; y2 = pt.y
        labelVal = formatMm(Math.abs(dy) / this.zoom)
        isHoriz  = false
      }
    } else {
      const len   = Math.hypot(dx, dy)
      const angle = Math.atan2(dy, dx)
      const OFF   = this.OFFSET
      const nx    = -Math.sin(angle) * OFF
      const ny    =  Math.cos(angle) * OFF
      x1 = p1.x + nx; y1 = p1.y + ny
      x2 = pt.x + nx; y2 = pt.y + ny
      labelVal = formatMm(len / this.zoom)
      isHoriz  = false
    }

    const dimObjects = this.buildDimObjects(x1, y1, x2, y2, labelVal, isHoriz)

    // Group into single selectable object
    const group = new fabric.Group(dimObjects, {
      selectable:  true,
      hasControls: false,
    }) as any
    group.__objectType = 'dimension'
    group.__layerId    = 'dimensions'

    this.canvas.add(group)
    this.canvas.setActiveObject(group)
    this.canvas.renderAll()

    // Reset
    this.step = 0
    this.pt1  = null
    this.pt2  = null
  }

  onEscape(): void {
    this.clearPreview()
    this.canvas.getObjects()
      .filter((o: any) => o.__temp)
      .forEach((o) => this.canvas.remove(o))
    this.step = 0
    this.pt1  = null
    this.pt2  = null
    this.canvas.renderAll()
  }

  dispose(): void { this.onEscape() }
}

// ─── Arrow head helper ────────────────────────────────
function makeArrow(
  x1: number, y1: number,
  x2: number, y2: number,
  atStart: boolean,
  color:   string
): fabric.Object[] {
  const dx    = x2 - x1
  const dy    = y2 - y1
  const angle = Math.atan2(dy, dx)
  const SIZE  = 6

  const tip  = atStart ? { x: x1, y: y1 } : { x: x2, y: y2 }
  const dir  = atStart ? 1 : -1
  const a1   = angle + dir * (Math.PI - Math.PI / 6)
  const a2   = angle + dir * (Math.PI + Math.PI / 6)

  return [
    new fabric.Line(
      [tip.x, tip.y, tip.x + SIZE * Math.cos(a1), tip.y + SIZE * Math.sin(a1)],
      { stroke: color, strokeWidth: 1.2, selectable: false, evented: false }
    ),
    new fabric.Line(
      [tip.x, tip.y, tip.x + SIZE * Math.cos(a2), tip.y + SIZE * Math.sin(a2)],
      { stroke: color, strokeWidth: 1.2, selectable: false, evented: false }
    ),
  ]
}
