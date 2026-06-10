import { fabric } from 'fabric'

// ─── Enable object caching for performance ────────────
export function optimizeCanvas(canvas: fabric.Canvas): void {
  // Global fabric settings
  fabric.Object.prototype.objectCaching    = true
  fabric.Object.prototype.statefullCache   = false
  fabric.Object.prototype.noScaleCache     = true
  fabric.Object.prototype.strokeUniform    = true

  // Canvas settings
  canvas.enableRetinaScaling = true
  canvas.renderOnAddRemove   = false   // batch renders manually
  canvas.skipTargetFind      = false

  // Optimize for many objects
  canvas.perPixelTargetFind  = false
  canvas.targetFindTolerance = 4
}

// ─── Batch render (call after multiple adds) ──────────
export function batchRender(canvas: fabric.Canvas): void {
  canvas.requestRenderAll()
}

// ─── Reduce canvas resolution for pan/zoom ────────────
export function setLowRes(canvas: fabric.Canvas, low: boolean): void {
  if (low) {
    canvas.enableRetinaScaling = false
    fabric.Object.prototype.objectCaching = false
  } else {
    canvas.enableRetinaScaling = true
    fabric.Object.prototype.objectCaching = true
  }
}

// ─── Clean up orphan temp objects ────────────────────
export function cleanupTempObjects(canvas: fabric.Canvas): void {
  const temps = canvas.getObjects().filter((o: any) => o.__temp === true)
  temps.forEach((o) => canvas.remove(o))
  if (temps.length > 0) canvas.renderAll()
}

// ─── Count objects by type ────────────────────────────
export function getCanvasStats(canvas: fabric.Canvas) {
  const all     = canvas.getObjects()
  const bim     = all.filter((o: any) => o.__isBIM)
  const grids   = all.filter((o: any) => o.__isGrid || o.__isStructGrid)
  const annots  = all.filter((o: any) =>
    ['dimension', 'leader', 'callout', 'room_tag', 'door_tag',
     'window_tag', 'column_tag', 'wall_tag'].includes((o as any).__objectType)
  )

  return {
    total:       all.length,
    bim:         bim.length,
    grids:       grids.length,
    annotations: annots.length,
    other:       all.length - bim.length - grids.length - annots.length,
  }
}

// ─── PWA manifest helper ──────────────────────────────
export function registerPWA(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() => { /* SW not available in dev */ })
    })
  }
}
