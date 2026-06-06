import { fabric } from 'fabric'
import { createColumn, DEFAULT_COLUMN_PROPS } from '@/lib/bimObjects'
import type { ColumnProps } from '@/types'
import { snapPoint } from '@/lib/canvasUtils'

export class ColumnTool {
  private canvas:    fabric.Canvas
  private props:     Omit<ColumnProps, 'id' | 'gridRef'>
  private gridSize:  number
  private zoom:      number
  private preview:   fabric.Object | null = null
  private idCounter: number
  private onFinish?: (col: fabric.Group) => void

  constructor(
    canvas:     fabric.Canvas,
    gridSize:   number,
    zoom:       number,
    idCounter:  number,
    props?:     Partial<Omit<ColumnProps, 'id' | 'gridRef'>>,
    onFinish?:  (col: fabric.Group) => void
  ) {
    this.canvas    = canvas
    this.gridSize  = gridSize
    this.zoom      = zoom
    this.idCounter = idCounter
    this.props     = { ...DEFAULT_COLUMN_PROPS, ...props }
    this.onFinish  = onFinish
  }

  setZoom(z: number)    { this.zoom = z }
  setCounter(n: number) { this.idCounter = n }
  setProps(p: Partial<Omit<ColumnProps, 'id' | 'gridRef'>>) {
    this.props = { ...this.props, ...p }
  }

  private snap(x: number, y: number) {
    return snapPoint(x, y, this.gridSize, this.zoom)
  }

  // ── Mouse Move — ghost preview ─────────────────────
  onMouseMove(x: number, y: number): void {
    const pt = this.snap(x, y)

    // Remove old preview
    if (this.preview) {
      this.canvas.remove(this.preview)
      this.preview = null
    }

    const { shape, width, depth, diameter } = this.props
    let ghost: fabric.Object

    if (shape === 'circular') {
      const r = (diameter ?? width) / 2
      ghost = new fabric.Circle({
        left:        pt.x - r,
        top:         pt.y - r,
        radius:      r,
        fill:        'rgba(239,68,68,0.15)',
        stroke:      '#EF4444',
        strokeWidth: 2,
        opacity:     0.6,
        selectable:  false,
        evented:     false,
      })
    } else {
      ghost = new fabric.Rect({
        left:        pt.x - width / 2,
        top:         pt.y - depth / 2,
        width,
        height:      depth,
        fill:        'rgba(239,68,68,0.15)',
        stroke:      '#EF4444',
        strokeWidth: 2,
        opacity:     0.6,
        selectable:  false,
        evented:     false,
      })
    }

    ;(ghost as any).__temp = true
    this.canvas.add(ghost)
    this.preview = ghost
    this.canvas.renderAll()
  }

  // ── Mouse Down — place column ──────────────────────
  onMouseDown(x: number, y: number): void {
    const pt = this.snap(x, y)

    this.idCounter++
    const id = `C-${String(this.idCounter).padStart(2, '0')}`

    const column = createColumn(pt.x, pt.y, {
      ...this.props,
      id,
      gridRef: '',
    })

    this.canvas.add(column)
    this.canvas.setActiveObject(column)
    this.canvas.renderAll()

    this.onFinish?.(column)
  }

  // ── ESC — cancel ───────────────────────────────────
  onEscape(): void {
    if (this.preview) {
      this.canvas.remove(this.preview)
      this.preview = null
      this.canvas.renderAll()
    }
  }

  dispose(): void {
    this.onEscape()
  }
}
