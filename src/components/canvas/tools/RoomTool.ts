import { fabric } from 'fabric'
import { createRoom, calcPolygonArea, DEFAULT_ROOM_PROPS } from '@/lib/bimObjects'
import type { RoomProps } from '@/types'
import { snapPoint } from '@/lib/canvasUtils'

export class RoomTool {
  private canvas:    fabric.Canvas
  private gridSize:  number
  private zoom:      number
  private points:    { x: number; y: number }[] = []
  private lines:     fabric.Line[]   = []
  private dots:      fabric.Circle[] = []
  private previewLine: fabric.Line | null = null
  private areaLabel:   fabric.Text  | null = null
  private idCounter:   number
  private onFinish?:   (room: fabric.Group) => void

  constructor(
    canvas:    fabric.Canvas,
    gridSize:  number,
    zoom:      number,
    idCounter: number,
    onFinish?: (room: fabric.Group) => void
  ) {
    this.canvas    = canvas
    this.gridSize  = gridSize
    this.zoom      = zoom
    this.idCounter = idCounter
    this.onFinish  = onFinish
  }

  setZoom(z: number)    { this.zoom = z }
  setCounter(n: number) { this.idCounter = n }

  private snap(x: number, y: number) {
    return snapPoint(x, y, this.gridSize, this.zoom)
  }

  // ── Mouse Down — add point ─────────────────────────
  onMouseDown(x: number, y: number, isDouble = false): void {
    const pt = this.snap(x, y)

    if (isDouble && this.points.length >= 3) {
      this.commitRoom()
      return
    }

    // Check if clicking near first point → close
    if (this.points.length >= 3) {
      const first = this.points[0]
      const dist  = Math.hypot(pt.x - first.x, pt.y - first.y)
      if (dist < 15) {
        this.commitRoom()
        return
      }
    }

    // Add line from previous point
    if (this.points.length > 0) {
      const prev = this.points[this.points.length - 1]
      const line = new fabric.Line(
        [prev.x, prev.y, pt.x, pt.y],
        {
          stroke:      '#10B981',
          strokeWidth: 1.5,
          strokeDashArray: [6, 3],
          selectable:  false,
          evented:     false,
        }
      ) as any
      line.__temp = true
      this.canvas.add(line)
      this.lines.push(line)
    }

    // Add corner dot
    const isFirst = this.points.length === 0
    const dot = new fabric.Circle({
      left:        pt.x - (isFirst ? 6 : 4),
      top:         pt.y - (isFirst ? 6 : 4),
      radius:      isFirst ? 6 : 4,
      fill:        isFirst ? '#10B981' : 'rgba(16,185,129,0.5)',
      stroke:      '#10B981',
      strokeWidth: 1,
      selectable:  false,
      evented:     false,
    }) as any
    dot.__temp = true
    this.canvas.add(dot)
    this.dots.push(dot)

    this.points.push(pt)
    this.canvas.renderAll()
  }

  // ── Mouse Move — live preview line + area ──────────
  onMouseMove(x: number, y: number): void {
    if (this.points.length === 0) return

    const pt   = this.snap(x, y)
    const prev = this.points[this.points.length - 1]

    // Remove old preview line and area
    if (this.previewLine) {
      this.canvas.remove(this.previewLine)
      this.previewLine = null
    }
    if (this.areaLabel) {
      this.canvas.remove(this.areaLabel)
      this.areaLabel = null
    }

    // Preview line to cursor
    const line = new fabric.Line(
      [prev.x, prev.y, pt.x, pt.y],
      {
        stroke:          '#10B981',
        strokeWidth:     1,
        strokeDashArray: [4, 4],
        opacity:         0.5,
        selectable:      false,
        evented:         false,
      }
    ) as any
    line.__temp = true
    this.canvas.add(line)
    this.previewLine = line

    // Live area estimate
    if (this.points.length >= 2) {
      const tempPts = [...this.points, pt]
      const area    = calcPolygonArea(tempPts)
      const cx = tempPts.reduce((s, p) => s + p.x, 0) / tempPts.length
      const cy = tempPts.reduce((s, p) => s + p.y, 0) / tempPts.length

      const label = new fabric.Text(`${area.toFixed(2)} m²`, {
        left:       cx,
        top:        cy,
        fontSize:   11,
        fill:       '#10B981',
        fontFamily: 'JetBrains Mono',
        originX:    'center',
        originY:    'center',
        selectable: false,
        evented:    false,
        backgroundColor: 'rgba(13,15,18,0.6)',
      }) as any
      label.__temp = true
      this.canvas.add(label)
      this.areaLabel = label
    }

    // Show close hint near first point
    if (this.points.length >= 3) {
      const first = this.points[0]
      const dist  = Math.hypot(pt.x - first.x, pt.y - first.y)
      if (dist < 20) {
        // Highlight first dot
        const snap = this.dots[0]
        if (snap) snap.set({ fill: '#00B4D8', radius: 8 })
      } else {
        const snap = this.dots[0]
        if (snap) snap.set({ fill: '#10B981', radius: 6 })
      }
    }

    this.canvas.renderAll()
  }

  // ── ESC — cancel ───────────────────────────────────
  onEscape(): void {
    this.clearAll()
    this.points = []
  }

  // ── Commit Room ────────────────────────────────────
  private commitRoom(): void {
    const pts  = this.points
    const area = calcPolygonArea(pts)

    this.idCounter++
    const id = `R-${String(this.idCounter).padStart(2, '0')}`

    const props: RoomProps = {
      ...DEFAULT_ROOM_PROPS,
      id,
      number: id,
      area,
    }

    const room = createRoom(pts, props)
    if (room) {
      this.canvas.add(room)
      this.canvas.setActiveObject(room)
      this.onFinish?.(room)
    }

    this.clearAll()
    this.points = []
    this.canvas.renderAll()
  }

  private clearAll(): void {
    // Remove all temp objects
    this.canvas.getObjects()
      .filter((o: any) => o.__temp)
      .forEach((o) => this.canvas.remove(o))

    this.lines       = []
    this.dots        = []
    this.previewLine = null
    this.areaLabel   = null
    this.canvas.renderAll()
  }

  dispose(): void { this.clearAll() }
}
