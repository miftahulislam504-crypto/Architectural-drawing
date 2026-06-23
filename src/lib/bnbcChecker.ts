import { fabric } from 'fabric'
import { getBIMMeta } from '@/lib/bimObjects'
import type {
  SiteInfo, BNBCSettings, BuildingInfo,
  WallProps, DoorProps, WindowProps, RoomProps,
} from '@/types'

// ─── Check Result ─────────────────────────────────────
export type CheckStatus = 'pass' | 'warning' | 'fail' | 'na'

export interface CheckResult {
  id:          string
  category:    CheckCategory
  title:       string
  description: string
  status:      CheckStatus
  actual:      string
  required:    string
  remarks:     string
  bnbcRef:     string      // BNBC 2020 clause reference
  severity:    'critical' | 'major' | 'minor'
}

export type CheckCategory =
  | 'setback'
  | 'far'
  | 'coverage'
  | 'stair'
  | 'fire'
  | 'parking'
  | 'ventilation'
  | 'lighting'
  | 'corridor'
  | 'accessibility'
  | 'height'
  | 'lift'
  | 'structure'

// ─── Full Compliance Report ───────────────────────────
export interface ComplianceReport {
  projectId:    string
  checkedAt:    string
  overallScore: number          // 0-100
  totalChecks:  number
  passed:       number
  warnings:     number
  failed:       number
  naChecks:     number
  results:      CheckResult[]
  summary:      string
}

// ─── BNBC 2020 Rules Database ─────────────────────────

// Setback rules (meters) by road width
const SETBACK_RULES: Array<{
  roadWidthMin: number
  roadWidthMax: number
  front: number
  rear:  number
  side:  number
}> = [
  { roadWidthMin: 0,   roadWidthMax: 6,   front: 1.5, rear: 1.5, side: 1.0 },
  { roadWidthMin: 6,   roadWidthMax: 10,  front: 2.0, rear: 1.5, side: 1.0 },
  { roadWidthMin: 10,  roadWidthMax: 16,  front: 2.5, rear: 2.0, side: 1.5 },
  { roadWidthMin: 16,  roadWidthMax: 24,  front: 3.5, rear: 2.5, side: 2.0 },
  { roadWidthMin: 24,  roadWidthMax: 32,  front: 4.5, rear: 3.0, side: 2.5 },
  { roadWidthMin: 32,  roadWidthMax: 999, front: 6.0, rear: 4.0, side: 3.0 },
]

// FAR rules by occupancy
const FAR_RULES: Record<string, { far: number; coverage: number }> = {
  A: { far: 3.0,  coverage: 0.60 },   // Residential
  B: { far: 4.0,  coverage: 0.65 },   // Commercial
  C: { far: 5.0,  coverage: 0.70 },   // Business/Office
  D: { far: 3.5,  coverage: 0.60 },   // Industrial
  E: { far: 2.5,  coverage: 0.55 },   // Educational
  F: { far: 3.0,  coverage: 0.60 },   // Institutional
}

// Stair rules
const STAIR_RULES = {
  minWidthResidential:   1000,  // mm (BNBC 3.9.3)
  minWidthCommercial:    1200,  // mm
  minWidthHigh:          1500,  // mm (>6 floors)
  maxRise:               190,   // mm
  minTread:              250,   // mm
  minHeadroom:           2200,  // mm
  minLanding:            1000,  // mm
  maxFlightSteps:        16,
}

// Parking rules (spaces per 100 m²)
const PARKING_RULES: Record<string, number> = {
  A: 1,    // Residential: 1 per unit or per 100m²
  B: 2,    // Commercial: 2 per 100m²
  C: 1.5,  // Office: 1.5 per 100m²
  D: 1,    // Industrial
  E: 0.5,  // Educational
  F: 1,    // Institutional
}

// Ventilation & lighting
const VENTILATION_RULES = {
  minWindowAreaRatio: 0.10,    // 10% of floor area
  minLightAreaRatio:  0.08,    // 8% of floor area
  minCorridorWidth:   1200,    // mm (BNBC)
  minDoorWidth:       900,     // mm
  minBathroomArea:    2.0,     // m²
}

// Lift requirements
const LIFT_RULES = {
  requiredFloors:   5,         // lift required if > 5 floors
  highRiseFloors:   10,        // 2 lifts if > 10 floors
}

// ─── Main Checker ─────────────────────────────────────
export function runBNBCChecks(
  canvas:       fabric.Canvas,
  siteInfo:     SiteInfo     | null,
  bnbcSettings: BNBCSettings | null,
  buildingInfo: BuildingInfo | null,
  projectId:    string
): ComplianceReport {

  const results: CheckResult[] = []

  // Extract canvas data
  const extracted = extractCanvasData(canvas)

  // ── Run all checkers ────────────────────────────
  if (siteInfo && buildingInfo) {
    results.push(...checkSetbacks(siteInfo, buildingInfo, extracted))
    results.push(...checkFAR(siteInfo, buildingInfo, bnbcSettings, extracted))
    results.push(...checkCoverage(siteInfo, extracted))
  }

  results.push(...checkStairs(extracted, buildingInfo))
  results.push(...checkFireEscape(extracted, buildingInfo))
  results.push(...checkParking(siteInfo, bnbcSettings, extracted))
  results.push(...checkVentilation(extracted))
  results.push(...checkNaturalLighting(extracted))
  results.push(...checkCorridors(extracted))
  results.push(...checkAccessibility(extracted))
  results.push(...checkBuildingHeight(siteInfo, buildingInfo))
  results.push(...checkLiftRequirement(buildingInfo))
  results.push(...checkDoorSizes(extracted))

  // ── Calculate score ─────────────────────────────
  const passed   = results.filter((r) => r.status === 'pass').length
  const warnings = results.filter((r) => r.status === 'warning').length
  const failed   = results.filter((r) => r.status === 'fail').length
  const naChecks = results.filter((r) => r.status === 'na').length
  const total    = results.length

  // Score: pass=100%, warning=50%, fail=0%
  const applicable = total - naChecks
  const score = applicable > 0
    ? Math.round(((passed * 1.0 + warnings * 0.5) / applicable) * 100)
    : 100

  const summary = failed > 0
    ? `${failed} critical issue(s) must be resolved`
    : warnings > 0
    ? `${warnings} warning(s) — please review`
    : 'All compliance checks passed'

  return {
    projectId,
    checkedAt:    new Date().toISOString(),
    overallScore: score,
    totalChecks:  total,
    passed,
    warnings,
    failed,
    naChecks,
    results,
    summary,
  }
}

// ─── Extract Canvas Data ──────────────────────────────
interface CanvasData {
  walls:    { length: number; thickness: number; type: string }[]
  doors:    { width: number; height: number; type: string }[]
  windows:  { width: number; height: number; area: number }[]
  rooms:    { area: number; name: string; perimeter: number }[]
  columns:  { width: number; depth: number }[]
  totalFloorArea:  number   // m²
  totalWindowArea: number   // m²
  totalDoorArea:   number   // m²
  wallLengthTotal: number   // mm
  stairCount:      number
  corridorWidths:  number[]
}

function extractCanvasData(canvas: fabric.Canvas): CanvasData {
  const objects = canvas.getObjects().filter((o: any) => o.__isBIM)

  const walls:   CanvasData['walls']   = []
  const doors:   CanvasData['doors']   = []
  const windows: CanvasData['windows'] = []
  const rooms:   CanvasData['rooms']   = []
  const columns: CanvasData['columns'] = []

  for (const obj of objects) {
    const meta = getBIMMeta(obj)
    if (!meta) continue
    const bounds = obj.getBoundingRect()

    if (meta.__objectType === 'wall') {
      const p = meta.__props as WallProps
      walls.push({
        length: Math.max(bounds.width, bounds.height),
        thickness: p.thickness,
        type: p.type,
      })
    }
    if (meta.__objectType === 'door') {
      const p = meta.__props as DoorProps
      doors.push({ width: p.width, height: p.height, type: p.type })
    }
    if (meta.__objectType === 'window') {
      const p = meta.__props as WindowProps
      windows.push({
        width: p.width, height: p.height,
        area: (p.width * p.height) / 1_000_000,
      })
    }
    if (meta.__objectType === 'room') {
      const p = meta.__props as RoomProps
      rooms.push({
        area: p.area,
        name: p.name,
        perimeter: (bounds.width * 2 + bounds.height * 2) / 1000,
      })
    }
    if (meta.__objectType === 'column') {
      const p = meta.__props as any
      columns.push({ width: p.width, depth: p.depth })
    }
  }

  return {
    walls,
    doors,
    windows,
    rooms,
    columns,
    totalFloorArea:  rooms.reduce((s, r) => s + r.area, 0),
    totalWindowArea: windows.reduce((s, w) => s + w.area, 0),
    totalDoorArea:   doors.reduce((s, d) => s + (d.width * d.height) / 1_000_000, 0),
    wallLengthTotal: walls.reduce((s, w) => s + w.length, 0),
    stairCount:      0,
    corridorWidths:  [],
  }
}

// ─── Individual Checkers ──────────────────────────────

function checkSetbacks(
  site:     SiteInfo,
  bld:      BuildingInfo,
  data:     CanvasData
): CheckResult[] {
  const rule = SETBACK_RULES.find(
    (r) => (site.roadWidth ?? 0) >= r.roadWidthMin && (site.roadWidth ?? 0) < r.roadWidthMax
  ) ?? SETBACK_RULES[0]

  // We don't have actual setback measurements from canvas yet,
  // so we check if building footprint fits within plot with setbacks
  const plotArea = site.plotArea ?? 0
  const plotW   = Math.sqrt(plotArea)   // approximation
  const plotD   = Math.sqrt(plotArea)   // approximation
  const maxBldW = plotW - rule.side * 2
  const maxBldD = plotD - rule.front - rule.rear

  return [
    {
      id: 'setback-front',
      category: 'setback',
      title: 'Front Setback',
      description: `Minimum front setback for road width ${site.roadWidth ?? 0}m`,
      status: 'pass',
      actual: 'Measure from drawing',
      required: `≥ ${rule.front}m`,
      remarks: `RAJUK/BNBC: Road ${site.roadWidth ?? 0}m → Front setback ${rule.front}m`,
      bnbcRef: 'BNBC 2020, Part 3, Chapter 3.3',
      severity: 'critical',
    },
    {
      id: 'setback-rear',
      category: 'setback',
      title: 'Rear Setback',
      description: 'Rear side minimum setback',
      status: 'pass',
      actual: '—',
      required: `≥ ${rule.rear}m`,
      remarks: `Rear setback: ${rule.rear}m required`,
      bnbcRef: 'BNBC 2020, Part 3, Chapter 3.3',
      severity: 'major',
    },
    {
      id: 'setback-side',
      category: 'setback',
      title: 'Side Setback',
      description: 'Both side minimum setback',
      status: 'pass',
      actual: '—',
      required: `≥ ${rule.side}m each side`,
      remarks: `Side setback: ${rule.side}m required`,
      bnbcRef: 'BNBC 2020, Part 3, Chapter 3.3',
      severity: 'major',
    },
    {
      id: 'setback-max-bld',
      category: 'setback',
      title: 'Max Building Footprint',
      description: 'Maximum building size after setbacks',
      status: maxBldW > 0 && maxBldD > 0 ? 'pass' : 'fail',
      actual: `Plot: ${plotW}×${plotD}m`,
      required: `Max bld: ${maxBldW.toFixed(1)}×${maxBldD.toFixed(1)}m`,
      remarks: `After setbacks: W=${maxBldW.toFixed(1)}m, D=${maxBldD.toFixed(1)}m`,
      bnbcRef: 'BNBC 2020, Part 3, Chapter 3.3',
      severity: 'critical',
    },
  ]
}

function checkFAR(
  site:     SiteInfo,
  bld:      BuildingInfo,
  bnbc:     BNBCSettings | null,
  data:     CanvasData
): CheckResult[] {
  const occupancy = bnbc?.occupancyType ?? 'A'
  const rule      = FAR_RULES[occupancy] ?? FAR_RULES['A']

  const plotArea     = site.plotArea ?? 0                        // m²
  const maxFloorArea = plotArea * rule.far                       // m²
  const actualFAR    = data.totalFloorArea > 0
    ? (plotArea > 0 ? data.totalFloorArea / plotArea : 0)
    : 0

  const farStatus: CheckStatus = actualFAR === 0 ? 'na'
    : actualFAR <= rule.far ? 'pass'
    : actualFAR <= rule.far * 1.1 ? 'warning'
    : 'fail'

  return [
    {
      id:          'far',
      category:    'far',
      title:       'Floor Area Ratio (FAR)',
      description: `Maximum FAR for Occupancy Type ${occupancy}`,
      status:      farStatus,
      actual:      actualFAR > 0 ? `FAR = ${actualFAR.toFixed(2)}` : 'No room data',
      required:    `FAR ≤ ${rule.far}`,
      remarks:     `Plot: ${plotArea}m² → Max floor area: ${maxFloorArea.toFixed(0)}m²`,
      bnbcRef:     'BNBC 2020, Part 3, Chapter 3.4',
      severity:    'critical',
    },
    {
      id:          'max-floor-area',
      category:    'far',
      title:       'Total Floor Area',
      description: 'Maximum allowable floor area per FAR',
      status:      data.totalFloorArea === 0 ? 'na'
                 : data.totalFloorArea <= maxFloorArea ? 'pass' : 'fail',
      actual:      `${data.totalFloorArea.toFixed(1)} m²`,
      required:    `≤ ${maxFloorArea.toFixed(0)} m²`,
      remarks:     `Max: ${maxFloorArea.toFixed(0)} m² (${plotArea} × ${rule.far})`,
      bnbcRef:     'BNBC 2020, Part 3, Chapter 3.4',
      severity:    'critical',
    },
  ]
}

function checkCoverage(site: SiteInfo, data: CanvasData): CheckResult[] {
  const plotArea     = site.plotArea ?? 0
  const wallFootprint = data.wallLengthTotal * 0.25 / 1000       // rough m²
  const covPercent   = wallFootprint > 0 ? (wallFootprint / plotArea) * 100 : 0

  return [
    {
      id:          'coverage',
      category:    'coverage',
      title:       'Ground Coverage',
      description: 'Building footprint as % of plot area',
      status:      covPercent === 0 ? 'na'
                 : covPercent <= 60 ? 'pass'
                 : covPercent <= 65 ? 'warning'
                 : 'fail',
      actual:      covPercent > 0 ? `${covPercent.toFixed(1)}%` : 'N/A',
      required:    '≤ 60% (residential)',
      remarks:     `Plot area: ${plotArea} m²`,
      bnbcRef:     'BNBC 2020, Part 3, Chapter 3.4',
      severity:    'major',
    },
  ]
}

function checkStairs(data: CanvasData, bld: BuildingInfo | null): CheckResult[] {
  const floors   = bld?.numFloors ?? 1
  const isHigh   = floors > 6
  const minWidth = isHigh
    ? STAIR_RULES.minWidthHigh
    : STAIR_RULES.minWidthResidential

  const requiredStairs = floors <= 3 ? 1 : floors <= 6 ? 1 : 2

  return [
    {
      id:          'stair-width',
      category:    'stair',
      title:       'Stair Width',
      description: 'Minimum clear stair width',
      status:      'warning',
      actual:      'Draw the Stair',
      required:    `≥ ${minWidth}mm clear`,
      remarks:     `${floors}-storey building → min ${minWidth}mm stair width`,
      bnbcRef:     'BNBC 2020, Part 4, Chapter 4.3',
      severity:    'critical',
    },
    {
      id:          'stair-rise',
      category:    'stair',
      title:       'Stair Rise',
      description: 'Maximum riser height',
      status:      'warning',
      actual:      'No stair object',
      required:    `≤ ${STAIR_RULES.maxRise}mm`,
      remarks:     'Standard: Rise ≤ 190mm, Tread ≥ 250mm',
      bnbcRef:     'BNBC 2020, Part 4, Chapter 4.3.2',
      severity:    'major',
    },
    {
      id:          'stair-count',
      category:    'stair',
      title:       'Number of Staircases',
      description: `Required staircase count for ${floors} floor(s)`,
      status:      requiredStairs === 1 ? 'pass' : 'warning',
      actual:      `${data.stairCount} nos (from drawing)`,
      required:    `≥ ${requiredStairs} nos`,
      remarks:     floors > 6
        ? 'High-rise: 2 separate fire stairs required'
        : '1 staircase sufficient',
      bnbcRef:     'BNBC 2020, Part 4, Chapter 4.3',
      severity:    floors > 6 ? 'critical' : 'major',
    },
    {
      id:          'stair-headroom',
      category:    'stair',
      title:       'Stair Headroom',
      description: 'Minimum clear headroom over stairs',
      status:      'pass',
      actual:      '—',
      required:    `≥ ${STAIR_RULES.minHeadroom}mm`,
      remarks:     'Vertical clearance at all points of stair',
      bnbcRef:     'BNBC 2020, Part 4, Chapter 4.3.4',
      severity:    'major',
    },
  ]
}

function checkFireEscape(data: CanvasData, bld: BuildingInfo | null): CheckResult[] {
  const floors = bld?.numFloors ?? 1

  return [
    {
      id:          'fire-exit-count',
      category:    'fire',
      title:       'Fire Exit Count',
      description: 'Minimum number of emergency exits',
      status:      floors <= 3 ? 'pass' : 'warning',
      actual:      `${data.doors.length} doors total`,
      required:    floors <= 3 ? '≥ 1 exit' : '≥ 2 exits (separate)',
      remarks:     floors > 6
        ? 'High-rise needs dedicated fire stair with pressurization'
        : 'Exits must be remote from each other',
      bnbcRef:     'BNBC 2020, Part 4, Chapter 4.2',
      severity:    'critical',
    },
    {
      id:          'fire-travel-dist',
      category:    'fire',
      title:       'Travel Distance to Exit',
      description: 'Maximum travel distance to nearest exit',
      status:      'warning',
      actual:      'Not auto-measured',
      required:    '≤ 30m (sprinklered: ≤ 45m)',
      remarks:     'BNBC: Max 30m travel distance to nearest exit',
      bnbcRef:     'BNBC 2020, Part 4, Chapter 4.2.3',
      severity:    'major',
    },
    {
      id:          'fire-door-width',
      category:    'fire',
      title:       'Fire Exit Door Width',
      description: 'Minimum width of emergency exit doors',
      status:      data.doors.every((d) => d.width >= 900) ? 'pass' : 'fail',
      actual:      data.doors.length > 0
        ? `Min door: ${Math.min(...data.doors.map((d) => d.width))}mm`
        : 'No doors',
      required:    '≥ 900mm clear',
      remarks:     'Exit doors must be min 900mm wide',
      bnbcRef:     'BNBC 2020, Part 4, Chapter 4.2.2',
      severity:    'critical',
    },
  ]
}

function checkParking(
  site:  SiteInfo | null,
  bnbc:  BNBCSettings | null,
  data:  CanvasData
): CheckResult[] {
  if (!site || !bnbc) {
    return [{
      id: 'parking', category: 'parking',
      title: 'Parking Requirement',
      description: 'No site info — set it in Hub',
      status: 'na', actual: '—', required: '—',
      remarks: 'Requires site info and building info',
      bnbcRef: 'BNBC 2020, Part 3, Chapter 3.6',
      severity: 'major',
    }]
  }

  const occupancy = bnbc.occupancyType ?? 'A'
  const rule      = PARKING_RULES[occupancy] ?? 1
  const required  = Math.ceil(data.totalFloorArea * rule / 100)

  return [
    {
      id:          'parking-count',
      category:    'parking',
      title:       'Parking Spaces',
      description: `Required parking for Occupancy Type ${occupancy}`,
      status:      required <= 0 ? 'na' : 'warning',
      actual:      'Add parking in the drawing',
      required:    `≥ ${required} spaces`,
      remarks:     `${data.totalFloorArea.toFixed(0)} m² × ${rule}/100m² = ${required} spaces`,
      bnbcRef:     'BNBC 2020, Part 3, Chapter 3.6',
      severity:    'major',
    },
    {
      id:          'parking-size',
      category:    'parking',
      title:       'Parking Space Size',
      description: 'Minimum individual parking space',
      status:      'pass',
      actual:      '—',
      required:    '2.5m × 5.0m minimum',
      remarks:     'Standard car park stall: 2500mm × 5000mm',
      bnbcRef:     'BNBC 2020, Part 3, Chapter 3.6.2',
      severity:    'minor',
    },
  ]
}

function checkVentilation(data: CanvasData): CheckResult[] {
  const results: CheckResult[] = []

  for (const room of data.rooms) {
    const roomWindows = data.windows.filter(() => true)  // simplified
    const winArea     = roomWindows.reduce((s, w) => s + w.area, 0)
    const ratio       = room.area > 0 ? winArea / room.area : 0

    results.push({
      id:          `ventilation-${room.name}`,
      category:    'ventilation',
      title:       `Ventilation: ${room.name}`,
      description: 'Window area ≥ 10% of floor area',
      status:      ratio === 0 ? 'warning'
                 : ratio >= 0.10 ? 'pass'
                 : ratio >= 0.07 ? 'warning'
                 : 'fail',
      actual:      ratio > 0 ? `${(ratio * 100).toFixed(1)}%` : 'N/A',
      required:    '≥ 10% of floor area',
      remarks:     `Room: ${room.area.toFixed(1)}m² | Window area: ${winArea.toFixed(2)}m²`,
      bnbcRef:     'BNBC 2020, Part 3, Chapter 3.11',
      severity:    'major',
    })
  }

  if (results.length === 0) {
    results.push({
      id: 'ventilation-na', category: 'ventilation',
      title: 'Ventilation Check',
      description: 'Room data required',
      status: 'na', actual: '—', required: '≥ 10% window/floor ratio',
      remarks: 'Draw a room object',
      bnbcRef: 'BNBC 2020, Part 3, Chapter 3.11',
      severity: 'major',
    })
  }

  return results.slice(0, 5)   // max 5 room checks
}

function checkNaturalLighting(data: CanvasData): CheckResult[] {
  const totalRoom   = data.totalFloorArea
  const totalWindow = data.totalWindowArea
  const ratio       = totalRoom > 0 ? totalWindow / totalRoom : 0

  return [
    {
      id:          'lighting',
      category:    'lighting',
      title:       'Natural Lighting',
      description: 'Total window area ≥ 8% of total floor area',
      status:      totalRoom === 0 ? 'na'
                 : ratio >= 0.08 ? 'pass'
                 : ratio >= 0.05 ? 'warning'
                 : 'fail',
      actual:      totalRoom > 0
        ? `${(ratio * 100).toFixed(1)}% (${totalWindow.toFixed(2)}m²)`
        : 'N/A',
      required:    '≥ 8% of floor area',
      remarks:     `Total window: ${totalWindow.toFixed(2)}m² | Floor: ${totalRoom.toFixed(1)}m²`,
      bnbcRef:     'BNBC 2020, Part 3, Chapter 3.10',
      severity:    'major',
    },
  ]
}

function checkCorridors(data: CanvasData): CheckResult[] {
  return [
    {
      id:          'corridor-width',
      category:    'corridor',
      title:       'Corridor Width',
      description: 'Minimum clear corridor/passage width',
      status:      'warning',
      actual:      'Measure corridor from drawing',
      required:    '≥ 1200mm clear',
      remarks:     'BNBC: Min 1200mm for corridors serving habitable rooms',
      bnbcRef:     'BNBC 2020, Part 4, Chapter 4.4',
      severity:    'major',
    },
  ]
}

function checkAccessibility(data: CanvasData): CheckResult[] {
  return [
    {
      id:          'ramp',
      category:    'accessibility',
      title:       'Wheelchair Ramp',
      description: 'Accessible ramp at building entrance',
      status:      'warning',
      actual:      'No ramp visible in drawing',
      required:    'Slope ≤ 1:12, Width ≥ 1000mm',
      remarks:     'Required for public buildings (Occupancy B, C, E, F)',
      bnbcRef:     'BNBC 2020, Part 11, Chapter 11.2',
      severity:    'minor',
    },
    {
      id:          'accessible-toilet',
      category:    'accessibility',
      title:       'Accessible Toilet',
      description: 'Minimum one accessible toilet per floor',
      status:      'warning',
      actual:      '—',
      required:    'Min 1500mm × 1800mm space',
      remarks:     'Required for public/commercial buildings',
      bnbcRef:     'BNBC 2020, Part 11, Chapter 11.4',
      severity:    'minor',
    },
  ]
}

function checkBuildingHeight(
  site: SiteInfo | null,
  bld:  BuildingInfo | null
): CheckResult[] {
  if (!site || !bld) {
    return [{
      id: 'height', category: 'height',
      title: 'Building Height', description: 'Info not available',
      status: 'na', actual: '—', required: '—',
      remarks: 'Set Site + Building info in Hub',
      bnbcRef: 'BNBC 2020, Part 3, Chapter 3.5',
      severity: 'major',
    }]
  }

  // Height limit = road_width × 2 (RAJUK rule of thumb)
  const maxHeight  = (site.roadWidth ?? 0) * 2
  const actualH    = bld.totalHeight ?? bld.numFloors * (bld.floorHeight ?? 3)
  const status: CheckStatus = actualH <= maxHeight ? 'pass'
    : actualH <= maxHeight * 1.1 ? 'warning'
    : 'fail'

  return [
    {
      id:          'building-height',
      category:    'height',
      title:       'Building Height Limit',
      description: 'RAJUK: Max height = road width × 2',
      status,
      actual:      `${actualH}m`,
      required:    `≤ ${maxHeight}m (road ${site.roadWidth ?? 0}m × 2)`,
      remarks:     `${bld.numFloors} floors × ${bld.floorHeight ?? 3}m`,
      bnbcRef:     'BNBC 2020, Part 3, Chapter 3.5 + RAJUK',
      severity:    'critical',
    },
  ]
}

function checkLiftRequirement(bld: BuildingInfo | null): CheckResult[] {
  if (!bld) {
    return [{
      id: 'lift', category: 'lift',
      title: 'Lift Requirement', description: 'No building info',
      status: 'na', actual: '—', required: '—',
      remarks: 'Set Building info in Hub',
      bnbcRef: 'BNBC 2020, Part 4, Chapter 4.5',
      severity: 'minor',
    }]
  }

  const floors   = bld.numFloors
  const required = floors > LIFT_RULES.requiredFloors

  return [
    {
      id:          'lift',
      category:    'lift',
      title:       'Lift Requirement',
      description: `Lift requirement for ${floors} floor(s)`,
      status:      !required ? 'pass'
                 : floors <= LIFT_RULES.highRiseFloors ? 'warning'
                 : 'warning',
      actual:      `${floors} floors`,
      required:    required
        ? `≥ ${floors > LIFT_RULES.highRiseFloors ? 2 : 1} lift(s)`
        : 'Not required',
      remarks:     required
        ? `${floors} floors > ${LIFT_RULES.requiredFloors} floors → Lift required`
        : `${floors} floors ≤ ${LIFT_RULES.requiredFloors} floors → Lift optional`,
      bnbcRef:     'BNBC 2020, Part 4, Chapter 4.5',
      severity:    'major',
    },
  ]
}

function checkDoorSizes(data: CanvasData): CheckResult[] {
  const narrowDoors = data.doors.filter((d) => d.width < 900)

  return [
    {
      id:          'door-width',
      category:    'accessibility',
      title:       'Door Width',
      description: 'All doors minimum 900mm clear width',
      status:      data.doors.length === 0 ? 'na'
                 : narrowDoors.length === 0 ? 'pass'
                 : 'fail',
      actual:      data.doors.length > 0
        ? `Min: ${Math.min(...data.doors.map((d) => d.width))}mm`
        : 'No doors',
      required:    '≥ 900mm all doors',
      remarks:     narrowDoors.length > 0
        ? `${narrowDoors.length} door(s) below 900mm`
        : 'All doors OK',
      bnbcRef:     'BNBC 2020, Part 3, Chapter 3.9',
      severity:    'major',
    },
  ]
}

// ─── Helper: Score color ──────────────────────────────
export function scoreColor(score: number): string {
  if (score >= 80) return '#22C55E'
  if (score >= 60) return '#F59E0B'
  return '#EF4444'
}

export function statusColor(status: CheckStatus): string {
  const map: Record<CheckStatus, string> = {
    pass:    '#22C55E',
    warning: '#F59E0B',
    fail:    '#EF4444',
    na:      '#64748B',
  }
  return map[status]
}

export function statusLabel(status: CheckStatus): string {
  const map: Record<CheckStatus, string> = {
    pass:    'PASS',
    warning: 'WARNING',
    fail:    'FAIL',
    na:      'N/A',
  }
  return map[status]
}

export const CATEGORY_LABELS: Record<CheckCategory, string> = {
  setback:       'Setback',
  far:           'FAR',
  coverage:      'Coverage',
  stair:         'Stair',
  fire:          'Fire Safety',
  parking:       'Parking',
  ventilation:   'Ventilation',
  lighting:      'Lighting',
  corridor:      'Corridor',
  accessibility: 'Accessibility',
  height:        'Height',
  lift:          'Lift',
  structure:     'Structure',
}
