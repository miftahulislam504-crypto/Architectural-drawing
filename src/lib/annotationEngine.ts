import { fabric } from 'fabric'
import { getBIMMeta } from '@/lib/bimObjects'
import { formatMm } from '@/lib/canvasUtils'

// ─── Colors ───────────────────────────────────────────
const C = {
  dim:    '#00B4D8',
  tag:    '#E8EAF0',
  room:   '#10B981',
  wall:   '#94A3B8',
  col:    '#EF4444',
  door:   '#F59E0B',
  win:    '#00B4D8',
  note:   '#9CA3AF',
  bg:     'rgba(13,15,18,0.85)',
}

// ─── Dimension Style ──────────────────────────────────
export interface DimStyle {
  arrowSize:    number
  textSize:     number
  lineWeight:   number
  offset:       number
  color:        string
  font:         string
  showUnit:     boolean
  precision:    number
}

export const DIM_STYLES: Record<string, DimStyle> = {
  standard: {
    arrowSize: 6, textSize: 11, lineWeight: 0.8,
    offset: 30, color: C.dim, font: 'JetBrains Mono',
    showUnit: true, precision: 0,
  },
  small: {
    arrowSize: 4, textSize: 9, lineWeight: 0.5,
    offset: 20, color: C.dim, font: 'JetBrains Mono',
    showUnit: true, precision: 0,
  },
  large: {
    arrowSize: 8, textSize: 14, lineWeight: 1.2,
    offset: 40, color: C.dim, font: 'JetBrains Mono',
    showUnit: true, precision: 0,
  },
}

// ─── Room Tag ─────────────────────────────────────────
export function createRoomTag(
  cx: number, cy: number,
  roomName: string,
  area: number,
  roomNumber: string
): fabric.Group {
  const nameTxt = new fabric.Text(roomName, {
    left: cx, top: cy - 8,
    fontSize: 13, fill: C.tag,
    fontFamily: 'Rajdhani', fontWeight: '600',
    originX: 'center', originY: 'center',
    selectable: false, evented: false,
  })

  const areaTxt = new fabric.Text(`${area.toFixed(1)} m²`, {
    left: cx, top: cy + 8,
    fontSize: 10, fill: C.room,
    fontFamily: 'JetBrains Mono',
    originX: 'center', originY: 'center',
    selectable: false, evented: false,
  })

  const numTxt = new fabric.Text(roomNumber, {
    left: cx, top: cy + 22,
    fontSize: 9, fill: C.note,
    fontFamily: 'JetBrains Mono',
    originX: 'center', originY: 'center',
    selectable: false, evented: false,
  })

  // Underline
  const line = new fabric.Line(
    [cx - 30, cy + 2, cx + 30, cy + 2],
    { stroke: C.room, strokeWidth: 0.5, selectable: false, evented: false }
  )

  const group = new fabric.Group([nameTxt, areaTxt, numTxt, line], {
    left: cx, top: cy,
    originX: 'center', originY: 'center',
    selectable: true, hasControls: false,
  }) as any
  group.__objectType = 'room_tag'
  group.__layerId    = 'dimensions'
  return group
}

// ─── Wall Tag ─────────────────────────────────────────
export function createWallTag(
  x: number, y: number,
  thickness: number,
  wallType: string,
  angle: number
): fabric.Group {
  const label = `${wallType.charAt(0).toUpperCase()}W ${thickness}mm`

  const pill = new fabric.Rect({
    left: -40, top: -10, width: 80, height: 20,
    fill: 'rgba(100,116,139,0.15)',
    stroke: C.wall, strokeWidth: 0.8,
    rx: 4, ry: 4,
    selectable: false, evented: false,
  })

  const txt = new fabric.Text(label, {
    left: 0, top: 0,
    fontSize: 9, fill: C.wall,
    fontFamily: 'JetBrains Mono',
    originX: 'center', originY: 'center',
    selectable: false, evented: false,
  })

  const group = new fabric.Group([pill, txt], {
    left: x, top: y, angle,
    originX: 'center', originY: 'center',
    selectable: true, hasControls: false,
  }) as any
  group.__objectType = 'wall_tag'
  group.__layerId    = 'dimensions'
  return group
}

// ─── Door Tag ─────────────────────────────────────────
export function createDoorTag(
  x: number, y: number,
  doorId: string,
  width: number,
  height: number
): fabric.Group {
  const circle = new fabric.Circle({
    left: -12, top: -12, radius: 12,
    fill: 'rgba(245,158,11,0.15)',
    stroke: C.door, strokeWidth: 1,
    selectable: false, evented: false,
  })

  const idTxt = new fabric.Text(doorId, {
    left: 0, top: -2,
    fontSize: 9, fill: C.door,
    fontFamily: 'JetBrains Mono', fontWeight: '600',
    originX: 'center', originY: 'center',
    selectable: false, evented: false,
  })

  const sizeTxt = new fabric.Text(`${width}×${height}`, {
    left: 0, top: 20,
    fontSize: 8, fill: C.note,
    fontFamily: 'JetBrains Mono',
    originX: 'center',
    selectable: false, evented: false,
  })

  const group = new fabric.Group([circle, idTxt, sizeTxt], {
    left: x, top: y,
    originX: 'center', originY: 'center',
    selectable: true, hasControls: false,
  }) as any
  group.__objectType = 'door_tag'
  group.__layerId    = 'dimensions'
  return group
}

// ─── Window Tag ───────────────────────────────────────
export function createWindowTag(
  x: number, y: number,
  winId: string,
  width: number,
  sillLevel: number
): fabric.Group {
  const diamond = new fabric.Path(
    `M ${0} ${-10} L ${10} ${0} L ${0} ${10} L ${-10} ${0} Z`,
    {
      fill: 'rgba(0,180,216,0.15)',
      stroke: C.win, strokeWidth: 1,
      selectable: false, evented: false,
    }
  )

  const idTxt = new fabric.Text(winId, {
    left: 0, top: 0,
    fontSize: 9, fill: C.win,
    fontFamily: 'JetBrains Mono',
    originX: 'center', originY: 'center',
    selectable: false, evented: false,
  })

  const sizeTxt = new fabric.Text(`W=${width} S=${sillLevel}`, {
    left: 0, top: 18,
    fontSize: 7, fill: C.note,
    fontFamily: 'JetBrains Mono',
    originX: 'center',
    selectable: false, evented: false,
  })

  const group = new fabric.Group([diamond, idTxt, sizeTxt], {
    left: x, top: y,
    originX: 'center', originY: 'center',
    selectable: true, hasControls: false,
  }) as any
  group.__objectType = 'window_tag'
  group.__layerId    = 'dimensions'
  return group
}

// ─── Column Tag ───────────────────────────────────────
export function createColumnTag(
  x: number, y: number,
  colId: string,
  gridRef: string,
  size: string
): fabric.Group {
  const sq = new fabric.Rect({
    left: -14, top: -10, width: 28, height: 20,
    fill: 'rgba(239,68,68,0.15)',
    stroke: C.col, strokeWidth: 1,
    selectable: false, evented: false,
  })

  const idTxt = new fabric.Text(colId, {
    left: 0, top: 0,
    fontSize: 9, fill: C.col,
    fontFamily: 'JetBrains Mono', fontWeight: '600',
    originX: 'center', originY: 'center',
    selectable: false, evented: false,
  })

  const refTxt = new fabric.Text(gridRef || size, {
    left: 0, top: 18,
    fontSize: 8, fill: C.note,
    fontFamily: 'JetBrains Mono',
    originX: 'center',
    selectable: false, evented: false,
  })

  const group = new fabric.Group([sq, idTxt, refTxt], {
    left: x, top: y,
    originX: 'center', originY: 'center',
    selectable: true, hasControls: false,
  }) as any
  group.__objectType = 'column_tag'
  group.__layerId    = 'dimensions'
  return group
}

// ─── Leader Line ──────────────────────────────────────
export function createLeader(
  fromX: number, fromY: number,
  toX:   number, toY:   number,
  text:  string,
  style: 'arrow' | 'dot' = 'arrow'
): fabric.Group {
  const objects: fabric.Object[] = []

  // Leader line
  const line = new fabric.Line([fromX, fromY, toX, toY], {
    stroke: C.dim, strokeWidth: 0.8,
    selectable: false, evented: false,
  })
  objects.push(line)

  // Horizontal tail
  const tailLen = 40
  const tailDir = toX > fromX ? 1 : -1
  const tail = new fabric.Line([toX, toY, toX + tailLen * tailDir, toY], {
    stroke: C.dim, strokeWidth: 0.8,
    selectable: false, evented: false,
  })
  objects.push(tail)

  // Arrow or dot at start
  if (style === 'arrow') {
    const angle = Math.atan2(toY - fromY, toX - fromX)
    const SIZE  = 7
    const a1    = angle + Math.PI - Math.PI / 6
    const a2    = angle + Math.PI + Math.PI / 6
    objects.push(
      new fabric.Line(
        [fromX, fromY,
         fromX + SIZE * Math.cos(a1),
         fromY + SIZE * Math.sin(a1)],
        { stroke: C.dim, strokeWidth: 1.2, selectable: false, evented: false }
      ),
      new fabric.Line(
        [fromX, fromY,
         fromX + SIZE * Math.cos(a2),
         fromY + SIZE * Math.sin(a2)],
        { stroke: C.dim, strokeWidth: 1.2, selectable: false, evented: false }
      )
    )
  } else {
    objects.push(new fabric.Circle({
      left: fromX - 4, top: fromY - 4, radius: 4,
      fill: C.dim, selectable: false, evented: false,
    }))
  }

  // Text at tail end
  const txt = new fabric.IText(text, {
    left:       toX + (tailLen + 4) * tailDir,
    top:        toY - 9,
    fontSize:   11,
    fill:       C.tag,
    fontFamily: 'DM Sans',
    originX:    tailDir > 0 ? 'left' : 'right',
    selectable: false,
    evented:    false,
    editable:   true,
  })
  objects.push(txt)

  const group = new fabric.Group(objects, {
    selectable:  true,
    hasControls: false,
  }) as any
  group.__objectType = 'leader'
  group.__layerId    = 'dimensions'
  return group
}

// ─── Callout Box ──────────────────────────────────────
export function createCallout(
  x: number, y: number,
  title: string,
  body:  string
): fabric.Group {
  const PAD = 8
  const W   = 140

  const titleTxt = new fabric.Text(title, {
    left: PAD, top: PAD,
    fontSize: 11, fill: C.tag,
    fontFamily: 'Rajdhani', fontWeight: '700',
    width: W - PAD * 2,
    selectable: false, evented: false,
  })

  const bodyTxt = new fabric.Text(body, {
    left: PAD, top: PAD + 18,
    fontSize: 9, fill: C.note,
    fontFamily: 'DM Sans',
    width: W - PAD * 2,
    selectable: false, evented: false,
  })

  const H   = PAD * 2 + 18 + (body ? 20 : 0)

  const bg = new fabric.Rect({
    left: 0, top: 0, width: W, height: H,
    fill: 'rgba(13,15,18,0.9)',
    stroke: '#2A2D35', strokeWidth: 1,
    rx: 4, ry: 4,
    selectable: false, evented: false,
  })

  const titleBar = new fabric.Rect({
    left: 0, top: 0, width: W, height: 3,
    fill: C.dim, stroke: 'none',
    rx: 4, ry: 4,
    selectable: false, evented: false,
  })

  const group = new fabric.Group(
    [bg, titleBar, titleTxt, ...(body ? [bodyTxt] : [])],
    {
      left: x, top: y,
      selectable: true, hasControls: true,
    }
  ) as any
  group.__objectType = 'callout'
  group.__layerId    = 'text'
  return group
}

// ─── Auto-tag all BIM objects on canvas ──────────────
export function autoTagCanvas(
  canvas: fabric.Canvas
): void {
  const objects = canvas.getObjects().filter((o) => {
    const o2 = o as any
    return o2.__isBIM === true
  })

  objects.forEach((obj) => {
    const meta = getBIMMeta(obj)
    if (!meta) return

    const bounds = obj.getBoundingRect()
    const cx     = bounds.left + bounds.width  / 2
    const cy     = bounds.top  + bounds.height / 2

    let tag: fabric.Group | null = null

    if (meta.__objectType === 'room') {
      const p = meta.__props as any
      tag = createRoomTag(cx, cy, p.name, p.area ?? 0, p.number)
    } else if (meta.__objectType === 'door') {
      const p = meta.__props as any
      tag = createDoorTag(cx, cy - 30, p.id, p.width, p.height)
    } else if (meta.__objectType === 'window') {
      const p = meta.__props as any
      tag = createWindowTag(cx, cy - 25, p.id, p.width, p.sillLevel)
    } else if (meta.__objectType === 'column') {
      const p = meta.__props as any
      const sz = p.shape === 'circular'
        ? `Ø${p.diameter ?? p.width}`
        : `${p.width}×${p.depth}`
      tag = createColumnTag(cx, cy + 35, p.id, p.gridRef ?? '', sz)
    } else if (meta.__objectType === 'wall') {
      const p = meta.__props as any
      tag = createWallTag(cx, cy, p.thickness, p.type, obj.angle ?? 0)
    }

    if (tag) {
      ;(tag as any).__autoTag = true
      canvas.add(tag)
    }
  })

  canvas.renderAll()
}

// ─── Remove all auto-tags ─────────────────────────────
export function removeAutoTags(canvas: fabric.Canvas): void {
  const tags = canvas.getObjects().filter((o: any) => o.__autoTag === true)
  tags.forEach((t) => canvas.remove(t))
  canvas.renderAll()
}

// ─── Continuous dimension chain ───────────────────────
export function createDimChain(
  canvas:  fabric.Canvas,
  points:  { x: number; y: number }[],
  offset:  number = 30,
  isHoriz: boolean = true
): void {
  if (points.length < 2) return

  const COLOR = C.dim

  for (let i = 0; i < points.length - 1; i++) {
    const p1   = points[i]
    const p2   = points[i + 1]

    let x1: number, y1: number, x2: number, y2: number, dist: number

    if (isHoriz) {
      x1 = p1.x; y1 = p1.y - offset
      x2 = p2.x; y2 = p2.y - offset
      dist = Math.abs(p2.x - p1.x)
    } else {
      x1 = p1.x - offset; y1 = p1.y
      x2 = p2.x - offset; y2 = p2.y
      dist = Math.abs(p2.y - p1.y)
    }

    const objects: fabric.Object[] = []

    // Main dim line
    objects.push(new fabric.Line([x1, y1, x2, y2], {
      stroke: COLOR, strokeWidth: 0.8,
      selectable: false, evented: false,
    }))

    // Extension lines
    objects.push(
      new fabric.Line([p1.x, p1.y, x1, y1], {
        stroke: COLOR, strokeWidth: 0.5, strokeDashArray: [3, 3],
        selectable: false, evented: false,
      }),
      new fabric.Line([p2.x, p2.y, x2, y2], {
        stroke: COLOR, strokeWidth: 0.5, strokeDashArray: [3, 3],
        selectable: false, evented: false,
      })
    )

    // Tick marks
    if (isHoriz) {
      objects.push(
        new fabric.Line([x1, y1 - 5, x1, y1 + 5], {
          stroke: COLOR, strokeWidth: 0.8, selectable: false, evented: false,
        }),
        new fabric.Line([x2, y2 - 5, x2, y2 + 5], {
          stroke: COLOR, strokeWidth: 0.8, selectable: false, evented: false,
        })
      )
    } else {
      objects.push(
        new fabric.Line([x1 - 5, y1, x1 + 5, y1], {
          stroke: COLOR, strokeWidth: 0.8, selectable: false, evented: false,
        }),
        new fabric.Line([x2 - 5, y2, x2 + 5, y2], {
          stroke: COLOR, strokeWidth: 0.8, selectable: false, evented: false,
        })
      )
    }

    // Label
    objects.push(new fabric.Text(formatMm(dist), {
      left:       (x1 + x2) / 2,
      top:        (y1 + y2) / 2 - 10,
      fontSize:   10,
      fill:       COLOR,
      fontFamily: 'JetBrains Mono',
      originX:    'center',
      backgroundColor: C.bg,
      selectable: false, evented: false,
    }))

    const grp = new fabric.Group(objects, {
      selectable: true, hasControls: false,
    }) as any
    grp.__objectType = 'dim_chain'
    grp.__layerId    = 'dimensions'
    canvas.add(grp)
  }

  canvas.renderAll()
}
