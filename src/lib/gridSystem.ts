import { fabric } from 'fabric'

// ─── Types ────────────────────────────────────────────
export interface GridLine {
  id:        string
  label:     string              // "A", "B"... or "1", "2"...
  direction: 'x' | 'y'          // x = vertical line, y = horizontal line
  position:  number              // mm from origin
  locked:    boolean
  color?:    string
}

export interface GridSpacing {
  label:   string                // "Grid 1-2"
  spacing: number                // mm
}

export interface GridSystem {
  xLines:  GridLine[]            // vertical lines (numbered 1,2,3...)
  yLines:  GridLine[]            // horizontal lines (lettered A,B,C...)
  origin:  { x: number; y: number }   // canvas px origin
  scale:   number                // px per mm
}

// ─── Label generators ─────────────────────────────────
export function numLabel(i: number): string {
  return String(i + 1)
}

export function alphaLabel(i: number): string {
  // A-Z, then AA, AB...
  if (i < 26) return String.fromCharCode(65 + i)
  const first  = String.fromCharCode(65 + Math.floor(i / 26) - 1)
  const second = String.fromCharCode(65 + (i % 26))
  return first + second
}

// ─── Generate default grid ────────────────────────────
export function generateDefaultGrid(
  cols: number,
  rows: number,
  colSpacing: number,   // mm
  rowSpacing: number,   // mm
  origin: { x: number; y: number }
): GridSystem {
  const xLines: GridLine[] = []
  const yLines: GridLine[] = []

  for (let i = 0; i < cols; i++) {
    xLines.push({
      id:        `x-${i}`,
      label:     numLabel(i),
      direction: 'x',
      position:  i * colSpacing,
      locked:    false,
      color:     GRID_COLOR,
    })
  }

  for (let j = 0; j < rows; j++) {
    yLines.push({
      id:        `y-${j}`,
      label:     alphaLabel(j),
      direction: 'y',
      position:  j * rowSpacing,
      locked:    false,
      color:     GRID_COLOR,
    })
  }

  return { xLines, yLines, origin, scale: 1 }
}

// ─── Colors & Style ───────────────────────────────────
export const GRID_COLOR       = '#1E6A9A'
export const GRID_COLOR_HOVER = '#00B4D8'
export const GRID_LABEL_COLOR = '#00B4D8'
export const BUBBLE_RADIUS    = 14

// ─── Render grid on canvas ────────────────────────────
export function renderGrid(
  canvas: fabric.Canvas,
  system: GridSystem,
  options: {
    showBubbles:    boolean
    showDimensions: boolean
    locked:         boolean
  }
): fabric.Group[] {
  // Remove existing grid objects
  const existing = canvas.getObjects().filter(
    (o: any) => o.__isStructGrid
  )
  existing.forEach((o) => canvas.remove(o))

  const groups: fabric.Group[] = []
  const { origin, scale } = system
  const h = canvas.getHeight()
  const w = canvas.getWidth()

  // ── Render X lines (vertical) ──────────────────────
  for (const line of system.xLines) {
    const px = origin.x + line.position * scale

    const objects: fabric.Object[] = []

    // Main grid line
    const gridLine = new fabric.Line([px, 0, px, h], {
      stroke:      line.color ?? GRID_COLOR,
      strokeWidth: 1,
      strokeDashArray: [8, 6],
      selectable:  false,
      evented:     !options.locked,
    })
    objects.push(gridLine)

    // Bubble top
    if (options.showBubbles) {
      const bubble = makeBubble(px, BUBBLE_RADIUS + 4, line.label)
      objects.push(...bubble)

      // Bubble bottom
      const bubbleB = makeBubble(px, h - BUBBLE_RADIUS - 4, line.label)
      objects.push(...bubbleB)
    }

    // Dimension to next line
    if (options.showDimensions && system.xLines.indexOf(line) < system.xLines.length - 1) {
      const next = system.xLines[system.xLines.indexOf(line) + 1]
      const nx   = origin.x + next.position * scale
      const dim  = makeDimension(px, 36, nx, 36, `${next.position - line.position}mm`)
      objects.push(...dim)
    }

    const group = new fabric.Group(objects, {
      selectable:  !options.locked,
      evented:     !options.locked,
      hasControls: false,
    }) as any
    group.__isStructGrid = true
    group.__gridId       = line.id
    group.__gridDir      = 'x'

    canvas.add(group)
    groups.push(group)
  }

  // ── Render Y lines (horizontal) ────────────────────
  for (const line of system.yLines) {
    const py = origin.y + line.position * scale

    const objects: fabric.Object[] = []

    const gridLine = new fabric.Line([0, py, w, py], {
      stroke:      line.color ?? GRID_COLOR,
      strokeWidth: 1,
      strokeDashArray: [8, 6],
      selectable:  false,
      evented:     !options.locked,
    })
    objects.push(gridLine)

    if (options.showBubbles) {
      const bubbleL = makeBubble(BUBBLE_RADIUS + 4, py, line.label)
      objects.push(...bubbleL)
      const bubbleR = makeBubble(w - BUBBLE_RADIUS - 4, py, line.label)
      objects.push(...bubbleR)
    }

    // Dimension to next line
    if (options.showDimensions && system.yLines.indexOf(line) < system.yLines.length - 1) {
      const next = system.yLines[system.yLines.indexOf(line) + 1]
      const ny   = origin.y + next.position * scale
      const dim  = makeDimension(36, py, 36, ny, `${next.position - line.position}mm`)
      objects.push(...dim)
    }

    const group = new fabric.Group(objects, {
      selectable:  !options.locked,
      evented:     !options.locked,
      hasControls: false,
    }) as any
    group.__isStructGrid = true
    group.__gridId       = line.id
    group.__gridDir      = 'y'

    canvas.add(group)
    groups.push(group)
  }

  // Send all grid lines behind other objects
  groups.forEach((g) => canvas.sendToBack(g))
  canvas.renderAll()

  return groups
}

// ─── Bubble helper ────────────────────────────────────
function makeBubble(
  cx: number, cy: number, label: string
): fabric.Object[] {
  const circle = new fabric.Circle({
    left:        cx - BUBBLE_RADIUS,
    top:         cy - BUBBLE_RADIUS,
    radius:      BUBBLE_RADIUS,
    fill:        '#0D0F12',
    stroke:      GRID_COLOR,
    strokeWidth: 1.5,
    selectable:  false,
    evented:     false,
  })

  const text = new fabric.Text(label, {
    left:       cx,
    top:        cy,
    fontSize:   11,
    fill:       GRID_LABEL_COLOR,
    fontFamily: 'Rajdhani',
    fontWeight: '600',
    originX:    'center',
    originY:    'center',
    selectable: false,
    evented:    false,
  })

  return [circle, text]
}

// ─── Dimension line helper ────────────────────────────
function makeDimension(
  x1: number, y1: number,
  x2: number, y2: number,
  label: string
): fabric.Object[] {
  const line = new fabric.Line([x1, y1, x2, y2], {
    stroke:      GRID_COLOR,
    strokeWidth: 0.5,
    selectable:  false,
    evented:     false,
  })

  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2

  const text = new fabric.Text(label, {
    left:       mx,
    top:        my - 10,
    fontSize:   9,
    fill:       GRID_LABEL_COLOR,
    fontFamily: 'JetBrains Mono',
    originX:    'center',
    selectable: false,
    evented:    false,
    backgroundColor: 'rgba(13,15,18,0.8)',
  })

  // Tick marks
  const isHoriz = y1 === y2
  const tick1 = new fabric.Line(
    isHoriz
      ? [x1, y1 - 6, x1, y1 + 6]
      : [x1 - 6, y1, x1 + 6, y1],
    { stroke: GRID_COLOR, strokeWidth: 0.8, selectable: false, evented: false }
  )
  const tick2 = new fabric.Line(
    isHoriz
      ? [x2, y2 - 6, x2, y2 + 6]
      : [x2 - 6, y2, x2 + 6, y2],
    { stroke: GRID_COLOR, strokeWidth: 0.8, selectable: false, evented: false }
  )

  return [line, tick1, tick2, text]
}

// ─── Find nearest grid intersection ──────────────────
export function snapToGridIntersection(
  system: GridSystem,
  x: number,
  y: number,
  threshold: number = 20
): { x: number; y: number; ref: string } | null {
  const { origin, scale, xLines, yLines } = system

  let best: { x: number; y: number; ref: string; dist: number } | null = null

  for (const xl of xLines) {
    const px = origin.x + xl.position * scale
    for (const yl of yLines) {
      const py = origin.y + yl.position * scale
      const dist = Math.hypot(x - px, y - py)
      if (dist < threshold && (!best || dist < best.dist)) {
        best = {
          x:    px,
          y:    py,
          ref:  `${xl.label}-${yl.label}`,
          dist,
        }
      }
    }
  }

  return best ? { x: best.x, y: best.y, ref: best.ref } : null
}

// ─── Get grid spacings summary ────────────────────────
export function getGridSpacings(system: GridSystem): {
  xSpacings: GridSpacing[]
  ySpacings: GridSpacing[]
} {
  const xSpacings: GridSpacing[] = []
  const ySpacings: GridSpacing[] = []

  for (let i = 0; i < system.xLines.length - 1; i++) {
    const a = system.xLines[i]
    const b = system.xLines[i + 1]
    xSpacings.push({
      label:   `${a.label}-${b.label}`,
      spacing: b.position - a.position,
    })
  }

  for (let j = 0; j < system.yLines.length - 1; j++) {
    const a = system.yLines[j]
    const b = system.yLines[j + 1]
    ySpacings.push({
      label:   `${a.label}-${b.label}`,
      spacing: b.position - a.position,
    })
  }

  return { xSpacings, ySpacings }
}

// ─── Export for Structural App ────────────────────────
export interface StructuralGridExport {
  version:     string
  projectId:   string
  exportedAt:  string
  grid: {
    origin:    { x: number; y: number }
    xLines: Array<{
      label:    string
      position: number          // mm
      id:       string
    }>
    yLines: Array<{
      label:    string
      position: number          // mm
      id:       string
    }>
    intersections: Array<{
      ref:   string             // "1-A", "2-B"...
      x_mm:  number
      y_mm:  number
    }>
    xSpacings: GridSpacing[]
    ySpacings: GridSpacing[]
  }
  columnLocations: Array<{
    gridRef:  string
    x_mm:     number
    y_mm:     number
  }>
}

export function exportForStructural(
  system:    GridSystem,
  projectId: string,
  columnGridRefs?: string[]
): StructuralGridExport {
  const spacings = getGridSpacings(system)

  // Generate all intersections
  const intersections = system.xLines.flatMap((xl) =>
    system.yLines.map((yl) => ({
      ref:  `${xl.label}-${yl.label}`,
      x_mm: xl.position,
      y_mm: yl.position,
    }))
  )

  // Column locations from grid refs
  const columnLocations = (columnGridRefs ?? []).map((ref) => {
    const [xLabel, yLabel] = ref.split('-')
    const xl = system.xLines.find((l) => l.label === xLabel)
    const yl = system.yLines.find((l) => l.label === yLabel)
    return {
      gridRef: ref,
      x_mm:    xl?.position ?? 0,
      y_mm:    yl?.position ?? 0,
    }
  })

  return {
    version:    '1.0',
    projectId,
    exportedAt: new Date().toISOString(),
    grid: {
      origin:    system.origin,
      xLines:    system.xLines.map(({ label, position, id }) => ({ label, position, id })),
      yLines:    system.yLines.map(({ label, position, id }) => ({ label, position, id })),
      intersections,
      xSpacings: spacings.xSpacings,
      ySpacings: spacings.ySpacings,
    },
    columnLocations,
  }
}

// ─── Save export to Firestore path ───────────────────
// Called from DrawingPage after export
export function buildStructuralExportPath(projectId: string) {
  return `projects/${projectId}/structuralGrid/data`
}
