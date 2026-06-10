import { fabric } from 'fabric'
import { snapPoint } from '@/lib/canvasUtils'

export type SymbolType =
  | 'north_arrow'
  | 'level_marker'
  | 'section_marker'
  | 'elevation_marker'
  | 'grid_bubble'
  | 'cloud'

export class SymbolTool {
  private canvas:   fabric.Canvas
  private gridSize: number
  private zoom:     number
  private symType:  SymbolType = 'north_arrow'
  private preview:  fabric.Object | null = null

  constructor(canvas: fabric.Canvas, gridSize: number, zoom: number, type?: SymbolType) {
    this.canvas   = canvas
    this.gridSize = gridSize
    this.zoom     = zoom
    if (type) this.symType = type
  }

  setZoom(z: number)       { this.zoom    = z }
  setType(t: SymbolType)   { this.symType = t }

  private snap(x: number, y: number) {
    return snapPoint(x, y, this.gridSize, this.zoom)
  }

  onMouseMove(x: number, y: number): void {
    const pt = this.snap(x, y)
    if (this.preview) {
      this.canvas.remove(this.preview)
      this.preview = null
    }
    const ghost = this.buildSymbol(pt.x, pt.y, 0.5)
    if (ghost) {
      ;(ghost as any).__temp = true
      this.canvas.add(ghost)
      this.preview = ghost
      this.canvas.renderAll()
    }
  }

  onMouseDown(x: number, y: number): void {
    const pt = this.snap(x, y)
    this.clearPreview()
    const sym = this.buildSymbol(pt.x, pt.y, 1)
    if (sym) {
      ;(sym as any).__objectType = this.symType
      ;(sym as any).__layerId    = 'text'
      this.canvas.add(sym)
      this.canvas.setActiveObject(sym)
      this.canvas.renderAll()
    }
  }

  private buildSymbol(x: number, y: number, opacity: number): fabric.Group | null {
    switch (this.symType) {
      case 'north_arrow':      return buildNorthArrow(x, y, opacity)
      case 'level_marker':     return buildLevelMarker(x, y, opacity)
      case 'section_marker':   return buildSectionMarker(x, y, opacity)
      case 'elevation_marker': return buildElevationMarker(x, y, opacity)
      case 'grid_bubble':      return buildGridBubble(x, y, opacity)
      case 'cloud':            return buildRevisionCloud(x, y, opacity)
      default: return null
    }
  }

  onEscape(): void { this.clearPreview() }

  private clearPreview(): void {
    this.canvas.getObjects()
      .filter((o: any) => o.__temp)
      .forEach((o) => this.canvas.remove(o))
    this.preview = null
    this.canvas.renderAll()
  }

  dispose(): void { this.clearPreview() }
}

// ─── North Arrow ──────────────────────────────────────
function buildNorthArrow(cx: number, cy: number, opacity: number): fabric.Group {
  const SIZE = 40
  const COLOR = '#E8EAF0'

  const circle = new fabric.Circle({
    left: cx - SIZE, top: cy - SIZE,
    radius: SIZE,
    fill: 'transparent', stroke: COLOR, strokeWidth: 1.5,
    selectable: false, evented: false,
  })

  // Arrow shaft
  const shaft = new fabric.Line([cx, cy + SIZE * 0.7, cx, cy - SIZE * 0.7], {
    stroke: COLOR, strokeWidth: 2,
    selectable: false, evented: false,
  })

  // Arrow head (filled left half = N direction)
  const headPath = new fabric.Path(
    `M ${cx} ${cy - SIZE * 0.7} L ${cx - 8} ${cy - SIZE * 0.2} L ${cx} ${cy} Z`,
    { fill: COLOR, stroke: 'none', selectable: false, evented: false }
  )
  const headRight = new fabric.Path(
    `M ${cx} ${cy - SIZE * 0.7} L ${cx + 8} ${cy - SIZE * 0.2} L ${cx} ${cy} Z`,
    { fill: 'transparent', stroke: COLOR, strokeWidth: 1.5, selectable: false, evented: false }
  )

  // N label
  const nLabel = new fabric.Text('N', {
    left: cx, top: cy - SIZE - 18,
    fontSize: 14, fill: COLOR,
    fontFamily: 'Rajdhani', fontWeight: '700',
    originX: 'center', selectable: false, evented: false,
  })

  const group = new fabric.Group([circle, shaft, headPath, headRight, nLabel], {
    left: cx, top: cy, originX: 'center', originY: 'center',
    selectable: true, hasControls: true, opacity,
  })
  return group
}

// ─── Level Marker ─────────────────────────────────────
function buildLevelMarker(x: number, y: number, opacity: number): fabric.Group {
  const COLOR = '#00B4D8'
  const SIZE  = 12

  // Diamond shape
  const diamond = new fabric.Path(
    `M ${x} ${y - SIZE} L ${x + SIZE} ${y} L ${x} ${y + SIZE} L ${x - SIZE} ${y} Z`,
    { fill: 'rgba(0,180,216,0.2)', stroke: COLOR, strokeWidth: 1.5,
      selectable: false, evented: false }
  )

  // Horizontal line extending right
  const line = new fabric.Line([x, y, x + 80, y], {
    stroke: COLOR, strokeWidth: 1,
    selectable: false, evented: false,
  })

  // Level text
  const label = new fabric.IText('±0.000', {
    left: x + 88, top: y - 9,
    fontSize: 11, fill: COLOR,
    fontFamily: 'JetBrains Mono',
    selectable: false, evented: false, editable: true,
  })

  const group = new fabric.Group([diamond, line, label], {
    selectable: true, hasControls: false, opacity,
  })
  return group
}

// ─── Section Marker ───────────────────────────────────
function buildSectionMarker(x: number, y: number, opacity: number): fabric.Group {
  const COLOR  = '#E8EAF0'
  const ACCENT = '#EF4444'

  // Circle with section label
  const circ = new fabric.Circle({
    left: x - 16, top: y - 16, radius: 16,
    fill: '#0D0F12', stroke: COLOR, strokeWidth: 1.5,
    selectable: false, evented: false,
  })

  const label = new fabric.IText('A', {
    left: x, top: y,
    fontSize: 14, fill: ACCENT,
    fontFamily: 'Rajdhani', fontWeight: '700',
    originX: 'center', originY: 'center',
    selectable: false, evented: false, editable: true,
  })

  // Cutting arrow
  const arrow = new fabric.Path(
    `M ${x} ${y + 16} L ${x} ${y + 36} L ${x - 5} ${y + 28} M ${x} ${y + 36} L ${x + 5} ${y + 28}`,
    { stroke: ACCENT, strokeWidth: 2, fill: 'transparent',
      selectable: false, evented: false }
  )

  const group = new fabric.Group([circ, label, arrow], {
    selectable: true, hasControls: false, opacity,
  })
  return group
}

// ─── Elevation Marker ─────────────────────────────────
function buildElevationMarker(x: number, y: number, opacity: number): fabric.Group {
  const COLOR = '#F59E0B'

  const flag = new fabric.Path(
    `M ${x} ${y} L ${x + 24} ${y - 10} L ${x + 24} ${y + 10} Z`,
    { fill: 'rgba(245,158,11,0.2)', stroke: COLOR, strokeWidth: 1.5,
      selectable: false, evented: false }
  )

  const pole = new fabric.Line([x, y - 32, x, y + 32], {
    stroke: COLOR, strokeWidth: 1.5,
    selectable: false, evented: false,
  })

  const label = new fabric.IText('EL +0.000', {
    left: x + 30, top: y - 8,
    fontSize: 10, fill: COLOR,
    fontFamily: 'JetBrains Mono',
    selectable: false, evented: false, editable: true,
  })

  const group = new fabric.Group([pole, flag, label], {
    selectable: true, hasControls: false, opacity,
  })
  return group
}

// ─── Grid Bubble ──────────────────────────────────────
function buildGridBubble(x: number, y: number, opacity: number): fabric.Group {
  const COLOR = '#1E6A9A'
  const R     = 16

  const circ = new fabric.Circle({
    left: x - R, top: y - R, radius: R,
    fill: '#0D0F12', stroke: COLOR, strokeWidth: 1.5,
    selectable: false, evented: false,
  })

  const label = new fabric.IText('A', {
    left: x, top: y,
    fontSize: 14, fill: '#00B4D8',
    fontFamily: 'Rajdhani', fontWeight: '700',
    originX: 'center', originY: 'center',
    selectable: false, evented: false, editable: true,
  })

  const group = new fabric.Group([circ, label], {
    selectable: true, hasControls: false, opacity,
  })
  return group
}

// ─── Revision Cloud ───────────────────────────────────
function buildRevisionCloud(x: number, y: number, opacity: number): fabric.Group {
  const W = 120; const H = 60
  const COLOR = '#F59E0B'

  // Build cloud path with bumps
  const bumps = 6
  const bumpW = W / bumps
  let path = `M ${x} ${y + H / 2} `

  for (let i = 0; i < bumps; i++) {
    const bx = x + i * bumpW + bumpW / 2
    path += `A ${bumpW / 2} ${bumpW / 2} 0 0 1 ${x + (i + 1) * bumpW} ${y + H / 2} `
  }
  for (let i = 0; i < 3; i++) {
    const by = y + H - (i * H / 3) - H / 6
    path += `A ${H / 6} ${H / 6} 0 0 1 ${x + W} ${by} `
  }
  path += `L ${x} ${y + H / 2} Z`

  const cloud = new fabric.Path(path, {
    fill: 'rgba(245,158,11,0.08)', stroke: COLOR, strokeWidth: 1.2,
    strokeDashArray: [3, 2],
    selectable: false, evented: false,
  })

  const label = new fabric.IText('REV', {
    left: x + W / 2, top: y + H / 2,
    fontSize: 11, fill: COLOR,
    fontFamily: 'Rajdhani', fontWeight: '600',
    originX: 'center', originY: 'center',
    selectable: false, evented: false, editable: true,
  })

  const group = new fabric.Group([cloud, label], {
    selectable: true, hasControls: true, opacity,
  })
  return group
}
