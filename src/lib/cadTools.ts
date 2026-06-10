import { fabric } from 'fabric'

// ─── OFFSET ───────────────────────────────────────────
export function offsetLine(
  line:   fabric.Line,
  dist:   number,           // mm (positive = right/down, negative = left/up)
  canvas: fabric.Canvas
): fabric.Line {
  const x1 = line.x1! + (line.left ?? 0)
  const y1 = line.y1! + (line.top  ?? 0)
  const x2 = line.x2! + (line.left ?? 0)
  const y2 = line.y2! + (line.top  ?? 0)

  const dx  = x2 - x1
  const dy  = y2 - y1
  const len = Math.hypot(dx, dy)
  if (len === 0) return line

  // Perpendicular unit vector
  const nx = -dy / len
  const ny =  dx / len

  const offsetted = new fabric.Line(
    [
      x1 + nx * dist,
      y1 + ny * dist,
      x2 + nx * dist,
      y2 + ny * dist,
    ],
    {
      stroke:      (line as any).stroke ?? '#E8EAF0',
      strokeWidth: line.strokeWidth ?? 1,
      selectable:  true,
    }
  ) as any

  offsetted.__layerId    = (line as any).__layerId
  offsetted.__objectType = 'line'

  canvas.add(offsetted)
  canvas.renderAll()
  return offsetted
}

// ─── MIRROR ───────────────────────────────────────────
export type MirrorAxis = 'horizontal' | 'vertical' | 'diagonal'

export function mirrorObject(
  obj:    fabric.Object,
  axis:   MirrorAxis,
  canvas: fabric.Canvas,
  copy:   boolean = true
): fabric.Object {
  const clone = fabric.util.object.clone(obj) as fabric.Object

  const cx = obj.left! + (obj.width!  * (obj.scaleX ?? 1)) / 2
  const cy = obj.top!  + (obj.height! * (obj.scaleY ?? 1)) / 2

  if (axis === 'horizontal') {
    clone.set({
      top:     cy * 2 - obj.top! - obj.height! * (obj.scaleY ?? 1),
      flipY:   !obj.flipY,
    })
  } else if (axis === 'vertical') {
    clone.set({
      left:    cx * 2 - obj.left! - obj.width! * (obj.scaleX ?? 1),
      flipX:   !obj.flipX,
    })
  } else {
    clone.set({ flipX: !obj.flipX, flipY: !obj.flipY })
  }

  clone.setCoords()

  if (!copy) canvas.remove(obj)
  canvas.add(clone)
  canvas.setActiveObject(clone)
  canvas.renderAll()

  return clone
}

// ─── COPY & MOVE ──────────────────────────────────────
export function copyObject(
  obj:    fabric.Object,
  dx:     number,
  dy:     number,
  canvas: fabric.Canvas
): fabric.Object {
  const clone = fabric.util.object.clone(obj) as fabric.Object
  clone.set({
    left: (obj.left ?? 0) + dx,
    top:  (obj.top  ?? 0) + dy,
  })
  clone.setCoords()

  // Copy BIM metadata
  const src = obj as any
  const dst = clone as any
  if (src.__isBIM) {
    dst.__isBIM      = true
    dst.__layerId    = src.__layerId
    dst.__objectType = src.__objectType
    dst.__props      = { ...src.__props }
    dst.__id         = `${src.__id}-copy`
  }

  canvas.add(clone)
  canvas.setActiveObject(clone)
  canvas.renderAll()
  return clone
}

export function moveObject(
  obj:    fabric.Object,
  dx:     number,
  dy:     number,
  canvas: fabric.Canvas
): void {
  obj.set({
    left: (obj.left ?? 0) + dx,
    top:  (obj.top  ?? 0) + dy,
  })
  obj.setCoords()
  canvas.renderAll()
}

// ─── ROTATE ───────────────────────────────────────────
export function rotateObject(
  obj:    fabric.Object,
  angle:  number,           // degrees
  canvas: fabric.Canvas,
  aroundCenter = true
): void {
  if (aroundCenter) {
    obj.rotate((obj.angle ?? 0) + angle)
  } else {
    obj.rotate(angle)
  }
  obj.setCoords()
  canvas.renderAll()
}

// ─── SCALE ────────────────────────────────────────────
export function scaleObject(
  obj:     fabric.Object,
  factorX: number,
  factorY: number,
  canvas:  fabric.Canvas
): void {
  obj.set({
    scaleX: (obj.scaleX ?? 1) * factorX,
    scaleY: (obj.scaleY ?? 1) * factorY,
  })
  obj.setCoords()
  canvas.renderAll()
}

// ─── ARRAY (RECTANGULAR) ─────────────────────────────
export function arrayRectangular(
  obj:    fabric.Object,
  cols:   number,
  rows:   number,
  colGap: number,     // px
  rowGap: number,     // px
  canvas: fabric.Canvas
): fabric.Object[] {
  const created: fabric.Object[] = []
  const w = (obj.width  ?? 0) * (obj.scaleX ?? 1) + colGap
  const h = (obj.height ?? 0) * (obj.scaleY ?? 1) + rowGap

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 && c === 0) continue
      const clone = copyObject(obj, c * w, r * h, canvas)
      created.push(clone)
    }
  }
  return created
}

// ─── FILLET (rounded corner) ─────────────────────────
export function createFillet(
  x: number, y: number,
  radius: number,
  startAngle: number,
  endAngle:   number,
  canvas: fabric.Canvas
): fabric.Path {
  const path = new fabric.Path(
    describeArc(x, y, radius, startAngle, endAngle),
    {
      stroke:      '#E8EAF0',
      strokeWidth: 1,
      fill:        'transparent',
      selectable:  true,
    }
  )
  canvas.add(path)
  canvas.renderAll()
  return path
}

function describeArc(
  cx: number, cy: number, r: number,
  startDeg: number, endDeg: number
): string {
  const toRad = (d: number) => d * Math.PI / 180
  const sx = cx + r * Math.cos(toRad(startDeg))
  const sy = cy + r * Math.sin(toRad(startDeg))
  const ex = cx + r * Math.cos(toRad(endDeg))
  const ey = cy + r * Math.sin(toRad(endDeg))
  const lg = (endDeg - startDeg) > 180 ? 1 : 0
  return `M ${sx} ${sy} A ${r} ${r} 0 ${lg} 1 ${ex} ${ey}`
}

// ─── HATCH PATTERNS ──────────────────────────────────
export type HatchPattern =
  | 'horizontal' | 'vertical' | 'diagonal45'
  | 'crosshatch' | 'dots' | 'concrete' | 'brick' | 'earth'

export function createHatch(
  bounds: { left: number; top: number; width: number; height: number },
  pattern: HatchPattern,
  color:   string = '#64748B',
  spacing: number = 20,
  canvas:  fabric.Canvas
): fabric.Group {
  const { left, top, width, height } = bounds
  const lines: fabric.Object[] = []

  // Clip rect
  const clipRect = new fabric.Rect({
    left, top, width, height,
    fill: 'transparent', stroke: color, strokeWidth: 1,
    selectable: false, evented: false,
  })
  lines.push(clipRect)

  switch (pattern) {
    case 'horizontal':
      for (let y = top; y <= top + height; y += spacing) {
        lines.push(makeLine(left, y, left + width, y, color))
      }
      break

    case 'vertical':
      for (let x = left; x <= left + width; x += spacing) {
        lines.push(makeLine(x, top, x, top + height, color))
      }
      break

    case 'diagonal45':
      for (let d = -height; d <= width + height; d += spacing) {
        lines.push(makeLine(left + d, top, left + d + height, top + height, color))
      }
      break

    case 'crosshatch':
      for (let y = top; y <= top + height; y += spacing) {
        lines.push(makeLine(left, y, left + width, y, color))
      }
      for (let x = left; x <= left + width; x += spacing) {
        lines.push(makeLine(x, top, x, top + height, color))
      }
      break

    case 'dots': {
      const step = spacing * 1.2
      for (let y = top + step / 2; y < top + height; y += step) {
        for (let x = left + step / 2; x < left + width; x += step) {
          lines.push(new fabric.Circle({
            left: x - 1.5, top: y - 1.5, radius: 1.5,
            fill: color, stroke: 'none',
            selectable: false, evented: false,
          }))
        }
      }
      break
    }

    case 'concrete': {
      // Random aggregate look
      for (let y = top; y <= top + height; y += spacing * 0.8) {
        lines.push(makeLine(left, y, left + width, y, color, 0.5))
      }
      for (let y = top + spacing * 0.4; y < top + height; y += spacing * 1.6) {
        for (let x = left + 8; x < left + width; x += spacing * 1.2) {
          lines.push(new fabric.Circle({
            left: x, top: y, radius: 3,
            fill: 'transparent', stroke: color, strokeWidth: 0.5,
            selectable: false, evented: false,
          }))
        }
      }
      break
    }

    case 'brick': {
      let odd = false
      for (let y = top; y < top + height; y += spacing / 2) {
        const offset = odd ? spacing : 0
        for (let x = left - spacing + offset; x < left + width + spacing; x += spacing * 2) {
          lines.push(new fabric.Rect({
            left: x, top: y,
            width: spacing * 1.8, height: spacing * 0.45,
            fill: 'transparent', stroke: color, strokeWidth: 0.5,
            selectable: false, evented: false,
          }))
        }
        odd = !odd
      }
      break
    }

    case 'earth': {
      for (let y = top; y <= top + height; y += spacing * 0.6) {
        lines.push(makeLine(left, y, left + width, y, color, 0.5))
      }
      for (let d = -height; d <= width + height; d += spacing * 1.2) {
        lines.push(makeLine(left + d, top, left + d + height / 2, top + height, color, 0.4))
      }
      break
    }
  }

  const group = new fabric.Group(lines, {
    selectable:  true,
    hasControls: true,
  }) as any
  group.__objectType = 'hatch'
  group.__hatchPattern = pattern

  canvas.add(group)
  canvas.renderAll()
  return group
}

function makeLine(
  x1: number, y1: number, x2: number, y2: number,
  color: string, width = 0.5
): fabric.Line {
  return new fabric.Line([x1, y1, x2, y2], {
    stroke:      color,
    strokeWidth: width,
    selectable:  false,
    evented:     false,
  })
}

// ─── TRIM (remove segment between intersections) ──────
export function trimLine(
  line:        fabric.Line,
  trimPoint:   { x: number; y: number },
  otherLines:  fabric.Line[],
  canvas:      fabric.Canvas
): void {
  // Find closest intersection with any other line
  // Simplified: just shorten the line to the trim point
  const x1 = (line.x1 ?? 0) + (line.left ?? 0)
  const y1 = (line.y1 ?? 0) + (line.top  ?? 0)
  const x2 = (line.x2 ?? 0) + (line.left ?? 0)
  const y2 = (line.y2 ?? 0) + (line.top  ?? 0)

  // Distance from start and end to trim point
  const d1 = Math.hypot(trimPoint.x - x1, trimPoint.y - y1)
  const d2 = Math.hypot(trimPoint.x - x2, trimPoint.y - y2)

  if (d1 < d2) {
    // Trim from start side
    line.set({ x1: trimPoint.x - (line.left ?? 0), y1: trimPoint.y - (line.top ?? 0) })
  } else {
    // Trim from end side
    line.set({ x2: trimPoint.x - (line.left ?? 0), y2: trimPoint.y - (line.top ?? 0) })
  }
  line.setCoords()
  canvas.renderAll()
}

// ─── EXTEND ───────────────────────────────────────────
export function extendLine(
  line:      fabric.Line,
  toPoint:   { x: number; y: number },
  fromStart: boolean,
  canvas:    fabric.Canvas
): void {
  if (fromStart) {
    line.set({ x1: toPoint.x - (line.left ?? 0), y1: toPoint.y - (line.top ?? 0) })
  } else {
    line.set({ x2: toPoint.x - (line.left ?? 0), y2: toPoint.y - (line.top ?? 0) })
  }
  line.setCoords()
  canvas.renderAll()
}

// ─── Selection helpers ────────────────────────────────
export function getSelectedObjects(canvas: fabric.Canvas): fabric.Object[] {
  return canvas.getActiveObjects().filter((o) => !(o as any).__isGrid)
}

export function selectAll(canvas: fabric.Canvas): void {
  const objs = canvas.getObjects().filter(
    (o) => !(o as any).__isGrid && !(o as any).__isStructGrid
  )
  const sel = new fabric.ActiveSelection(objs, { canvas })
  canvas.setActiveObject(sel)
  canvas.renderAll()
}
