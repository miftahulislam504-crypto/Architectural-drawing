import { fabric } from 'fabric'
import { createDoor, DEFAULT_DOOR_PROPS } from '@/lib/bimObjects'
import type { DoorProps } from '@/types'
import { snapPoint } from '@/lib/canvasUtils'

export class DoorTool {
  private canvas:    fabric.Canvas
  private props:     DoorProps
  private gridSize:  number
  private zoom:      number
  private preview:   fabric.Object | null = null
  private angle:     number = 0
  private idCounter: number
  private onFinish?: (door: fabric.Group) => void

  constructor(
    canvas:    fabric.Canvas,
    gridSize:  number,
    zoom:      number,
    idCounter: number,
    props?:    Partial<Omit<DoorProps, 'id'>>,
    onFinish?: (door: fabric.Group) => void
  ) {
    this.canvas    = canvas
    this.gridSize  = gridSize
    this.zoom      = zoom
    this.idCounter = idCounter
    this.props     = {
      ...DEFAULT_DOOR_PROPS,
      ...props,
      id: `D-01`,
    }
    this.onFinish  = onFinish
  }

  setZoom(z: number)    { this.zoom = z }
  setCounter(n: number) { this.idCounter = n }

  private snap(x: number, y: number) {
    return snapPoint(x, y, this.gridSize, this.zoom)
  }

  // ── Rotate door (R key) ────────────────────────────
  rotate(): void {
    this.angle = (this.angle + 90) % 360
  }

  // ── Mouse Move — ghost preview ─────────────────────
  onMouseMove(x: number, y: number): void {
    const pt = this.snap(x, y)

    if (this.preview) {
      this.canvas.remove(this.preview)
      this.preview = null
    }

    const w = this.props.width
    const ghost = new fabric.Rect({
      left:        pt.x,
      top:         pt.y - 10,
      width:       w,
      height:      20,
      fill:        'rgba(245,158,11,0.2)',
      stroke:      '#F59E0B',
      strokeWidth: 2,
      strokeDashArray: [4, 3],
      angle:       this.angle,
      originX:     'left',
      originY:     'center',
      opacity:     0.7,
      selectable:  false,
      evented:     false,
    }) as any
    ghost.__temp = true

    // Size label
    const label = new fabric.Text(`${w}mm`, {
      left:       pt.x + w / 2,
      top:        pt.y - 28,
      fontSize:   10,
      fill:       '#F59E0B',
      fontFamily: 'JetBrains Mono',
      originX:    'center',
      selectable: false,
      evented:    false,
    }) as any
    label.__temp = true

    this.canvas.add(ghost)
    this.canvas.add(label)
    this.preview = ghost
    this.canvas.renderAll()
  }

  // ── Mouse Down — place door ────────────────────────
  onMouseDown(x: number, y: number): void {
    const pt = this.snap(x, y)
    this.clearPreview()

    this.idCounter++
    const id: string = `D-${String(this.idCounter).padStart(2, '0')}`

    const door = createDoor(pt.x, pt.y, { ...this.props, id }, this.angle)
    this.canvas.add(door)
    this.canvas.setActiveObject(door)
    this.canvas.renderAll()
    this.onFinish?.(door)
  }

  onEscape(): void {
    this.clearPreview()
  }

  private clearPreview(): void {
    const temps = this.canvas.getObjects().filter((o: any) => o.__temp)
    temps.forEach((o) => this.canvas.remove(o))
    this.preview = null
    this.canvas.renderAll()
  }

  dispose(): void {
    this.clearPreview()
  }
}
