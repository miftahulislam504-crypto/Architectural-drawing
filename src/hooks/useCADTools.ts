import { useCallback, useState } from 'react'
import { fabric } from 'fabric'
import {
  mirrorObject, copyObject, moveObject,
  rotateObject, scaleObject, arrayRectangular,
  createHatch, offsetLine, selectAll,
  getSelectedObjects, type MirrorAxis, type HatchPattern,
} from '@/lib/cadTools'
import { toast } from '@/components/ui/Toast'

export function useCADTools(canvas: fabric.Canvas | null) {

  const [moveStep,     setMoveStep]     = useState(100)    // mm
  const [rotateAngle,  setRotateAngle]  = useState(90)     // deg
  const [scaleFactor,  setScaleFactor]  = useState(1.5)
  const [offsetDist,   setOffsetDist]   = useState(250)    // mm
  const [arrayRows,    setArrayRows]    = useState(2)
  const [arrayCols,    setArrayCols]    = useState(3)
  const [arrayRowGap,  setArrayRowGap]  = useState(5000)
  const [arrayColGap,  setArrayColGap]  = useState(5000)

  // ── Guard ──────────────────────────────────────────
  const withSelected = useCallback(<T>(
    fn: (objs: fabric.Object[]) => T,
    minCount = 1
  ): T | null => {
    if (!canvas) return null
    const objs = getSelectedObjects(canvas)
    if (objs.length < minCount) {
      toast.warning(`কমপক্ষে ${minCount}টি object সিলেক্ট করুন`)
      return null
    }
    return fn(objs)
  }, [canvas])

  // ── Mirror ─────────────────────────────────────────
  const mirror = useCallback((axis: MirrorAxis, copy = false) => {
    withSelected((objs) => {
      objs.forEach((o) => mirrorObject(o, axis, canvas!, copy))
      toast.success(`Mirror ${axis} ✓`)
    })
  }, [canvas, withSelected])

  // ── Copy ───────────────────────────────────────────
  const copyOffset = useCallback(() => {
    withSelected((objs) => {
      objs.forEach((o) => copyObject(o, moveStep, moveStep, canvas!))
      toast.success(`${objs.length}টি object copy হয়েছে`)
    })
  }, [canvas, moveStep, withSelected])

  // ── Move ───────────────────────────────────────────
  const move = useCallback((dx: number, dy: number) => {
    withSelected((objs) => {
      objs.forEach((o) => moveObject(o, dx, dy, canvas!))
    })
  }, [canvas, withSelected])

  // ── Rotate ─────────────────────────────────────────
  const rotate = useCallback((angle?: number) => {
    withSelected((objs) => {
      const a = angle ?? rotateAngle
      objs.forEach((o) => rotateObject(o, a, canvas!))
      toast.success(`Rotate ${a}° ✓`)
    })
  }, [canvas, rotateAngle, withSelected])

  // ── Scale ──────────────────────────────────────────
  const scale = useCallback((factor?: number) => {
    withSelected((objs) => {
      const f = factor ?? scaleFactor
      objs.forEach((o) => scaleObject(o, f, f, canvas!))
      toast.success(`Scale ×${f} ✓`)
    })
  }, [canvas, scaleFactor, withSelected])

  // ── Offset ─────────────────────────────────────────
  const offset = useCallback((dist?: number) => {
    if (!canvas) return
    const objs = getSelectedObjects(canvas)
    const lines = objs.filter((o) => o.type === 'line') as fabric.Line[]
    if (lines.length === 0) {
      toast.warning('Line object সিলেক্ট করুন')
      return
    }
    const d = dist ?? offsetDist
    lines.forEach((l) => offsetLine(l, d, canvas))
    toast.success(`Offset ${d}mm ✓`)
  }, [canvas, offsetDist])

  // ── Rectangular Array ──────────────────────────────
  const createArray = useCallback(() => {
    withSelected((objs) => {
      objs.forEach((o) =>
        arrayRectangular(o, arrayCols, arrayRows, arrayColGap, arrayRowGap, canvas!)
      )
      toast.success(`${arrayCols}×${arrayRows} array তৈরি হয়েছে`)
    })
  }, [canvas, arrayCols, arrayRows, arrayColGap, arrayRowGap, withSelected])

  // ── Hatch ──────────────────────────────────────────
  const applyHatch = useCallback((pattern: HatchPattern, color = '#64748B', spacing = 20) => {
    if (!canvas) return
    const objs = getSelectedObjects(canvas)
    if (objs.length === 0) {
      toast.warning('Object সিলেক্ট করুন')
      return
    }
    objs.forEach((obj) => {
      const bounds = obj.getBoundingRect()
      createHatch(bounds, pattern, color, spacing, canvas)
    })
    toast.success(`Hatch pattern যোগ হয়েছে`)
  }, [canvas])

  // ── Delete selected ────────────────────────────────
  const deleteSelected = useCallback(() => {
    if (!canvas) return
    const objs = getSelectedObjects(canvas)
    if (objs.length === 0) return
    objs.forEach((o) => canvas.remove(o))
    canvas.discardActiveObject()
    canvas.renderAll()
    toast.info(`${objs.length}টি object মুছে গেছে`)
  }, [canvas])

  // ── Select all ─────────────────────────────────────
  const selectAllObjects = useCallback(() => {
    if (!canvas) return
    selectAll(canvas)
    const n = getSelectedObjects(canvas).length
    toast.info(`${n}টি object সিলেক্ট হয়েছে`)
  }, [canvas])

  // ── Duplicate in place ─────────────────────────────
  const duplicate = useCallback(() => {
    withSelected((objs) => {
      objs.forEach((o) => copyObject(o, 20, 20, canvas!))
      toast.success(`${objs.length}টি object duplicate হয়েছে`)
    })
  }, [canvas, withSelected])

  // ── Bring/Send order ───────────────────────────────
  const bringForward = useCallback(() => {
    if (!canvas) return
    getSelectedObjects(canvas).forEach((o) => canvas.bringForward(o))
    canvas.renderAll()
  }, [canvas])

  const sendBackward = useCallback(() => {
    if (!canvas) return
    getSelectedObjects(canvas).forEach((o) => canvas.sendBackwards(o))
    canvas.renderAll()
  }, [canvas])

  const bringToFront = useCallback(() => {
    if (!canvas) return
    getSelectedObjects(canvas).forEach((o) => canvas.bringToFront(o))
    canvas.renderAll()
  }, [canvas])

  const sendToBack = useCallback(() => {
    if (!canvas) return
    getSelectedObjects(canvas).forEach((o) => canvas.sendToBack(o))
    canvas.renderAll()
  }, [canvas])

  // ── Group/Ungroup ──────────────────────────────────
  const groupSelected = useCallback(() => {
    if (!canvas) return
    const objs = getSelectedObjects(canvas)
    if (objs.length < 2) { toast.warning('২টির বেশি object সিলেক্ট করুন'); return }
    const group = new fabric.Group(objs, { selectable: true })
    objs.forEach((o) => canvas.remove(o))
    canvas.add(group)
    canvas.setActiveObject(group)
    canvas.renderAll()
    toast.success('Group তৈরি হয়েছে')
  }, [canvas])

  const ungroupSelected = useCallback(() => {
    if (!canvas) return
    const active = canvas.getActiveObject()
    if (!active || active.type !== 'group') { toast.warning('Group সিলেক্ট করুন'); return }
    const grp  = active as fabric.Group
    const items = grp.getObjects()
    grp.destroy()
    canvas.remove(grp)
    items.forEach((o) => canvas.add(o))
    canvas.renderAll()
    toast.success('Ungroup হয়েছে')
  }, [canvas])

  return {
    // State
    moveStep, setMoveStep,
    rotateAngle, setRotateAngle,
    scaleFactor, setScaleFactor,
    offsetDist, setOffsetDist,
    arrayRows, setArrayRows,
    arrayCols, setArrayCols,
    arrayRowGap, setArrayRowGap,
    arrayColGap, setArrayColGap,

    // Operations
    mirror, copyOffset, move, rotate, scale,
    offset, createArray, applyHatch,
    deleteSelected, selectAllObjects, duplicate,
    bringForward, sendBackward, bringToFront, sendToBack,
    groupSelected, ungroupSelected,
  }
}
