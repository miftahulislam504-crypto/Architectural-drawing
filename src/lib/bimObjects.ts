import { fabric } from 'fabric'
import type {
  WallProps, DoorProps, WindowProps,
  ColumnProps, RoomProps
} from '@/types'

// ─── BIM Object Meta ──────────────────────────────────
export interface BIMObjectMeta {
  __isBIM:      true
  __layerId:    string
  __objectType: BIMType
  __props:      WallProps | DoorProps | WindowProps | ColumnProps | RoomProps
  __id:         string
}

export type BIMType = 'wall' | 'door' | 'window' | 'column' | 'room'

// ─── Default Properties ───────────────────────────────
export const DEFAULT_WALL_PROPS: WallProps = {
  type:      'brick',
  thickness: 250,
  height:    3000,
  material:  '1st class brick',
  finish:    'plaster',
}

export const DEFAULT_COLUMN_PROPS: Omit<ColumnProps, 'id' | 'gridRef'> = {
  shape: 'square',
  width: 300,
  depth: 300,
}

export const DEFAULT_DOOR_PROPS: Omit<DoorProps, 'id'> = {
  type:          'single',
  width:         900,
  height:        2100,
  material:      'wood',
  openDirection: 'left',
}

export const DEFAULT_WINDOW_PROPS: Omit<WindowProps, 'id'> = {
  type:      'casement',
  width:     1200,
  height:    1200,
  sillLevel: 900,
  material:  'aluminum',
}

export const DEFAULT_ROOM_PROPS: Omit<RoomProps, 'id' | 'area'> = {
  name:         'Room',
  number:       'R-01',
  floorFinish:  'tile',
  ceilingFinish:'paint',
  wallFinish:   'paint',
  occupancy:    4,
}

// ─── Layer Colors ─────────────────────────────────────
const LAYER_COLOR: Record<string, string> = {
  walls:   '#64748B',
  doors:   '#F59E0B',
  windows: '#00B4D8',
  columns: '#EF4444',
  rooms:   '#10B981',
  grids:   '#1E4A6A',
}

// ─── WALL ─────────────────────────────────────────────
export interface WallPoints {
  x1: number; y1: number
  x2: number; y2: number
}

export function createWall(
  pts: WallPoints,
  props: WallProps,
  id: string
): fabric.Group {
  const dx    = pts.x2 - pts.x1
  const dy    = pts.y2 - pts.y1
  const len   = Math.hypot(dx, dy)
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)
  const t     = props.thickness   // px (1px = 1mm at scale 1:1)

  // Center line
  const centerLine = new fabric.Line([0, 0, len, 0], {
    stroke:        LAYER_COLOR.walls,
    strokeWidth:   1,
    strokeDashArray: [8, 4],
    selectable:    false,
    evented:       false,
  })

  // Wall body rect
  const wallBody = new fabric.Rect({
    left:        0,
    top:         -t / 2,
    width:       len,
    height:      t,
    fill:        'rgba(100,116,139,0.15)',
    stroke:      LAYER_COLOR.walls,
    strokeWidth: 1.5,
    selectable:  false,
    evented:     false,
  })

  // Wall type hatch (brick pattern for brick walls)
  const hatchLines: fabric.Line[] = []
  if (props.type === 'brick') {
    const step = 150
    for (let x = step; x < len; x += step) {
      hatchLines.push(
        new fabric.Line([x, -t / 2, x, t / 2], {
          stroke:    'rgba(100,116,139,0.4)',
          strokeWidth: 0.5,
          selectable: false,
          evented:    false,
        })
      )
    }
  }

  const group = new fabric.Group(
    [wallBody, centerLine, ...hatchLines],
    {
      left:       pts.x1,
      top:        pts.y1,
      angle,
      originX:    'left',
      originY:    'center',
      selectable: true,
      hasControls: true,
      lockRotation: false,
    }
  ) as any

  // Attach BIM metadata
  group.__isBIM      = true
  group.__layerId    = 'walls'
  group.__objectType = 'wall'
  group.__id         = id
  group.__props      = { ...props }

  return group
}

// ─── COLUMN ───────────────────────────────────────────
export function createColumn(
  cx: number, cy: number,
  props: Omit<ColumnProps, 'id' | 'gridRef'> & { id: string; gridRef?: string },
): fabric.Group {
  const { shape, width, depth, diameter, id } = props

  let body: fabric.Object
  if (shape === 'circular') {
    const r = (diameter ?? width) / 2
    body = new fabric.Circle({
      left:        -r,
      top:         -r,
      radius:      r,
      fill:        'rgba(239,68,68,0.15)',
      stroke:      LAYER_COLOR.columns,
      strokeWidth: 2,
      selectable:  false,
      evented:     false,
    })
  } else {
    body = new fabric.Rect({
      left:        -width / 2,
      top:         -depth / 2,
      width,
      height:      depth,
      fill:        'rgba(239,68,68,0.2)',
      stroke:      LAYER_COLOR.columns,
      strokeWidth: 2,
      selectable:  false,
      evented:     false,
    })
  }

  // Cross hatch lines for column
  const d1 = shape === 'circular'
    ? (diameter ?? width) / 2
    : Math.max(width, depth) / 2

  const diag1 = new fabric.Line(
    [-width / 2, -depth / 2, width / 2, depth / 2],
    { stroke: 'rgba(239,68,68,0.4)', strokeWidth: 0.8, selectable: false, evented: false }
  )
  const diag2 = new fabric.Line(
    [width / 2, -depth / 2, -width / 2, depth / 2],
    { stroke: 'rgba(239,68,68,0.4)', strokeWidth: 0.8, selectable: false, evented: false }
  )

  // Column ID label
  const label = new fabric.Text(id, {
    left:      0,
    top:       (shape === 'circular' ? -(diameter ?? width) / 2 : -depth / 2) - 16,
    fontSize:  10,
    fill:      LAYER_COLOR.columns,
    fontFamily: 'JetBrains Mono',
    originX:   'center',
    selectable: false,
    evented:   false,
  })

  const group = new fabric.Group(
    shape === 'circular'
      ? [body, label]
      : [body, diag1, diag2, label],
    {
      left:      cx,
      top:       cy,
      originX:   'center',
      originY:   'center',
      selectable: true,
      hasControls: true,
    }
  ) as any

  group.__isBIM      = true
  group.__layerId    = 'columns'
  group.__objectType = 'column'
  group.__id         = id
  group.__props      = { ...props }

  return group
}

// ─── DOOR ─────────────────────────────────────────────
export function createDoor(
  x: number, y: number,
  props: DoorProps,
  angle = 0
): fabric.Group {
  const { width: w, height: h, type, id, openDirection } = props

  const objects: fabric.Object[] = []

  // Door frame (opening in wall)
  const frame = new fabric.Rect({
    left:        0,
    top:         0,
    width:       w,
    height:      20,
    fill:        'rgba(245,158,11,0.1)',
    stroke:      LAYER_COLOR.doors,
    strokeWidth: 2,
    selectable:  false,
    evented:     false,
  })
  objects.push(frame)

  // Door leaf
  const leaf = new fabric.Rect({
    left:        openDirection === 'left' ? 0 : w - w * 0.9,
    top:         0,
    width:       w * 0.9,
    height:      15,
    fill:        'rgba(245,158,11,0.25)',
    stroke:      LAYER_COLOR.doors,
    strokeWidth: 1,
    selectable:  false,
    evented:     false,
  })
  objects.push(leaf)

  // Swing arc
  const arcRadius = w * 0.9
  const arcStart  = openDirection === 'left' ? 0   : 90
  const arcEnd    = openDirection === 'left' ? 90  : 180
  const arc = new fabric.Path(
    describeArc(
      openDirection === 'left' ? 0 : w,
      0,
      arcRadius,
      arcStart,
      arcEnd
    ),
    {
      stroke:        LAYER_COLOR.doors,
      strokeWidth:   0.8,
      fill:          'transparent',
      strokeDashArray: [4, 3],
      selectable:    false,
      evented:       false,
    }
  )
  objects.push(arc)

  // Double door extra leaf
  if (type === 'double') {
    const leaf2 = new fabric.Rect({
      left:   w / 2,
      top:    0,
      width:  w * 0.45,
      height: 15,
      fill:   'rgba(245,158,11,0.25)',
      stroke: LAYER_COLOR.doors,
      strokeWidth: 1,
      selectable:  false,
      evented:     false,
    })
    objects.push(leaf2)
  }

  // Door ID
  const label = new fabric.Text(id, {
    left:     w / 2,
    top:      -14,
    fontSize: 10,
    fill:     LAYER_COLOR.doors,
    fontFamily: 'JetBrains Mono',
    originX:  'center',
    selectable: false,
    evented:  false,
  })
  objects.push(label)

  const group = new fabric.Group(objects, {
    left:      x,
    top:       y,
    angle,
    originX:   'left',
    originY:   'top',
    selectable: true,
    hasControls: true,
  }) as any

  group.__isBIM      = true
  group.__layerId    = 'doors'
  group.__objectType = 'door'
  group.__id         = id
  group.__props      = { ...props }

  return group
}

// ─── WINDOW ───────────────────────────────────────────
export function createWindow(
  x: number, y: number,
  props: WindowProps,
  angle = 0
): fabric.Group {
  const { width: w, id } = props

  // Window frame
  const outerFrame = new fabric.Rect({
    left: 0, top: 0,
    width: w, height: 20,
    fill:        'rgba(0,180,216,0.08)',
    stroke:      LAYER_COLOR.windows,
    strokeWidth: 2,
    selectable:  false,
    evented:     false,
  })

  // Glass pane lines
  const glassLine1 = new fabric.Line([w * 0.1, 5, w * 0.9, 5], {
    stroke: LAYER_COLOR.windows, strokeWidth: 1.5,
    selectable: false, evented: false,
  })
  const glassLine2 = new fabric.Line([w * 0.1, 15, w * 0.9, 15], {
    stroke: LAYER_COLOR.windows, strokeWidth: 1.5,
    selectable: false, evented: false,
  })
  // Center divider
  const divider = new fabric.Line([w / 2, 0, w / 2, 20], {
    stroke: LAYER_COLOR.windows, strokeWidth: 1,
    selectable: false, evented: false,
  })

  const label = new fabric.Text(id, {
    left: w / 2, top: -14,
    fontSize: 10,
    fill:     LAYER_COLOR.windows,
    fontFamily: 'JetBrains Mono',
    originX: 'center',
    selectable: false, evented: false,
  })

  const group = new fabric.Group(
    [outerFrame, glassLine1, glassLine2, divider, label],
    {
      left: x, top: y, angle,
      originX: 'left', originY: 'top',
      selectable: true, hasControls: true,
    }
  ) as any

  group.__isBIM      = true
  group.__layerId    = 'windows'
  group.__objectType = 'window'
  group.__id         = id
  group.__props      = { ...props }

  return group
}

// ─── ROOM ─────────────────────────────────────────────
export function createRoom(
  points: { x: number; y: number }[],
  props:  RoomProps,
): fabric.Group {
  if (points.length < 3) return null as any

  // Build SVG path from points
  const pathData = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ') + ' Z'

  const roomPath = new fabric.Path(pathData, {
    fill:        'rgba(16,185,129,0.06)',
    stroke:      LAYER_COLOR.rooms,
    strokeWidth: 1,
    strokeDashArray: [6, 3],
    selectable:  false,
    evented:     false,
  })

  // Calculate centroid for label
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length

  const nameLabel = new fabric.Text(props.name, {
    left: cx, top: cy - 8,
    fontSize:   12,
    fill:       LAYER_COLOR.rooms,
    fontFamily: 'Rajdhani',
    fontWeight: '600',
    originX:    'center',
    originY:    'center',
    selectable: false,
    evented:    false,
  })

  const areaLabel = new fabric.Text(`${props.area.toFixed(1)} m²`, {
    left: cx, top: cy + 10,
    fontSize:   10,
    fill:       'rgba(16,185,129,0.7)',
    fontFamily: 'JetBrains Mono',
    originX:    'center',
    originY:    'center',
    selectable: false,
    evented:    false,
  })

  const group = new fabric.Group([roomPath, nameLabel, areaLabel], {
    selectable:  true,
    hasControls: true,
  }) as any

  group.__isBIM      = true
  group.__layerId    = 'rooms'
  group.__objectType = 'room'
  group.__id         = props.id
  group.__props      = { ...props }

  return group
}

// ─── Calculate polygon area (shoelace formula) ────────
export function calcPolygonArea(
  points: { x: number; y: number }[]
): number {
  let area = 0
  const n  = points.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }
  // Convert px² → m² (1px = 1mm at scale 1:1, so px²/1e6 = m²)
  return Math.abs(area / 2) / 1_000_000
}

// ─── SVG Arc helper ───────────────────────────────────
function describeArc(
  cx: number, cy: number,
  r: number,
  startDeg: number,
  endDeg: number
): string {
  const toRad = (d: number) => (d * Math.PI) / 180
  const sx = cx + r * Math.cos(toRad(startDeg))
  const sy = cy + r * Math.sin(toRad(startDeg))
  const ex = cx + r * Math.cos(toRad(endDeg))
  const ey = cy + r * Math.sin(toRad(endDeg))
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey} Z`
}

// ─── Get BIM meta from Fabric object ─────────────────
export function getBIMMeta(obj: fabric.Object): BIMObjectMeta | null {
  const o = obj as any
  if (!o.__isBIM) return null
  return {
    __isBIM:      true,
    __layerId:    o.__layerId,
    __objectType: o.__objectType,
    __props:      o.__props,
    __id:         o.__id,
  }
}

// ─── Update BIM props on existing object ─────────────
export function updateBIMProps(
  obj: fabric.Object,
  newProps: Partial<WallProps | DoorProps | WindowProps | ColumnProps | RoomProps>
): void {
  const o = obj as any
  if (!o.__isBIM) return
  o.__props = { ...o.__props, ...newProps }
}
