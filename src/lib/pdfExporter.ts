import { fabric } from 'fabric'
import type { TitleBlockData } from '@/lib/titleBlock'
import type { Floor } from '@/types'

// ─── jsPDF dynamic import ─────────────────────────────
// jsPDF is loaded via CDN in index.html or imported dynamically

export interface ExportOptions {
  sheetSize:    'A0' | 'A1' | 'A2' | 'A3' | 'A4'
  orientation:  'portrait' | 'landscape'
  scale:        string               // '1:50', '1:100' etc
  quality:      'draft' | 'standard' | 'high'
  includeTitleBlock: boolean
  includeGrid:  boolean
  includeAnnotations: boolean
  backgroundColor: string
  lineWidthScale:  number
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  sheetSize:    'A1',
  orientation:  'landscape',
  scale:        '1:100',
  quality:      'standard',
  includeTitleBlock: true,
  includeGrid:  false,
  includeAnnotations: true,
  backgroundColor: '#FFFFFF',
  lineWidthScale: 1,
}

// ─── Sheet dimensions in mm ───────────────────────────
export const SHEET_DIMS = {
  A0: { w: 1189, h: 841  },
  A1: { w: 841,  h: 594  },
  A2: { w: 594,  h: 420  },
  A3: { w: 420,  h: 297  },
  A4: { w: 297,  h: 210  },
} as const

// ─── Export canvas to PNG (base64) ────────────────────
export async function exportCanvasToPNG(
  canvas:  fabric.Canvas,
  options: ExportOptions
): Promise<string> {
  // Temporarily hide grid objects if not including
  const gridObjects = canvas.getObjects().filter(
    (o: any) => o.__isGrid || o.__isStructGrid
  )
  const titleBlocks = canvas.getObjects().filter(
    (o: any) => o.__isTitleBlock
  )

  if (!options.includeGrid) {
    gridObjects.forEach((o) => o.set({ visible: false }))
  }
  if (!options.includeTitleBlock) {
    titleBlocks.forEach((o) => o.set({ visible: false }))
  }

  // Get bounding box of all visible objects
  const visibleObjects = canvas.getObjects().filter(
    (o: any) => !o.__isGrid && !o.__isStructGrid && o.visible !== false
  )

  let left   = Infinity, top    = Infinity
  let right  = -Infinity, bottom = -Infinity

  visibleObjects.forEach((obj) => {
    const bounds = obj.getBoundingRect(true)
    left   = Math.min(left,   bounds.left)
    top    = Math.min(top,    bounds.top)
    right  = Math.max(right,  bounds.left + bounds.width)
    bottom = Math.max(bottom, bounds.top  + bounds.height)
  })

  const PADDING = 40
  left   = Math.max(0, left   - PADDING)
  top    = Math.max(0, top    - PADDING)
  right  = Math.min(canvas.getWidth(),  right  + PADDING)
  bottom = Math.min(canvas.getHeight(), bottom + PADDING)

  const multiplierMap = { draft: 1, standard: 2, high: 3 }
  const multiplier    = multiplierMap[options.quality]

  // Export to data URL
  const dataURL = canvas.toDataURL({
    format:     'png',
    quality:    1,
    multiplier,
    left,
    top,
    width:  right  - left,
    height: bottom - top,
  })

  // Restore visibility
  gridObjects.forEach((o) => o.set({ visible: true }))
  titleBlocks.forEach((o) => o.set({ visible: true }))
  canvas.renderAll()

  return dataURL
}

// ─── Export to PDF using browser print ───────────────
export async function exportToPDF(
  canvas:      fabric.Canvas,
  options:     ExportOptions,
  titleData?:  TitleBlockData,
  floorName?:  string,
  projectName?: string
): Promise<void> {
  const dataURL = await exportCanvasToPNG(canvas, options)
  const sheet   = SHEET_DIMS[options.sheetSize]

  // Open print window
  const win = window.open('', '_blank')
  if (!win) {
    alert('Popup blocked — browser-এর popup allow করুন')
    return
  }

  const cssW = options.orientation === 'landscape' ? sheet.w : sheet.h
  const cssH = options.orientation === 'landscape' ? sheet.h : sheet.w

  win.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${projectName ?? 'CivilOS'} — ${floorName ?? 'Drawing'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page {
      size: ${cssW}mm ${cssH}mm;
      margin: 0;
    }
    body {
      width: ${cssW}mm;
      height: ${cssH}mm;
      overflow: hidden;
      background: white;
      font-family: 'Arial', sans-serif;
    }
    .sheet {
      width: ${cssW}mm;
      height: ${cssH}mm;
      position: relative;
      border: 0.5mm solid #000;
    }
    .drawing-area {
      position: absolute;
      top: 5mm;
      left: 10mm;
      right: 5mm;
      bottom: ${options.includeTitleBlock ? '22mm' : '5mm'};
      overflow: hidden;
    }
    .drawing-area img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .title-block {
      position: absolute;
      bottom: 0;
      left: 10mm;
      right: 0;
      height: 20mm;
      border-top: 0.5mm solid #000;
      display: grid;
      grid-template-columns: 35% 25% 20% 20%;
    }
    .tb-cell {
      border-right: 0.3mm solid #000;
      padding: 1mm 2mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .tb-label {
      font-size: 5pt;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.5mm;
    }
    .tb-value {
      font-size: 8pt;
      font-weight: bold;
      color: #000;
    }
    .tb-accent { color: #00B4D8; font-size: 11pt; }
    .tb-bar {
      height: 1mm;
      background: #00B4D8;
      position: absolute;
      top: 0; left: 0; right: 0;
    }
    .corner-mark {
      position: absolute;
      width: 5mm; height: 5mm;
      border-color: #000;
      border-style: solid;
    }
    .corner-tl { top: 0; left: 10mm; border-width: 0.3mm 0 0 0.3mm; }
    .corner-tr { top: 0; right: 0; border-width: 0.3mm 0.3mm 0 0; }
    .corner-bl { bottom: ${options.includeTitleBlock ? '20mm' : '0'}; left: 10mm; border-width: 0 0 0.3mm 0.3mm; }
    .corner-br { bottom: ${options.includeTitleBlock ? '20mm' : '0'}; right: 0; border-width: 0 0.3mm 0.3mm 0; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="corner-mark corner-tl"></div>
    <div class="corner-mark corner-tr"></div>
    <div class="corner-mark corner-bl"></div>
    <div class="corner-mark corner-br"></div>

    <div class="drawing-area">
      <img src="${dataURL}" alt="Drawing" />
    </div>

    ${options.includeTitleBlock && titleData ? `
    <div class="title-block">
      <div class="tb-bar"></div>
      <div class="tb-cell">
        <div class="tb-label">Project</div>
        <div class="tb-value">${titleData.projectName}</div>
        <div class="tb-label" style="margin-top:1mm">Client</div>
        <div style="font-size:7pt">${titleData.clientName}</div>
      </div>
      <div class="tb-cell">
        <div class="tb-label">Drawing Title</div>
        <div class="tb-value">${titleData.drawingTitle}</div>
        <div class="tb-label" style="margin-top:1mm">Scale: ${titleData.scale}</div>
      </div>
      <div class="tb-cell">
        <div class="tb-label">Drawn</div>
        <div style="font-size:7pt">${titleData.drawnBy || '—'}</div>
        <div class="tb-label" style="margin-top:1mm">Checked</div>
        <div style="font-size:7pt">${titleData.checkedBy || '—'}</div>
        <div class="tb-label" style="margin-top:1mm">Date</div>
        <div style="font-size:7pt">${titleData.date}</div>
      </div>
      <div class="tb-cell" style="text-align:center">
        <div class="tb-label">Drawing No.</div>
        <div class="tb-accent">${titleData.drawingNumber}</div>
        <div class="tb-label" style="margin-top:1mm">Rev: ${titleData.revision}</div>
        <div style="font-size:7pt">Sheet ${titleData.sheetNumber}/${titleData.totalSheets}</div>
      </div>
    </div>
    ` : ''}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 500);
    };
  </script>
</body>
</html>
  `)
  win.document.close()
}

// ─── Export canvas as SVG ─────────────────────────────
export function exportToSVG(
  canvas:      fabric.Canvas,
  projectName: string,
  floorName:   string
): void {
  // Hide grid before export
  const grids = canvas.getObjects().filter(
    (o: any) => o.__isGrid || o.__isStructGrid
  )
  grids.forEach((o) => o.set({ visible: false }))
  canvas.renderAll()

  const svg  = canvas.toSVG()

  // Restore
  grids.forEach((o) => o.set({ visible: true }))
  canvas.renderAll()

  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${projectName}-${floorName}.svg`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Export canvas as PNG download ───────────────────
export async function exportToPNGDownload(
  canvas:      fabric.Canvas,
  options:     ExportOptions,
  projectName: string,
  floorName:   string
): Promise<void> {
  const dataURL = await exportCanvasToPNG(canvas, options)
  const a       = document.createElement('a')
  a.href        = dataURL
  a.download    = `${projectName}-${floorName}.png`
  a.click()
}

// ─── Multi-floor export ───────────────────────────────
export interface MultiFloorExportConfig {
  floors:       Floor[]
  canvases:     Record<string, fabric.Canvas>   // floorId → canvas
  titleData:    TitleBlockData
  options:      ExportOptions
  projectName:  string
}

export async function exportMultiFloor(
  config: MultiFloorExportConfig
): Promise<void> {
  // For each floor, open a print window
  // (Full multi-floor PDF requires server-side jsPDF which is Phase 10+)
  for (const floor of config.floors) {
    const canvas = config.canvases[floor.id]
    if (!canvas) continue

    await exportToPDF(
      canvas,
      config.options,
      {
        ...config.titleData,
        drawingTitle:  floor.name,
        drawingNumber: `A-${String(config.floors.indexOf(floor) + 1).padStart(3, '0')}`,
      },
      floor.name,
      config.projectName
    )

    // Small delay between windows
    await new Promise((r) => setTimeout(r, 800))
  }
}

// ─── Scale helpers ────────────────────────────────────
export function parseScale(scale: string): number {
  // '1:100' → 0.01 (mm per px)
  const parts = scale.split(':')
  if (parts.length !== 2) return 0.01
  return 1 / Number(parts[1])
}

export function getScaleLabel(scale: string): string {
  const map: Record<string, string> = {
    '1:10':   'Very large — detail drawings',
    '1:20':   'Large — detail drawings',
    '1:50':   'Medium — bathroom, kitchen',
    '1:100':  'Standard — floor plan',
    '1:200':  'Small — site plan',
    '1:500':  'Very small — master plan',
    '1:1000': 'Site overview',
  }
  return map[scale] ?? scale
}

export const EXPORT_SCALES = [
  '1:10', '1:20', '1:25', '1:50',
  '1:100', '1:200', '1:500', '1:1000',
] as const
