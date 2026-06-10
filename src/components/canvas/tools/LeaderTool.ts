import { fabric } from 'fabric'
import { snapPoint } from '@/lib/canvasUtils'
import { createLeader } from '@/lib/annotationEngine'

export class LeaderTool {
  private canvas:   fabric.Canvas
  private gridSize: number
  private zoom:     number
  private step:     number = 0
  private fromPt:   { x: number; y: number } | null = null
  private preview:  fabric.Object[] = []
  private style:    'arrow' | 'dot' = 'arrow'

  constructor(canvas: fabric.Canvas, gridSize: number, zoom: number) {
    this.canvas   = canvas
    this.gridSize = gridSize
    this.zoom     = zoom
  }

  setZoom(z: number)           { this.zoom  = z }
  setStyle(s: 'arrow' | 'dot') { this.style = s }

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

  onMouseDown(x: number, y: number): void {
    const pt = this.snap(x, y)

    if (this.step === 0) {
      this.fromPt = pt
      this.step   = 1

      // Start dot
      const dot = new fabric.Circle({
        left: pt.x - 4, top: pt.y - 4, radius: 4,
        fill: '#00B4D8', stroke: '#0D0F12', strokeWidth: 1,
        selectable: false, evented: false,
      }) as any
      dot.__temp = true
      this.canvas.add(dot)
      this.canvas.renderAll()

    } else if (this.step === 1 && this.fromPt) {
      this.clearPreview()
      this.clearTemps()

      const leader = createLeader(
        this.fromPt.x, this.fromPt.y,
        pt.x,          pt.y,
        'Note text',
        this.style
      )
      this.canvas.add(leader)
      this.canvas.setActiveObject(leader)
      this.canvas.renderAll()

      this.step   = 0
      this.fromPt = null
    }
  }

  onMouseMove(x: number, y: number): void {
    if (!this.fromPt || this.step === 0) return
    const pt = this.snap(x, y)
    this.clearPreview()

    // Preview line
    const line = new fabric.Line(
      [this.fromPt.x, this.fromPt.y, pt.x, pt.y],
      {
        stroke: '#00B4D8', strokeWidth: 0.8,
        strokeDashArray: [4, 4], opacity: 0.6,
        selectable: false, evented: false,
      }
    ) as any
    line.__temp = true
    this.canvas.add(line)
    this.preview = [line]
    this.canvas.renderAll()
  }

  onEscape(): void {
    this.clearPreview()
    this.clearTemps()
    this.step   = 0
    this.fromPt = null
    this.canvas.renderAll()
  }

  dispose(): void { this.onEscape() }
}
