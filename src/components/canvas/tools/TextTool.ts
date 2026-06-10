import { fabric } from 'fabric'
import { snapPoint } from '@/lib/canvasUtils'

export type TextStyle = 'title' | 'body' | 'note' | 'label' | 'dimension'

const STYLE_MAP: Record<TextStyle, {
  fontSize:   number
  fill:       string
  fontWeight: string
  fontFamily: string
}> = {
  title:     { fontSize: 20, fill: '#E8EAF0', fontWeight: '700', fontFamily: 'Rajdhani' },
  body:      { fontSize: 13, fill: '#E8EAF0', fontWeight: '400', fontFamily: 'DM Sans'  },
  note:      { fontSize: 11, fill: '#9CA3AF', fontWeight: '400', fontFamily: 'DM Sans'  },
  label:     { fontSize: 12, fill: '#00B4D8', fontWeight: '600', fontFamily: 'Rajdhani' },
  dimension: { fontSize: 10, fill: '#00B4D8', fontWeight: '400', fontFamily: 'JetBrains Mono' },
}

export class TextTool {
  private canvas:    fabric.Canvas
  private gridSize:  number
  private zoom:      number
  private style:     TextStyle = 'body'
  private defaultText: string = 'Text'

  constructor(
    canvas:   fabric.Canvas,
    gridSize: number,
    zoom:     number,
    style?:   TextStyle
  ) {
    this.canvas   = canvas
    this.gridSize = gridSize
    this.zoom     = zoom
    if (style) this.style = style
  }

  setZoom(z: number)      { this.zoom    = z }
  setStyle(s: TextStyle)  { this.style   = s }
  setDefault(t: string)   { this.defaultText = t }

  private snap(x: number, y: number) {
    return snapPoint(x, y, this.gridSize, this.zoom)
  }

  // ── Mouse Down — place IText ───────────────────────
  onMouseDown(x: number, y: number): void {
    const pt    = this.snap(x, y)
    const style = STYLE_MAP[this.style]

    // IText = inline editable text in Fabric.js
    const itext = new fabric.IText(this.defaultText, {
      left:       pt.x,
      top:        pt.y,
      fontSize:   style.fontSize,
      fill:       style.fill,
      fontWeight: style.fontWeight,
      fontFamily: style.fontFamily,
      selectable: true,
      hasControls: true,
      editable:   true,
    }) as any

    itext.__objectType = 'text'
    itext.__layerId    = 'text'
    itext.__textStyle  = this.style

    this.canvas.add(itext)
    this.canvas.setActiveObject(itext)

    // Auto-enter edit mode
    itext.enterEditing()
    itext.selectAll()

    this.canvas.renderAll()
  }

  onEscape(): void {
    // Exit any active text editing
    const active = this.canvas.getActiveObject()
    if (active && active.type === 'i-text') {
      ;(active as fabric.IText).exitEditing()
    }
  }

  dispose(): void { this.onEscape() }
}
