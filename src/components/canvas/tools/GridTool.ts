import { fabric } from 'fabric'
import { snapPoint, formatMm } from '@/lib/canvasUtils'
import { GRID_COLOR } from '@/lib/gridSystem'

export type GridDirection = 'x' | 'y' | 'auto'

export class GridTool {
  private canvas:     fabric.Canvas
  private gridSize:   number
  private zoom:       number
  private direction:  GridDirection
  private preview:    fabric.Object | null = null
  private label:      fabric.Object | null = null
  private onPlace?:   (position: number, direction: 'x' | 'y') => void
  private origin:     { x: number; y: number }

  constructor(
    canvas:    fabric.Canvas,
    gridSize:  number,
    zoom:      number,
    origin:    { x: number; y: number },
    direction: GridDirection = 'auto',
    onPlace?:  (position: number, direction: 'x' | 'y') => void
  ) {
    this.canvas    = canvas
    this.gridSize  = gridSize
    this.zoom      = zoom
    this.origin    = origin
    this.direction = direction
    this.onPlace   = onPlace
  }

  setZoom(z: number)   { this.zoom = z }
  setDirection(d: GridDirection) { this.direction = d }

  private snap(x: number, y: number) {
    return snapPoint(x, y, this.gridSize, this.zoom)
  }

  private resolveDirection(x: number, y: number): 'x' | 'y' {
    if (this.direction !== 'auto') return this.direction
    // Auto: detect from cursor position relative to canvas center
    const cx = this.canvas.getWidth()  / 2
    const cy = this.canvas.getHeight() / 2
    return Math.abs(x - cx) > Math.abs(y - cy) ? 'x' : 'y'
  }

  // ── Mouse Move — preview line ─────────────────────
  onMouseMove(x: number, y: number): void {
    this.clearPreview()
    const pt  = this.snap(x, y)
    const dir = this.resolveDirection(x, y)
    const w   = this.canvas.getWidth()
    const h   = this.canvas.getHeight()

    // Preview grid line
    let line: fabric.Line
    let positionMm: number

    if (dir === 'x') {
      // Vertical line
      line = new fabric.Line([pt.x, 0, pt.x, h], {
        stroke:          GRID_COLOR,
        strokeWidth:     1.5,
        strokeDashArray: [8, 5],
        opacity:         0.7,
        selectable:      false,
        evented:         false,
      })
      positionMm = (pt.x - this.origin.x) / this.zoom
    } else {
      // Horizontal line
      line = new fabric.Line([0, pt.y, w, pt.y], {
        stroke:          GRID_COLOR,
        strokeWidth:     1.5,
        strokeDashArray: [8, 5],
        opacity:         0.7,
        selectable:      false,
        evented:         false,
      })
      positionMm = (pt.y - this.origin.y) / this.zoom
    }

    ;(line as any).__temp = true
    this.canvas.add(line)
    this.preview = line

    // Position label
    const labelText = dir === 'x'
      ? `X: ${formatMm(positionMm)}`
      : `Y: ${formatMm(positionMm)}`

    const lbl = new fabric.Text(labelText, {
      left:       dir === 'x' ? pt.x + 6 : 6,
      top:        dir === 'x' ? 6 : pt.y - 20,
      fontSize:   10,
      fill:       '#00B4D8',
      fontFamily: 'JetBrains Mono',
      selectable: false,
      evented:    false,
      backgroundColor: 'rgba(13,15,18,0.85)',
    }) as any
    lbl.__temp = true
    this.canvas.add(lbl)
    this.label = lbl

    // Direction hint
    const hint = new fabric.Text(
      dir === 'x' ? '← Vertical Grid Line →' : '↑ Horizontal Grid Line ↓',
      {
        left:       this.canvas.getWidth() / 2,
        top:        this.canvas.getHeight() - 40,
        fontSize:   10,
        fill:       'rgba(0,180,216,0.6)',
        fontFamily: 'DM Sans',
        originX:    'center',
        selectable: false,
        evented:    false,
        backgroundColor: 'rgba(13,15,18,0.7)',
      }
    ) as any
    hint.__temp = true
    this.canvas.add(hint)

    this.canvas.renderAll()
  }

  // ── Mouse Down — place grid line ──────────────────
  onMouseDown(x: number, y: number): void {
    const pt  = this.snap(x, y)
    const dir = this.resolveDirection(x, y)

    let positionMm: number
    if (dir === 'x') {
      positionMm = (pt.x - this.origin.x) / this.zoom
    } else {
      positionMm = (pt.y - this.origin.y) / this.zoom
    }

    this.clearPreview()
    this.onPlace?.(positionMm, dir)
    this.canvas.renderAll()
  }

  onEscape(): void {
    this.clearPreview()
  }

  private clearPreview(): void {
    this.canvas.getObjects()
      .filter((o: any) => o.__temp)
      .forEach((o) => this.canvas.remove(o))
    this.preview = null
    this.label   = null
    this.canvas.renderAll()
  }

  dispose(): void {
    this.clearPreview()
  }
}
