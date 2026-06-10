import { fabric } from 'fabric'
import { getBIMMeta } from '@/lib/bimObjects'
import type { WallProps, DoorProps, WindowProps, ColumnProps, RoomProps } from '@/types'

// ─── Quantity Item ────────────────────────────────────
export interface QuantityItem {
  slNo:        number
  description: string
  unit:        string
  length:      number     // m
  breadth:     number     // m
  height:      number     // m
  nos:         number
  quantity:    number     // computed
  deduction:   number     // deducted qty
  netQuantity: number     // quantity - deduction
  rate?:       number     // optional unit rate (BDT)
  amount?:     number     // rate × netQuantity
  remarks:     string
  category:    QuantityCategory
}

export type QuantityCategory =
  | 'earthwork'
  | 'concrete'
  | 'masonry'
  | 'rcc'
  | 'finishing'
  | 'doors_windows'
  | 'plumbing'
  | 'electrical'
  | 'misc'

// ─── Full BOQ ─────────────────────────────────────────
export interface BOQData {
  projectId:   string
  floorId:     string
  generatedAt: string
  items:       QuantityItem[]
  summary:     BOQSummary
}

export interface BOQSummary {
  // Masonry
  brickWallArea:       number   // m²
  brickWallVolume:     number   // m³
  rccWallArea:         number   // m²
  partitionWallArea:   number   // m²

  // Concrete / RCC
  slabArea:            number   // m²
  slabVolume:          number   // m³ (assumed 125mm thick)
  columnConcrete:      number   // m³
  beamConcrete:        number   // m³ (estimated)

  // Openings
  totalDoorArea:       number   // m²
  totalWindowArea:     number   // m²
  totalOpeningArea:    number   // m² (doors + windows)

  // Floor
  floorFinishArea:     number   // m²
  carpetArea:          number   // m² (room areas)
  builtUpArea:         number   // m² (rooms + walls)

  // Plaster
  internalPlasterArea: number   // m²
  externalPlasterArea: number   // m²

  // Counts
  doorCount:           number
  windowCount:         number
  columnCount:         number
}

// ─── Main Extractor ───────────────────────────────────
export function extractQuantities(
  canvas:      fabric.Canvas,
  floorId:     string,
  projectId:   string,
  floorHeight: number = 3.0  // m
): BOQData {

  const objects = canvas.getObjects().filter(
    (o: any) => o.__isBIM === true
  )

  // Accumulators
  let brickWallLen   = 0   // mm
  let rccWallLen     = 0
  let partitionLen   = 0

  let brickWallThick = 250  // mm default
  let rccWallThick   = 200

  let slabArea       = 0   // mm²
  let carpetArea     = 0   // m²

  let totalDoorArea  = 0   // m²
  let totalWinArea   = 0   // m²

  let doorCount      = 0
  let windowCount    = 0
  let columnCount    = 0

  let columnVol      = 0   // m³

  const items: QuantityItem[] = []
  let slNo = 1

  for (const obj of objects) {
    const meta = getBIMMeta(obj)
    if (!meta) continue

    const bounds = obj.getBoundingRect()

    // ── WALLS ──────────────────────────────────────
    if (meta.__objectType === 'wall') {
      const p   = meta.__props as WallProps
      const len = Math.max(bounds.width, bounds.height)  // px = mm at 1:1

      if (p.type === 'brick') {
        brickWallLen  += len
        brickWallThick = p.thickness
      } else if (p.type === 'rcc') {
        rccWallLen   += len
        rccWallThick  = p.thickness
      } else if (p.type === 'partition') {
        partitionLen += len
      }
    }

    // ── ROOMS (slab + floor area) ──────────────────
    if (meta.__objectType === 'room') {
      const p   = meta.__props as RoomProps
      carpetArea += p.area
      slabArea   += p.area * 1_000_000   // m² → mm²
    }

    // ── DOORS ──────────────────────────────────────
    if (meta.__objectType === 'door') {
      const p   = meta.__props as DoorProps
      const area = (p.width * p.height) / 1_000_000  // m²
      totalDoorArea += area
      doorCount++
    }

    // ── WINDOWS ────────────────────────────────────
    if (meta.__objectType === 'window') {
      const p    = meta.__props as WindowProps
      const area = (p.width * p.height) / 1_000_000
      totalWinArea += area
      windowCount++
    }

    // ── COLUMNS ────────────────────────────────────
    if (meta.__objectType === 'column') {
      const p = meta.__props as ColumnProps
      columnCount++
      let secArea: number
      if (p.shape === 'circular') {
        const r = (p.diameter ?? p.width) / 2 / 1000  // m
        secArea = Math.PI * r * r
      } else {
        secArea = (p.width / 1000) * (p.depth / 1000)  // m²
      }
      columnVol += secArea * floorHeight
    }
  }

  // ── Convert to meters ─────────────────────────────
  const bWallLenM   = brickWallLen   / 1000
  const rWallLenM   = rccWallLen     / 1000
  const partLenM    = partitionLen   / 1000
  const bThickM     = brickWallThick / 1000
  const rThickM     = rccWallThick   / 1000
  const slabAreaM2  = slabArea       / 1_000_000

  // ── Wall areas (gross) ────────────────────────────
  const bWallAreaGross  = bWallLenM * floorHeight
  const rWallAreaGross  = rWallLenM * floorHeight
  const partAreaGross   = partLenM  * floorHeight

  // ── Deductions (openings in brick walls) ──────────
  const bWallDeduction  = totalDoorArea + totalWinArea

  // ── Net masonry area ──────────────────────────────
  const bWallAreaNet    = Math.max(0, bWallAreaGross - bWallDeduction)

  // ── Volumes ───────────────────────────────────────
  const bWallVolume     = bWallAreaNet  * bThickM
  const rWallVolume     = rWallAreaGross * rThickM
  const slabVolume      = slabAreaM2    * 0.125    // 125mm slab
  const builtUpArea     = carpetArea + (bWallLenM * bThickM) + (rWallLenM * rThickM)

  // ── Plaster areas ─────────────────────────────────
  const internalPlaster = bWallAreaNet * 2   // both sides
  const externalPlaster = bWallAreaGross     // one side external

  // ── Build BOQ Items ───────────────────────────────

  // 1. Brick masonry
  if (bWallLenM > 0) {
    items.push({
      slNo:        slNo++,
      description: '1st class brick masonry in cement mortar (1:4)',
      unit:        'm³',
      length:      Number(bWallLenM.toFixed(2)),
      breadth:     bThickM,
      height:      floorHeight,
      nos:         1,
      quantity:    Number((bWallLenM * bThickM * floorHeight).toFixed(2)),
      deduction:   Number((bWallDeduction * bThickM).toFixed(2)),
      netQuantity: Number(bWallVolume.toFixed(2)),
      remarks:     'Brick wall — net of door/window openings',
      category:    'masonry',
    })
  }

  // 2. RCC wall
  if (rWallLenM > 0) {
    items.push({
      slNo:        slNo++,
      description: 'RCC wall (M20 grade)',
      unit:        'm³',
      length:      Number(rWallLenM.toFixed(2)),
      breadth:     rThickM,
      height:      floorHeight,
      nos:         1,
      quantity:    Number(rWallVolume.toFixed(2)),
      deduction:   0,
      netQuantity: Number(rWallVolume.toFixed(2)),
      remarks:     'RCC shear wall',
      category:    'rcc',
    })
  }

  // 3. RCC slab
  if (slabAreaM2 > 0) {
    items.push({
      slNo:        slNo++,
      description: 'RCC flat slab (M20, t=125mm)',
      unit:        'm³',
      length:      Number(Math.sqrt(slabAreaM2).toFixed(2)),
      breadth:     Number(Math.sqrt(slabAreaM2).toFixed(2)),
      height:      0.125,
      nos:         1,
      quantity:    Number(slabVolume.toFixed(2)),
      deduction:   0,
      netQuantity: Number(slabVolume.toFixed(2)),
      remarks:     `Slab area = ${slabAreaM2.toFixed(2)} m²`,
      category:    'rcc',
    })
  }

  // 4. RCC columns
  if (columnCount > 0) {
    items.push({
      slNo:        slNo++,
      description: 'RCC columns (M25 grade)',
      unit:        'm³',
      length:      0,
      breadth:     0,
      height:      floorHeight,
      nos:         columnCount,
      quantity:    Number(columnVol.toFixed(2)),
      deduction:   0,
      netQuantity: Number(columnVol.toFixed(2)),
      remarks:     `${columnCount} nos columns`,
      category:    'rcc',
    })
  }

  // 5. Cement plaster (internal)
  if (internalPlaster > 0) {
    items.push({
      slNo:        slNo++,
      description: 'Cement plaster 12mm thick (1:4) internal',
      unit:        'm²',
      length:      0,
      breadth:     0,
      height:      0,
      nos:         1,
      quantity:    Number((bWallAreaGross * 2).toFixed(2)),
      deduction:   Number((bWallDeduction * 2).toFixed(2)),
      netQuantity: Number(internalPlaster.toFixed(2)),
      remarks:     'Both faces of brick wall',
      category:    'finishing',
    })
  }

  // 6. Floor finish
  if (carpetArea > 0) {
    items.push({
      slNo:        slNo++,
      description: 'Floor finish (ceramic tile 600×600mm)',
      unit:        'm²',
      length:      0,
      breadth:     0,
      height:      0,
      nos:         1,
      quantity:    Number(carpetArea.toFixed(2)),
      deduction:   0,
      netQuantity: Number(carpetArea.toFixed(2)),
      remarks:     `${carpetArea.toFixed(2)} m² carpet area`,
      category:    'finishing',
    })
  }

  // 7. Doors
  if (doorCount > 0) {
    items.push({
      slNo:        slNo++,
      description: 'Wooden door with frame & fittings',
      unit:        'nos',
      length:      0,
      breadth:     0,
      height:      0,
      nos:         doorCount,
      quantity:    doorCount,
      deduction:   0,
      netQuantity: doorCount,
      remarks:     `Total door area = ${totalDoorArea.toFixed(2)} m²`,
      category:    'doors_windows',
    })
  }

  // 8. Windows
  if (windowCount > 0) {
    items.push({
      slNo:        slNo++,
      description: 'Aluminum sliding window with glass',
      unit:        'nos',
      length:      0,
      breadth:     0,
      height:      0,
      nos:         windowCount,
      quantity:    windowCount,
      deduction:   0,
      netQuantity: windowCount,
      remarks:     `Total window area = ${totalWinArea.toFixed(2)} m²`,
      category:    'doors_windows',
    })
  }

  // 9. Partition wall
  if (partLenM > 0) {
    items.push({
      slNo:        slNo++,
      description: 'Lightweight partition wall (100mm)',
      unit:        'm²',
      length:      Number(partLenM.toFixed(2)),
      breadth:     0,
      height:      floorHeight,
      nos:         1,
      quantity:    Number((partLenM * floorHeight).toFixed(2)),
      deduction:   0,
      netQuantity: Number((partLenM * floorHeight).toFixed(2)),
      remarks:     'Partition wall',
      category:    'masonry',
    })
  }

  const summary: BOQSummary = {
    brickWallArea:       Number(bWallAreaGross.toFixed(2)),
    brickWallVolume:     Number(bWallVolume.toFixed(2)),
    rccWallArea:         Number(rWallAreaGross.toFixed(2)),
    partitionWallArea:   Number((partLenM * floorHeight).toFixed(2)),
    slabArea:            Number(slabAreaM2.toFixed(2)),
    slabVolume:          Number(slabVolume.toFixed(2)),
    columnConcrete:      Number(columnVol.toFixed(2)),
    beamConcrete:        Number((slabAreaM2 * 0.04).toFixed(2)),  // estimated 4%
    totalDoorArea:       Number(totalDoorArea.toFixed(2)),
    totalWindowArea:     Number(totalWinArea.toFixed(2)),
    totalOpeningArea:    Number((totalDoorArea + totalWinArea).toFixed(2)),
    floorFinishArea:     Number(carpetArea.toFixed(2)),
    carpetArea:          Number(carpetArea.toFixed(2)),
    builtUpArea:         Number(builtUpArea.toFixed(2)),
    internalPlasterArea: Number(internalPlaster.toFixed(2)),
    externalPlasterArea: Number(externalPlaster.toFixed(2)),
    doorCount,
    windowCount,
    columnCount,
  }

  return {
    projectId,
    floorId,
    generatedAt: new Date().toISOString(),
    items,
    summary,
  }
}

// ─── Export BOQ as CSV ────────────────────────────────
export function exportBOQCSV(boq: BOQData): string {
  const header = [
    'Sl.No', 'Description', 'Unit',
    'Length(m)', 'Breadth(m)', 'Height(m)', 'Nos',
    'Quantity', 'Deduction', 'Net Qty',
    'Rate(BDT)', 'Amount(BDT)', 'Remarks'
  ].join(',')

  const rows = boq.items.map((item) =>
    [
      item.slNo,
      `"${item.description}"`,
      item.unit,
      item.length   || '',
      item.breadth  || '',
      item.height   || '',
      item.nos,
      item.quantity,
      item.deduction,
      item.netQuantity,
      item.rate    ?? '',
      item.amount  ?? '',
      `"${item.remarks}"`,
    ].join(',')
  )

  return [header, ...rows].join('\n')
}

// ─── Export BOQ as JSON (for Estimating App) ──────────
export function exportBOQJSON(boq: BOQData): string {
  return JSON.stringify(
    { version: '1.0', source: 'CivilOS-Architectural', ...boq },
    null,
    2
  )
}

// ─── Firestore path (Estimating App reads here) ───────
export function getBOQFirestorePath(projectId: string, floorId: string): string {
  return `projects/${projectId}/boq/${floorId}`
}

// ─── Category labels ──────────────────────────────────
export const CATEGORY_LABELS: Record<QuantityCategory, string> = {
  earthwork:     'Earthwork',
  concrete:      'Plain Concrete',
  masonry:       'Masonry Work',
  rcc:           'RCC Work',
  finishing:     'Finishing Work',
  doors_windows: 'Doors & Windows',
  plumbing:      'Plumbing',
  electrical:    'Electrical',
  misc:          'Miscellaneous',
}

export const CATEGORY_COLORS: Record<QuantityCategory, string> = {
  earthwork:     '#92400E',
  concrete:      '#94A3B8',
  masonry:       '#78716C',
  rcc:           '#EF4444',
  finishing:     '#8B5CF6',
  doors_windows: '#F59E0B',
  plumbing:      '#00B4D8',
  electrical:    '#F59E0B',
  misc:          '#64748B',
}

// ─── Format number ────────────────────────────────────
export function fNum(n: number, decimals = 2): string {
  return n.toFixed(decimals)
}

export function fBDT(n: number): string {
  return `৳ ${n.toLocaleString('en-BD')}`
}
