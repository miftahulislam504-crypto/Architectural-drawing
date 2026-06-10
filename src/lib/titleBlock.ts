import { fabric } from 'fabric'

// ─── Sheet Sizes (mm) ─────────────────────────────────
export const SHEET_SIZES = {
  A0: { width: 1189, height: 841  },
  A1: { width: 841,  height: 594  },
  A2: { width: 594,  height: 420  },
  A3: { width: 420,  height: 297  },
  A4: { width: 297,  height: 210  },
} as const

export type SheetSize = keyof typeof SHEET_SIZES

// ─── Drawing Scales ───────────────────────────────────
export const SCALES = [
  '1:10', '1:20', '1:25', '1:50',
  '1:100', '1:200', '1:500', '1:1000',
] as const

export type DrawingScale = typeof SCALES[number]

// ─── Title Block Data ─────────────────────────────────
export interface TitleBlockData {
  projectName:    string
  projectNumber:  string
  projectAddress: string
  clientName:     string
  drawnBy:        string
  checkedBy:      string
  approvedBy:     string
  drawingTitle:   string
  drawingNumber:  string
  revision:       string
  date:           string
  scale:          DrawingScale
  sheetSize:      SheetSize
  sheetNumber:    string
  totalSheets:    string
  firmName:       string
  firmAddress:    string
  firmPhone:      string
}

export const DEFAULT_TITLE_BLOCK: TitleBlockData = {
  projectName:    'Project Name',
  projectNumber:  'PN-001',
  projectAddress: 'Dhaka, Bangladesh',
  clientName:     'Client Name',
  drawnBy:        '',
  checkedBy:      '',
  approvedBy:     '',
  drawingTitle:   'Ground Floor Plan',
  drawingNumber:  'A-101',
  revision:       'A',
  date:           new Date().toLocaleDateString('en-GB'),
  scale:          '1:100',
  sheetSize:      'A1',
  sheetNumber:    '01',
  totalSheets:    '10',
  firmName:       'CivilOS Design Studio',
  firmAddress:    'Dhaka, Bangladesh',
  firmPhone:      '+880 1XXX-XXXXXX',
}

// ─── Generate Title Block on Canvas ──────────────────
export function generateTitleBlock(
  canvas:    fabric.Canvas,
  data:      TitleBlockData,
  canvasScale: number = 0.5   // px per mm at current view
): fabric.Group {
  // Remove existing title block
  const existing = canvas.getObjects().filter(
    (o: any) => o.__isTitleBlock
  )
  existing.forEach((o) => canvas.remove(o))

  const sheet  = SHEET_SIZES[data.sheetSize]
  const W      = sheet.width  * canvasScale
  const H      = sheet.height * canvasScale
  const TBH    = 60 * canvasScale   // title block height
  const MARGIN = 5  * canvasScale

  const objects: fabric.Object[] = []
  const TXT    = '#0D0F12'         // dark text on white
  const LINE   = '#1a1a2e'
  const BG     = '#FFFFFF'
  const ACCENT = '#00B4D8'

  // ── Sheet border ───────────────────────────────────
  // Outer border
  objects.push(new fabric.Rect({
    left: 0, top: 0, width: W, height: H,
    fill: BG, stroke: LINE, strokeWidth: 2 * canvasScale,
    selectable: false, evented: false,
  }))

  // Inner margin border
  const M = 10 * canvasScale
  objects.push(new fabric.Rect({
    left: M, top: M, width: W - M * 2, height: H - M * 2,
    fill: 'transparent', stroke: LINE, strokeWidth: 0.8 * canvasScale,
    selectable: false, evented: false,
  }))

  // ── Title block at bottom ──────────────────────────
  const TBY = H - TBH - M   // top of title block
  const TBW = W - M * 2

  // Title block background
  objects.push(new fabric.Rect({
    left: M, top: TBY, width: TBW, height: TBH,
    fill: '#F8FAFC', stroke: LINE, strokeWidth: 0.8 * canvasScale,
    selectable: false, evented: false,
  }))

  // Accent bar at top of title block
  objects.push(new fabric.Rect({
    left: M, top: TBY, width: TBW, height: 3 * canvasScale,
    fill: ACCENT, stroke: 'none',
    selectable: false, evented: false,
  }))

  // ── Column divisions ───────────────────────────────
  const col1 = TBW * 0.35   // Project info
  const col2 = TBW * 0.25   // Drawing info
  const col3 = TBW * 0.20   // Signatures
  const col4 = TBW * 0.20   // Sheet info

  // Vertical dividers
  ;[col1, col1 + col2, col1 + col2 + col3].forEach((x) => {
    objects.push(new fabric.Line(
      [M + x, TBY, M + x, TBY + TBH],
      { stroke: LINE, strokeWidth: 0.5 * canvasScale, selectable: false, evented: false }
    ))
  })

  // ── Firm name / logo area ─────────────────────────
  objects.push(makeText(
    data.firmName, M + col1 * 0.5, TBY + 8 * canvasScale,
    12 * canvasScale, TXT, 'Rajdhani', '700', canvasScale
  ))
  objects.push(makeText(
    data.firmAddress, M + col1 * 0.5, TBY + 20 * canvasScale,
    7 * canvasScale, '#64748B', 'DM Sans', '400', canvasScale
  ))
  objects.push(makeText(
    data.firmPhone, M + col1 * 0.5, TBY + 28 * canvasScale,
    7 * canvasScale, '#64748B', 'DM Sans', '400', canvasScale
  ))

  // Project info
  objects.push(makeText(
    'PROJECT', M + col1 * 0.5, TBY + 38 * canvasScale,
    6 * canvasScale, '#94A3B8', 'DM Sans', '400', canvasScale
  ))
  objects.push(makeText(
    data.projectName, M + col1 * 0.5, TBY + 46 * canvasScale,
    9 * canvasScale, TXT, 'Rajdhani', '600', canvasScale
  ))

  // ── Drawing info column ────────────────────────────
  const c2x = M + col1 + col2 * 0.5

  objects.push(makeText(
    'DRAWING TITLE', c2x, TBY + 8 * canvasScale,
    6 * canvasScale, '#94A3B8', 'DM Sans', '400', canvasScale
  ))
  objects.push(makeText(
    data.drawingTitle, c2x, TBY + 18 * canvasScale,
    10 * canvasScale, TXT, 'Rajdhani', '600', canvasScale
  ))

  // Scale & date
  objects.push(makeText(
    `SCALE: ${data.scale}`, c2x, TBY + 38 * canvasScale,
    7 * canvasScale, TXT, 'JetBrains Mono', '400', canvasScale
  ))
  objects.push(makeText(
    `DATE: ${data.date}`, c2x, TBY + 48 * canvasScale,
    7 * canvasScale, TXT, 'JetBrains Mono', '400', canvasScale
  ))

  // ── Signatures column ──────────────────────────────
  const c3x = M + col1 + col2 + col3 * 0.5

  ;[
    { label: 'DRAWN BY', value: data.drawnBy,   y: 12 },
    { label: 'CHECKED BY', value: data.checkedBy, y: 28 },
    { label: 'APPROVED BY', value: data.approvedBy, y: 44 },
  ].forEach(({ label, value, y }) => {
    objects.push(makeText(
      label, c3x, TBY + y * canvasScale,
      5.5 * canvasScale, '#94A3B8', 'DM Sans', '400', canvasScale
    ))
    objects.push(makeText(
      value || '________________',
      c3x, TBY + (y + 8) * canvasScale,
      7 * canvasScale, TXT, 'JetBrains Mono', '400', canvasScale
    ))
    // Horizontal divider
    objects.push(new fabric.Line(
      [M + col1 + col2, TBY + (y + 16) * canvasScale, M + col1 + col2 + col3, TBY + (y + 16) * canvasScale],
      { stroke: '#E2E8F0', strokeWidth: 0.5 * canvasScale, selectable: false, evented: false }
    ))
  })

  // ── Sheet info column ──────────────────────────────
  const c4x = M + col1 + col2 + col3 + col4 * 0.5

  objects.push(makeText(
    'DRAWING NO', c4x, TBY + 8 * canvasScale,
    6 * canvasScale, '#94A3B8', 'DM Sans', '400', canvasScale
  ))
  objects.push(makeText(
    data.drawingNumber, c4x, TBY + 18 * canvasScale,
    14 * canvasScale, ACCENT, 'Rajdhani', '700', canvasScale
  ))

  objects.push(makeText(
    'REVISION', c4x, TBY + 34 * canvasScale,
    6 * canvasScale, '#94A3B8', 'DM Sans', '400', canvasScale
  ))
  objects.push(makeText(
    data.revision, c4x, TBY + 43 * canvasScale,
    11 * canvasScale, TXT, 'Rajdhani', '600', canvasScale
  ))

  objects.push(makeText(
    `SHEET ${data.sheetNumber} / ${data.totalSheets}`,
    c4x, TBY + 53 * canvasScale,
    7 * canvasScale, TXT, 'JetBrains Mono', '400', canvasScale
  ))

  // ── Group & tag ────────────────────────────────────
  const group = new fabric.Group(objects, {
    left: 20, top: 20,
    selectable: false,
    evented:    false,
  }) as any
  group.__isTitleBlock = true

  canvas.add(group)
  canvas.sendToBack(group)
  canvas.renderAll()

  return group
}

// ─── Helper ───────────────────────────────────────────
function makeText(
  text:       string,
  cx:         number,
  cy:         number,
  fontSize:   number,
  color:      string,
  font:       string,
  weight:     string,
  scale:      number
): fabric.Text {
  return new fabric.Text(text || ' ', {
    left:       cx,
    top:        cy,
    fontSize,
    fill:       color,
    fontFamily: font,
    fontWeight: weight,
    originX:    'center',
    originY:    'top',
    selectable: false,
    evented:    false,
  })
}

// ─── Revision table row ───────────────────────────────
export function addRevisionRow(
  canvas: fabric.Canvas,
  rev:    string,
  desc:   string,
  date:   string,
  by:     string
): void {
  // Find title block, add revision row above it
  // (simplified — full impl in Phase 10)
  console.log('Revision added:', { rev, desc, date, by })
}
