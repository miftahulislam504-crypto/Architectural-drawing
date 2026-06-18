// ─── Project (from Hub) ──────────────────────────────
// Fields must match exactly what Hub saves to Firestore
export interface HubProject {
  id:          string
  projectCode: string
  projectName: string   // Hub uses projectName (not name)
  clientName:  string
  location:    string
  description?: string
  status:      'active' | 'on_hold' | 'completed'  // Hub uses on_hold (not hold)
  startDate:   any      // Firestore Timestamp or Date
  endDate?:    any
  createdBy:   string
  createdAt:   any      // Firestore Timestamp
  updatedAt?:  any
}

// ─── Site Information ─────────────────────────────────
// Matches Hub's site_information/data document fields
export interface SiteInfo {
  projectId:        string
  address:          string
  district:         string
  upazila:          string
  latitude?:        number
  longitude?:       number
  plotArea?:        number
  plotAreaUnit:     'sqm' | 'sqft' | 'katha' | 'bigha' | 'acre'
  roadWidth?:       number
  roadType?:        string
  soilType:         'S1' | 'S2' | 'S3' | 'S4'
  groundLevel?:     number
  floodLevel?:      number
  groundwaterDepth?: number
  notes?:           string
}

// ─── BNBC Settings ───────────────────────────────────
// Matches Hub's bnbc_settings/data document fields
export interface BNBCSettings {
  projectId:           string
  occupancyType:       string
  riskCategory:        string
  seismicZone:         string   // 'Z1' | 'Z2' | 'Z3'
  seismicZoneCoeff:    number
  importanceFactor:    number
  windZone:            string   // 'A' | 'B' | 'C'
  basicWindSpeed:      number
  liveLoadType:        string
  liveLoadValue:       number
  soilType:            string
  spectralAcceleration: number
  responseModFactor:   number
  structuralSystem:    string
}

// ─── Building Info ────────────────────────────────────
// Matches Hub's building_information/data document fields
export interface BuildingInfo {
  projectId:         string
  buildingType:      string    // 'RCC' | 'Steel' | 'Masonry'
  usageType:         string
  structureSystem:   string
  numFloors:         number    // Hub uses numFloors (not totalFloors)
  basementCount:     number
  floorHeight:       number    // m
  groundFloorHeight: number    // m
  totalHeight:       number    // m (auto calculated)
  roofType:          string
  buildingLength?:   number
  buildingWidth?:    number
  totalFloorArea?:   number
  hasLift:           boolean
  hasGenerator:      boolean
  hasWaterTank:      boolean
  hasParkingFloor:   boolean
  notes?:            string
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
