import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  AppState, ActiveTool, SnapMode, DrawingUnit,
  Floor, Layer, CanvasViewport, HubProject,
  SiteInfo, BNBCSettings, BuildingInfo
} from '@/types'

// ─── Default Layers ───────────────────────────────────
const DEFAULT_LAYERS: Layer[] = [
  { id: 'walls',      name: 'Walls',      color: '#64748B', visible: true, locked: false, lineWeight: 2 },
  { id: 'doors',      name: 'Doors',      color: '#F59E0B', visible: true, locked: false, lineWeight: 1 },
  { id: 'windows',    name: 'Windows',    color: '#00B4D8', visible: true, locked: false, lineWeight: 1 },
  { id: 'columns',    name: 'Columns',    color: '#EF4444', visible: true, locked: false, lineWeight: 2 },
  { id: 'grids',      name: 'Grids',      color: '#1A3A4A', visible: true, locked: false, lineWeight: 0.5 },
  { id: 'rooms',      name: 'Rooms',      color: '#10B981', visible: true, locked: false, lineWeight: 0.5 },
  { id: 'dimensions', name: 'Dimensions', color: '#E8EAF0', visible: true, locked: false, lineWeight: 0.5 },
  { id: 'text',       name: 'Text',       color: '#E8EAF0', visible: true, locked: false, lineWeight: 0.5 },
  { id: 'furniture',  name: 'Furniture',  color: '#8B5CF6', visible: true, locked: false, lineWeight: 0.5 },
  { id: 'site',       name: 'Site',       color: '#22C55E', visible: true, locked: false, lineWeight: 1 },
]

// ─── Default Ground Floor ─────────────────────────────
const DEFAULT_FLOORS: Floor[] = [
  { id: 'gf',  name: 'Ground Floor', level: 0,    height: 3000, order: 0 },
  { id: '1f',  name: '1st Floor',    level: 3000, height: 3000, order: 1 },
]

// ─── Initial State ────────────────────────────────────
const initialState: AppState = {
  currentProjectId: null,
  hubProject:       null,
  siteInfo:         null,
  bnbcSettings:     null,
  buildingInfo:     null,

  floors:        DEFAULT_FLOORS,
  activeFloorId: 'gf',

  layers:        DEFAULT_LAYERS,
  activeLayerId: 'walls',

  activeTool: 'select',
  snapMode:   'grid',
  unit:       'mm',
  gridSize:   100,      // 100mm = 10cm grid
  showGrid:   true,

  viewport: { zoom: 1, panX: 0, panY: 0 },

  doorCount:   0,
  windowCount: 0,
  columnCount: 0,
  roomCount:   0,

  leftPanelOpen:  true,
  rightPanelOpen: true,
  isLoading:      false,
}

// ─── Store ────────────────────────────────────────────
interface AppActions {
  // Project
  setProject: (project: HubProject) => void
  setSiteInfo: (info: SiteInfo) => void
  setBNBCSettings: (settings: BNBCSettings) => void
  setBuildingInfo: (info: BuildingInfo) => void
  setCurrentProjectId: (id: string) => void

  // Floors
  setActiveFloor: (id: string) => void
  addFloor: (floor: Floor) => void
  updateFloor: (id: string, updates: Partial<Floor>) => void
  removeFloor: (id: string) => void

  // Layers
  setActiveLayer: (id: string) => void
  toggleLayerVisibility: (id: string) => void
  toggleLayerLock: (id: string) => void

  // Canvas Tools
  setActiveTool: (tool: ActiveTool) => void
  setSnapMode: (mode: SnapMode) => void
  setUnit: (unit: DrawingUnit) => void
  setGridSize: (size: number) => void
  toggleGrid: () => void
  setViewport: (viewport: Partial<CanvasViewport>) => void
  resetViewport: () => void

  // Object Counters
  nextDoorId: () => string
  nextWindowId: () => string
  nextColumnId: () => string
  nextRoomId: () => string

  // UI
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  setLoading: (val: boolean) => void

  // Reset
  reset: () => void
}

export const useAppStore = create<AppState & AppActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ── Project ───────────────────────────────────
      setProject: (project) => set({ hubProject: project }),
      setSiteInfo: (info) => set({ siteInfo: info }),
      setBNBCSettings: (settings) => set({ bnbcSettings: settings }),
      setBuildingInfo: (info) => {
        // Auto-generate floors based on building info
        if (info.numFloors > 0) {
          const floors: Floor[] = []
          for (let i = 0; i < info.numFloors; i++) {
            floors.push({
              id: i === 0 ? 'gf' : `${i}f`,
              name: i === 0 ? 'Ground Floor' : `${i}${getOrdinal(i)} Floor`,
              level: i * (info.floorHeight * 1000),
              height: info.floorHeight * 1000,
              order: i,
            })
          }
          set({ buildingInfo: info, floors, activeFloorId: 'gf' })
        } else {
          set({ buildingInfo: info })
        }
      },
      setCurrentProjectId: (id) => set({ currentProjectId: id }),

      // ── Floors ────────────────────────────────────
      setActiveFloor: (id) => set({ activeFloorId: id }),
      addFloor: (floor) =>
        set((s) => ({ floors: [...s.floors, floor] })),
      updateFloor: (id, updates) =>
        set((s) => ({
          floors: s.floors.map((f) => f.id === id ? { ...f, ...updates } : f),
        })),
      removeFloor: (id) =>
        set((s) => ({ floors: s.floors.filter((f) => f.id !== id) })),

      // ── Layers ────────────────────────────────────
      setActiveLayer: (id) => set({ activeLayerId: id }),
      toggleLayerVisibility: (id) =>
        set((s) => ({
          layers: s.layers.map((l) =>
            l.id === id ? { ...l, visible: !l.visible } : l
          ),
        })),
      toggleLayerLock: (id) =>
        set((s) => ({
          layers: s.layers.map((l) =>
            l.id === id ? { ...l, locked: !l.locked } : l
          ),
        })),

      // ── Canvas Tools ──────────────────────────────
      setActiveTool: (tool) => set({ activeTool: tool }),
      setSnapMode: (mode) => set({ snapMode: mode }),
      setUnit: (unit) => set({ unit }),
      setGridSize: (size) => set({ gridSize: size }),
      toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
      setViewport: (viewport) =>
        set((s) => ({ viewport: { ...s.viewport, ...viewport } })),
      resetViewport: () =>
        set({ viewport: { zoom: 1, panX: 0, panY: 0 } }),

      // ── Object ID Generators ──────────────────────
      nextDoorId: () => {
        const n = get().doorCount + 1
        set({ doorCount: n })
        return `D-${String(n).padStart(2, '0')}`
      },
      nextWindowId: () => {
        const n = get().windowCount + 1
        set({ windowCount: n })
        return `W-${String(n).padStart(2, '0')}`
      },
      nextColumnId: () => {
        const n = get().columnCount + 1
        set({ columnCount: n })
        return `C-${String(n).padStart(2, '0')}`
      },
      nextRoomId: () => {
        const n = get().roomCount + 1
        set({ roomCount: n })
        return `R-${String(n).padStart(2, '0')}`
      },

      // ── UI ────────────────────────────────────────
      toggleLeftPanel: () =>
        set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
      toggleRightPanel: () =>
        set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
      setLoading: (val) => set({ isLoading: val }),

      // ── Reset ─────────────────────────────────────
      reset: () => set(initialState),
    }),
    { name: 'CivilOS-Architectural' }
  )
)

// ─── Helper ───────────────────────────────────────────
function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}
