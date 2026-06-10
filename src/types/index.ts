// ─── Project (from Hub) ──────────────────────────────
export interface HubProject {
  id: string
  name: string
  clientName: string
  location: string
  status: 'active' | 'hold' | 'done'
  createdAt: string
}

// ─── Site Information ─────────────────────────────────
export interface SiteInfo {
  plotArea: number          // sqm
  plotWidth: number         // m
  plotDepth: number         // m
  roadWidth: number         // m
  soilType: 'S1' | 'S2' | 'S3' | 'S4'
  district: string
  address: string
}

// ─── BNBC Settings ───────────────────────────────────
export interface BNBCSettings {
  seismicZone: 1 | 2 | 3 | 4
  windZone: 1 | 2 | 3
  occupancyType: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  importanceFactor: number
  basicWindSpeed: number
  riskCategory: string
}

// ─── Building Info ────────────────────────────────────
export interface BuildingInfo {
  buildingType: 'RCC' | 'Steel' | 'Masonry'
  totalFloors: number
  floorHeight: number       // m
  basementCount: number
  totalHeight: number       // m (auto calculated)
}

// ─── Floor ───────────────────────────────────────────
export interface Floor {
  id: string
  name: string              // "Ground Floor", "1st Floor"...
  level: number             // elevation in mm from datum
  height: number            // floor-to-floor height mm
  order: number             // 0 = ground
}

// ─── Layer ───────────────────────────────────────────
export interface Layer {
  id: string
  name: string
  color: string
  visible: boolean
  locked: boolean
  lineWeight: number
}

export type LayerName =
  | 'walls' | 'doors' | 'windows'
  | 'columns' | 'beams' | 'slabs'
  | 'rooms' | 'grids' | 'dimensions'
  | 'text' | 'furniture' | 'site'

// ─── BIM Objects ─────────────────────────────────────

export type WallType = 'brick' | 'rcc' | 'partition' | 'curtain'
export interface WallProps {
  type: WallType
  thickness: number         // mm
  height: number            // mm
  material: string
  finish: string
}

export type DoorType = 'single' | 'double' | 'sliding' | 'folding'
export interface DoorProps {
  id: string                // D-01, D-02...
  type: DoorType
  width: number             // mm
  height: number            // mm
  material: string
  openDirection: 'left' | 'right'
}

export type WindowType = 'casement' | 'sliding' | 'fixed' | 'awning'
export interface WindowProps {
  id: string                // W-01, W-02...
  type: WindowType
  width: number             // mm
  height: number            // mm
  sillLevel: number         // mm from floor
  material: string
}

export type ColumnShape = 'square' | 'rectangular' | 'circular'
export interface ColumnProps {
  id: string                // C-01...
  shape: ColumnShape
  width: number             // mm
  depth: number             // mm
  diameter?: number         // mm (circular only)
  gridRef: string           // e.g. "A-1"
}

export interface RoomProps {
  id: string                // R-01...
  name: string              // "Bedroom 1"
  number: string
  area: number              // sqm (auto calculated)
  floorFinish: string
  ceilingFinish: string
  wallFinish: string
  occupancy: number         // persons
}

// ─── Grid ────────────────────────────────────────────
export interface GridLine {
  id: string
  label: string             // A, B, C... or 1, 2, 3...
  direction: 'horizontal' | 'vertical'
  position: number          // mm from origin
  spacing?: number          // mm to next grid
}

export interface GridSystem {
  xLines: GridLine[]        // numbered 1,2,3...
  yLines: GridLine[]        // lettered A,B,C...
  origin: { x: number; y: number }
}

// ─── Canvas State ────────────────────────────────────
export type ActiveTool =
  | 'select' | 'pan'
  | 'wall' | 'door' | 'window'
  | 'column' | 'room'
  | 'grid' | 'dimension'
  | 'text' | 'line' | 'polyline' | 'arc'
  | 'circle' | 'rectangle'
  | 'eraser'

export type SnapMode = 'grid' | 'endpoint' | 'midpoint' | 'intersection' | 'none'
export type DrawingUnit = 'mm' | 'm'

export interface CanvasViewport {
  zoom: number
  panX: number
  panY: number
}

// ─── App State (Zustand) ─────────────────────────────
export interface AppState {
  // Project
  currentProjectId: string | null
  hubProject: HubProject | null
  siteInfo: SiteInfo | null
  bnbcSettings: BNBCSettings | null
  buildingInfo: BuildingInfo | null

  // Floors
  floors: Floor[]
  activeFloorId: string | null

  // Layers
  layers: Layer[]
  activeLayerId: string

  // Canvas
  activeTool: ActiveTool
  snapMode: SnapMode
  unit: DrawingUnit
  gridSize: number          // mm
  showGrid: boolean
  viewport: CanvasViewport

  // Object counters (for auto ID)
  doorCount: number
  windowCount: number
  columnCount: number
  roomCount: number

  // UI
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  isLoading: boolean
}
