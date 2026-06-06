import { useState, useCallback, useRef } from 'react'
import { fabric } from 'fabric'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  GridLine, GridSystem,
  generateDefaultGrid, renderGrid,
  exportForStructural, alphaLabel, numLabel,
  buildStructuralExportPath,
} from '@/lib/gridSystem'
import { toast } from '@/components/ui/Toast'

export interface GridSettings {
  showBubbles:    boolean
  showDimensions: boolean
  locked:         boolean
  visible:        boolean
}

const DEFAULT_SETTINGS: GridSettings = {
  showBubbles:    true,
  showDimensions: true,
  locked:         false,
  visible:        true,
}

export function useGridSystem(
  canvas:    fabric.Canvas | null,
  projectId: string
) {
  const [system, setSystem] = useState<GridSystem>({
    xLines: [],
    yLines: [],
    origin: { x: 80, y: 80 },
    scale:  1,
  })

  const [settings, setSettings] = useState<GridSettings>(DEFAULT_SETTINGS)
  const [hasGrid,  setHasGrid]  = useState(false)
  const [saving,   setSaving]   = useState(false)

  // ── Re-render helper ──────────────────────────────
  const rerender = useCallback((
    sys: GridSystem,
    cfg: GridSettings
  ) => {
    if (!canvas || !cfg.visible) return
    renderGrid(canvas, sys, {
      showBubbles:    cfg.showBubbles,
      showDimensions: cfg.showDimensions,
      locked:         cfg.locked,
    })
  }, [canvas])

  // ── Generate grid ─────────────────────────────────
  const generateGrid = useCallback((
    cols:       number,
    rows:       number,
    colSpacing: number,
    rowSpacing: number
  ) => {
    if (!canvas) return

    const origin = { x: 80, y: 80 }
    const newSystem = generateDefaultGrid(
      cols, rows, colSpacing, rowSpacing, origin
    )

    setSystem(newSystem)
    setHasGrid(true)
    rerender(newSystem, settings)
    toast.success(`${cols}×${rows} structural grid তৈরি হয়েছে`)
  }, [canvas, settings, rerender])

  // ── Add single line ───────────────────────────────
  const addXLine = useCallback((position: number) => {
    setSystem((prev) => {
      const idx     = prev.xLines.length
      const newLine: GridLine = {
        id:        `x-${Date.now()}`,
        label:     numLabel(idx),
        direction: 'x',
        position,
        locked:    false,
      }
      const updated = {
        ...prev,
        xLines: [...prev.xLines, newLine].sort((a, b) => a.position - b.position),
      }
      rerender(updated, settings)
      return updated
    })
  }, [rerender, settings])

  const addYLine = useCallback((position: number) => {
    setSystem((prev) => {
      const idx     = prev.yLines.length
      const newLine: GridLine = {
        id:        `y-${Date.now()}`,
        label:     alphaLabel(idx),
        direction: 'y',
        position,
        locked:    false,
      }
      const updated = {
        ...prev,
        yLines: [...prev.yLines, newLine].sort((a, b) => a.position - b.position),
      }
      rerender(updated, settings)
      return updated
    })
  }, [rerender, settings])

  // ── Update line position ──────────────────────────
  const updateLinePosition = useCallback((
    id:          string,
    direction:   'x' | 'y',
    newPosition: number
  ) => {
    setSystem((prev) => {
      const key = direction === 'x' ? 'xLines' : 'yLines'
      const updated = {
        ...prev,
        [key]: prev[key].map((l) =>
          l.id === id ? { ...l, position: newPosition } : l
        ),
      }
      rerender(updated, settings)
      return updated
    })
  }, [rerender, settings])

  // ── Update line label ─────────────────────────────
  const updateLineLabel = useCallback((
    id:        string,
    direction: 'x' | 'y',
    newLabel:  string
  ) => {
    setSystem((prev) => {
      const key = direction === 'x' ? 'xLines' : 'yLines'
      const updated = {
        ...prev,
        [key]: prev[key].map((l) =>
          l.id === id ? { ...l, label: newLabel } : l
        ),
      }
      rerender(updated, settings)
      return updated
    })
  }, [rerender, settings])

  // ── Remove line ───────────────────────────────────
  const removeLine = useCallback((id: string, direction: 'x' | 'y') => {
    setSystem((prev) => {
      const key = direction === 'x' ? 'xLines' : 'yLines'
      const updated = {
        ...prev,
        [key]: prev[key].filter((l) => l.id !== id),
      }
      rerender(updated, settings)
      return updated
    })
  }, [rerender, settings])

  // ── Toggle lock ───────────────────────────────────
  const toggleLock = useCallback((id: string, direction: 'x' | 'y') => {
    setSystem((prev) => {
      const key = direction === 'x' ? 'xLines' : 'yLines'
      const updated = {
        ...prev,
        [key]: prev[key].map((l) =>
          l.id === id ? { ...l, locked: !l.locked } : l
        ),
      }
      rerender(updated, settings)
      return updated
    })
  }, [rerender, settings])

  // ── Update settings ───────────────────────────────
  const updateSettings = useCallback((patch: Partial<GridSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...patch }
      if (hasGrid) rerender(system, updated)
      return updated
    })
  }, [system, hasGrid, rerender])

  // ── Toggle visibility ─────────────────────────────
  const toggleVisibility = useCallback(() => {
    const next = !settings.visible
    setSettings((prev) => ({ ...prev, visible: next }))
    if (!canvas) return
    const gridObjs = canvas.getObjects().filter((o: any) => o.__isStructGrid)
    gridObjs.forEach((o) => o.set({ visible: next }))
    canvas.renderAll()
  }, [canvas, settings.visible])

  // ── Clear all grid ────────────────────────────────
  const clearGrid = useCallback(() => {
    if (!canvas) return
    const gridObjs = canvas.getObjects().filter((o: any) => o.__isStructGrid)
    gridObjs.forEach((o) => canvas.remove(o))
    canvas.renderAll()
    setSystem({ xLines: [], yLines: [], origin: { x: 80, y: 80 }, scale: 1 })
    setHasGrid(false)
    toast.info('Grid cleared')
  }, [canvas])

  // ── Save to Firestore ─────────────────────────────
  const saveGrid = useCallback(async () => {
    if (!projectId || !hasGrid) return
    setSaving(true)
    try {
      await setDoc(
        doc(db, 'drawings', projectId, 'structuralGrid', 'data'),
        {
          system:    JSON.stringify(system),
          settings,
          savedAt:   serverTimestamp(),
        }
      )
      toast.success('Grid saved ✓')
    } catch {
      toast.error('Grid save করতে সমস্যা')
    } finally {
      setSaving(false)
    }
  }, [projectId, hasGrid, system, settings])

  // ── Load from Firestore ───────────────────────────
  const loadGrid = useCallback(async () => {
    if (!projectId || !canvas) return
    try {
      const snap = await getDoc(
        doc(db, 'drawings', projectId, 'structuralGrid', 'data')
      )
      if (!snap.exists()) return

      const data = snap.data()
      const loadedSystem: GridSystem = JSON.parse(data.system)
      const loadedSettings: GridSettings = data.settings ?? DEFAULT_SETTINGS

      setSystem(loadedSystem)
      setSettings(loadedSettings)
      setHasGrid(true)
      rerender(loadedSystem, loadedSettings)
      toast.success('Grid loaded')
    } catch {
      // No grid saved yet — silent
    }
  }, [projectId, canvas, rerender])

  // ── Export to Structural App ──────────────────────
  const exportToStructural = useCallback(async (
    columnGridRefs?: string[]
  ) => {
    if (!projectId || !hasGrid) {
      toast.error('আগে grid তৈরি করুন')
      return
    }
    try {
      const exportData = exportForStructural(system, projectId, columnGridRefs)

      // Save to Firestore → Structural App reads from here
      await setDoc(
        doc(db, buildStructuralExportPath(projectId)),
        {
          ...exportData,
          exportedAt: serverTimestamp(),
        }
      )

      // Also provide JSON download
      const blob = new Blob(
        [JSON.stringify(exportData, null, 2)],
        { type: 'application/json' }
      )
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${projectId}-structural-grid.json`
      a.click()
      URL.revokeObjectURL(url)

      toast.success('Structural App-এ Grid export হয়েছে ✓')
    } catch {
      toast.error('Export করতে সমস্যা হয়েছে')
    }
  }, [projectId, hasGrid, system])

  return {
    system,
    settings,
    hasGrid,
    saving,
    generateGrid,
    addXLine,
    addYLine,
    updateLinePosition,
    updateLineLabel,
    removeLine,
    toggleLock,
    updateSettings,
    toggleVisibility,
    clearGrid,
    saveGrid,
    loadGrid,
    exportToStructural,
  }
}
