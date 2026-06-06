import { fabric } from 'fabric'
import { createWindow, DEFAULT_WINDOW_PROPS } from '@/lib/bimObjects'
import type { WindowProps } from '@/types'
import { snapPoint } from '@/lib/canvasUtils'

export class WindowTool {
  private canvas:    fabric.Canvas
  private props:     WindowProps
  private gridSize:  number
  private zoom:      number
  private angle:     number = 0
  private idCounter: number
  private onFinish?: (win: fabric.Group) => void

  constructor(
    canvas:    fabric.Canvas,
    gridSize:  number,
    zoom:      number,
    idCounter: number,
    props?:    Partial<Omit<WindowProps, 'id'>>,
    onFinish?: (win: fabric.Group) => void
  ) {
    this.canvas    = canvas
    this.gridSize  = gridSize
    this.zoom      = zoom
    this.idCounter = idCounter
    this.props     = { ...DEFAULT_WINDOW_PROPS, ...props, id: 'W-01' }
    this.onFinish  = onFinish
  }

  setZoom(z: number)    { this.zoom = z }
  setCounter(n: number) { this.idCounter = n }

  rotate(): void {
    this.angle = (this.angle + 90) % 360
  }

  private snap(x: number, y: number) {
    return snapPoint(x, y, this.gridSize, this.zoom)
  }

  // ── Mouse Move — ghost ─────────────────────────────
  onMouseMove(x: number, y: number): void {
    const pt = this.snap(x, y)
    this.clearTemps()

    const w = this.props.width

    const ghost = new fabric.Rect({
      left:        pt.x,
      top:         pt.y - 10,
      width:       w,
      height:      20,
      fill:        'rgba(0,180,216,0.15)',
      stroke:      '#00B4D8',
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

    // Inner glass lines preview
    const glass = new fabric.Line([pt.x + w * 0.1, pt.y, pt.x + w * 0.9, pt.y], {
      stroke:      '#00B4D8',
      strokeWidth: 1.5,
      angle:       this.angle,
      selectable:  false,
      evented:     false,
      opacity:     0.6,
    }) as any
    glass.__temp = true

    const label = new fabric.Text(`${w}mm`, {
      left:       pt.x + w / 2,
      top:        pt.y - 28,
      fontSize:   10,
      fill:       '#00B4D8',
      fontFamily: 'JetBrains Mono',
      originX:    'center',
      selectable: false,
      evented:    false,
    }) as any
    label.__temp = true

    this.canvas.add(ghost)
    this.canvas.add(glass)
    this.canvas.add(label)
    this.canvas.renderAll()
  }

  // ── Mouse Down — place window ──────────────────────
  onMouseDown(x: number, y: number): void {
    const pt = this.snap(x, y)
    this.clearTemps()

    this.idCounter++
    const id = `W-${String(this.idCounter).padStart(2, '0')}`

    const win = createWindow(pt.x, pt.y, { ...this.props, id }, this.angle)
    this.canvas.add(win)
    this.canvas.setActiveObject(win)
    this.canvas.renderAll()
    this.onFinish?.(win)
  }

  onEscape(): void { this.clearTemps() }

  private clearTemps(): void {
    this.canvas.getObjects()
      .filter((o: any) => o.__temp)
      .forEach((o) => this.canvas.remove(o))
    this.canvas.renderAll()
  }

  dispose(): void { this.clearTemps() }
}
