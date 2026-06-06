import { useEffect, useRef, useCallback } from 'react'
import { fabric } from 'fabric'
import { useAppStore } from '@/store/useAppStore'
import {
  drawGrid, snapPoint, findNearestEndpoint,
  clampZoom, MIN_ZOOM, MAX_ZOOM,
  pxToMm, formatMm, DEFAULT_SCALE,
} from '@/lib/canvasUtils'

interface UseCanvasOptions {
  canvasId: string
  onMouseMove?: (x: number, y: number, xMm: number, yMm: number) => void
  onZoomChange?: (zoom: number) => void
}

export function useCanvas({ canvasId, onMouseMove: onCursorMove, onZoomChange }: UseCanvasOptions) {
  const canvasRef = useRef<fabric.Canvas | null>(null)
  const isPanning  = useRef(false)
  const lastPos    = useRef({ x: 0, y: 0 })
  const isDrawing  = useRef(false)
  const drawStart  = useRef({ x: 0, y: 0 })
  const tempObj    = useRef<fabric.Object | null>(null)

  const {
    activeTool, snapMode, gridSize, showGrid,
    viewport, setViewport,
    activeLayerId,
  } = useAppStore()

  // ── Init Canvas ────────────────────────────────────
  useEffect(() => {
    const el = document.getElementById(canvasId) as HTMLCanvasElement
    if (!el || canvasRef.current) return

    const container = el.parentElement!
    const w = container.clientWidth
    const h = container.clientHeight

    el.width  = w
    el.height = h

    const canvas = new fabric.Canvas(canvasId, {
      width:               w,
      height:              h,
      backgroundColor:     '#0D0F12',
      selection:           true,
      preserveObjectStacking: true,
      stopContextMenu:     true,
      fireRightClick:      true,
      renderOnAddRemove:   false,
    })

    canvasRef.current = canvas

    // Draw initial grid
    drawGrid(canvas, {
      gridSize,
      scale: DEFAULT_SCALE,
      width: w,
      height: h,
      showGrid,
    })

    canvas.renderAll()

    // Resize observer
    const ro = new ResizeObserver(() => {
      const nw = container.clientWidth
      const nh = container.clientHeight
      canvas.setWidth(nw)
      canvas.setHeight(nh)
      drawGrid(canvas, {
        gridSize,
        scale: DEFAULT_SCALE,
        width: nw,
        height: nh,
        showGrid,
      })
      canvas.renderAll()
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      canvas.dispose()
      canvasRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasId])

  // ── Sync Grid when settings change ─────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawGrid(canvas, {
      gridSize,
      scale: DEFAULT_SCALE,
      width:  canvas.getWidth(),
      height: canvas.getHeight(),
      showGrid,
    })
    canvas.renderAll()
  }, [gridSize, showGrid])

  // ── Get snapped point ──────────────────────────────
  const getSnappedPoint = useCallback(
    (x: number, y: number, zoom: number) => {
      const canvas = canvasRef.current
      if (!canvas) return { x, y }

      if (snapMode === 'grid') {
        return snapPoint(x, y, gridSize, zoom)
      }
      if (snapMode === 'endpoint' && canvas) {
        const pt = new fabric.Point(x, y)
        const nearest = findNearestEndpoint(canvas, pt)
        if (nearest) return { x: nearest.x, y: nearest.y }
      }
      return { x, y }
    },
    [snapMode, gridSize]
  )

  // ── Mouse Events ───────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // ── MOUSE DOWN ────────────────────────────────
    const onMouseDown = (e: any) => {
      const pointer = canvas.getPointer(e.e)
      const zoom    = canvas.getZoom()

      // Middle mouse or pan tool → start panning
      if (e.e.button === 1 || activeTool === 'pan') {
        isPanning.current = true
        lastPos.current = { x: e.e.clientX, y: e.e.clientY }
        canvas.selection = false
        canvas.defaultCursor = 'grabbing'
        return
      }

      if (activeTool === 'select') return

      const snapped = getSnappedPoint(pointer.x, pointer.y, zoom)

      // Start drawing
      isDrawing.current = true
      drawStart.current = snapped

      // Create temp preview object based on tool
      if (activeTool === 'line' || activeTool === 'wall') {
        const line = new fabric.Line(
          [snapped.x, snapped.y, snapped.x, snapped.y],
          {
            stroke:          activeTool === 'wall' ? '#64748B' : '#E8EAF0',
            strokeWidth:     activeTool === 'wall' ? 4 : 1,
            selectable:      false,
            evented:         false,
            strokeLineCap:   'square',
          }
        ) as any
        line.__temp = true
        canvas.add(line)
        tempObj.current = line
      }

      if (activeTool === 'rectangle') {
        const rect = new fabric.Rect({
          left:        snapped.x,
          top:         snapped.y,
          width:       1,
          height:      1,
          fill:        'transparent',
          stroke:      '#E8EAF0',
          strokeWidth: 1,
          selectable:  false,
          evented:     false,
        }) as any
        rect.__temp = true
        canvas.add(rect)
        tempObj.current = rect
      }

      if (activeTool === 'circle') {
        const circ = new fabric.Circle({
          left:        snapped.x,
          top:         snapped.y,
          radius:      1,
          fill:        'transparent',
          stroke:      '#00B4D8',
          strokeWidth: 1,
          selectable:  false,
          evented:     false,
        }) as any
        circ.__temp = true
        canvas.add(circ)
        tempObj.current = circ
      }

      canvas.renderAll()
    }

    // ── MOUSE MOVE ────────────────────────────────
    const onMouseMove = (e: any) => {
      const pointer = canvas.getPointer(e.e)
      const zoom    = canvas.getZoom()
      const xMm     = pxToMm(pointer.x, zoom)
      const yMm     = pxToMm(pointer.y, zoom)

      // Update cursor coordinates in parent
      onCursorMove?.(
        Math.round(pointer.x),
        Math.round(pointer.y),
        xMm,
        yMm
      )

      // Panning
      if (isPanning.current) {
        const dx = e.e.clientX - lastPos.current.x
        const dy = e.e.clientY - lastPos.current.y
        lastPos.current = { x: e.e.clientX, y: e.e.clientY }

        const vpt = canvas.viewportTransform!
        vpt[4] += dx
        vpt[5] += dy
        canvas.setViewportTransform(vpt)
        setViewport({ panX: vpt[4], panY: vpt[5] })
        canvas.renderAll()
        return
      }

      // Live preview while drawing
      if (!isDrawing.current || !tempObj.current) return

      const snapped = getSnappedPoint(pointer.x, pointer.y, zoom)
      const start   = drawStart.current

      if (activeTool === 'line' || activeTool === 'wall') {
        const line = tempObj.current as fabric.Line
        line.set({ x2: snapped.x, y2: snapped.y })
      }

      if (activeTool === 'rectangle') {
        const rect = tempObj.current as fabric.Rect
        const w = snapped.x - start.x
        const h = snapped.y - start.y
        rect.set({
          left:   w < 0 ? snapped.x : start.x,
          top:    h < 0 ? snapped.y : start.y,
          width:  Math.abs(w),
          height: Math.abs(h),
        })
      }

      if (activeTool === 'circle') {
        const circ = tempObj.current as fabric.Circle
        const r = Math.hypot(snapped.x - start.x, snapped.y - start.y)
        circ.set({ radius: r })
      }

      canvas.renderAll()
    }

    // ── MOUSE UP ──────────────────────────────────
    const onMouseUp = (e: any) => {
      // Stop panning
      if (isPanning.current) {
        isPanning.current = false
        canvas.selection = activeTool === 'select'
        canvas.defaultCursor = activeTool === 'pan' ? 'grab' : 'crosshair'
        return
      }

      if (!isDrawing.current || !tempObj.current) return
      isDrawing.current = false

      const pointer = canvas.getPointer(e.e)
      const zoom    = canvas.getZoom()
      const snapped = getSnappedPoint(pointer.x, pointer.y, zoom)
      const start   = drawStart.current

      // Remove temp object
      canvas.remove(tempObj.current)
      tempObj.current = null

      // Create final permanent object
      const obj = createFinalObject(
        activeTool, start, snapped, activeLayerId
      )

      if (obj) {
        ;(obj as any).__layerId     = activeLayerId
        ;(obj as any).__objectType  = activeTool
        canvas.add(obj)
        canvas.setActiveObject(obj)
      }

      canvas.renderAll()
    }

    // ── MOUSE WHEEL (zoom) ────────────────────────
    const onWheel = (e: any) => {
      e.e.preventDefault()
      const delta = e.e.deltaY
      let zoom = canvas.getZoom()
      zoom *= 0.999 ** delta
      zoom  = clampZoom(zoom)

      canvas.zoomToPoint(
        new fabric.Point(e.e.offsetX, e.e.offsetY),
        zoom
      )

      const vpt = canvas.viewportTransform!
      setViewport({ zoom, panX: vpt[4], panY: vpt[5] })
      onZoomChange?.(zoom)

      // Redraw grid at new zoom
      drawGrid(canvas, {
        gridSize,
        scale: DEFAULT_SCALE,
        width:  canvas.getWidth(),
        height: canvas.getHeight(),
        showGrid,
      })

      canvas.renderAll()
      e.e.stopPropagation()
    }

    canvas.on('mouse:down',  onMouseDown)
    canvas.on('mouse:move',  onMouseMove as any)
    canvas.on('mouse:up',    onMouseUp)
    canvas.on('mouse:wheel', onWheel as any)

    return () => {
      canvas.off('mouse:down',  onMouseDown)
      canvas.off('mouse:move',  onMouseMove as any)
      canvas.off('mouse:up',    onMouseUp)
      canvas.off('mouse:wheel', onWheel as any)
    }
  }, [activeTool, getSnappedPoint, activeLayerId, gridSize, showGrid,
      setViewport, onCursorMove, onZoomChange])

  // ── Cursor style per tool ──────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cursors: Record<string, string> = {
      select:    'default',
      pan:       'grab',
      wall:      'crosshair',
      door:      'crosshair',
      window:    'crosshair',
      column:    'crosshair',
      room:      'crosshair',
      grid:      'crosshair',
      dimension: 'crosshair',
      text:      'text',
      line:      'crosshair',
      polyline:  'crosshair',
      circle:    'crosshair',
      rectangle: 'crosshair',
      eraser:    'cell',
    }
    canvas.defaultCursor = cursors[activeTool] ?? 'crosshair'
    canvas.selection = activeTool === 'select'
  }, [activeTool])

  // ── Zoom Controls ──────────────────────────────────
  const zoomIn = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const zoom = clampZoom(canvas.getZoom() * 1.2)
    const cx = canvas.getWidth()  / 2
    const cy = canvas.getHeight() / 2
    canvas.zoomToPoint(new fabric.Point(cx, cy), zoom)
    const vpt = canvas.viewportTransform!
    setViewport({ zoom, panX: vpt[4], panY: vpt[5] })
    onZoomChange?.(zoom)
    drawGrid(canvas, {
      gridSize, scale: DEFAULT_SCALE,
      width: canvas.getWidth(), height: canvas.getHeight(), showGrid,
    })
    canvas.renderAll()
  }, [gridSize, showGrid, setViewport, onZoomChange])

  const zoomOut = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const zoom = clampZoom(canvas.getZoom() / 1.2)
    const cx = canvas.getWidth()  / 2
    const cy = canvas.getHeight() / 2
    canvas.zoomToPoint(new fabric.Point(cx, cy), zoom)
    const vpt = canvas.viewportTransform!
    setViewport({ zoom, panX: vpt[4], panY: vpt[5] })
    onZoomChange?.(zoom)
    drawGrid(canvas, {
      gridSize, scale: DEFAULT_SCALE,
      width: canvas.getWidth(), height: canvas.getHeight(), showGrid,
    })
    canvas.renderAll()
  }, [gridSize, showGrid, setViewport, onZoomChange])

  const resetZoom = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
    setViewport({ zoom: 1, panX: 0, panY: 0 })
    onZoomChange?.(1)
    drawGrid(canvas, {
      gridSize, scale: DEFAULT_SCALE,
      width: canvas.getWidth(), height: canvas.getHeight(), showGrid,
    })
    canvas.renderAll()
  }, [gridSize, showGrid, setViewport, onZoomChange])

  // ── Delete selected ────────────────────────────────
  const deleteSelected = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const active = canvas.getActiveObjects()
    active.forEach((obj) => {
      if (!(obj as any).__isGrid) canvas.remove(obj)
    })
    canvas.discardActiveObject()
    canvas.renderAll()
  }, [])

  // ── Undo/Redo (simple history) ─────────────────────
  const historyRef = useRef<string[]>([])
  const histIdxRef = useRef(-1)

  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const json = canvas.toJSON(['__layerId', '__objectType', '__isGrid'])
    historyRef.current = historyRef.current.slice(0, histIdxRef.current + 1)
    historyRef.current.push(JSON.stringify(json))
    histIdxRef.current++
  }, [])

  const undo = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || histIdxRef.current <= 0) return
    histIdxRef.current--
    const json = historyRef.current[histIdxRef.current]
    canvas.loadFromJSON(JSON.parse(json), () => canvas.renderAll())
  }, [])

  const redo = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || histIdxRef.current >= historyRef.current.length - 1) return
    histIdxRef.current++
    const json = historyRef.current[histIdxRef.current]
    canvas.loadFromJSON(JSON.parse(json), () => canvas.renderAll())
  }, [])

  return {
    canvas: canvasRef.current,
    zoomIn,
    zoomOut,
    resetZoom,
    deleteSelected,
    saveHistory,
    undo,
    redo,
  }
}

// ─── Create Final Fabric Object ───────────────────────
function createFinalObject(
  tool: string,
  start: { x: number; y: number },
  end: { x: number; y: number },
  layerId: string
): fabric.Object | null {
  const dx = Math.abs(end.x - start.x)
  const dy = Math.abs(end.y - start.y)

  // Ignore accidental tiny clicks
  if (dx < 2 && dy < 2) return null

  const LAYER_COLORS: Record<string, string> = {
    walls:      '#64748B',
    doors:      '#F59E0B',
    windows:    '#00B4D8',
    columns:    '#EF4444',
    grids:      '#1E4A6A',
    rooms:      '#10B981',
    dimensions: '#E8EAF0',
    text:       '#E8EAF0',
    furniture:  '#8B5CF6',
    site:       '#22C55E',
  }
  const color = LAYER_COLORS[layerId] ?? '#E8EAF0'

  if (tool === 'wall') {
    return new fabric.Line([start.x, start.y, end.x, end.y], {
      stroke:        color,
      strokeWidth:   6,
      strokeLineCap: 'square',
      selectable:    true,
      hasControls:   true,
    })
  }

  if (tool === 'line') {
    return new fabric.Line([start.x, start.y, end.x, end.y], {
      stroke:        color,
      strokeWidth:   1,
      strokeLineCap: 'round',
      selectable:    true,
    })
  }

  if (tool === 'rectangle') {
    const w = end.x - start.x
    const h = end.y - start.y
    return new fabric.Rect({
      left:        w < 0 ? end.x : start.x,
      top:         h < 0 ? end.y : start.y,
      width:       Math.abs(w),
      height:      Math.abs(h),
      fill:        'transparent',
      stroke:      color,
      strokeWidth: 1,
      selectable:  true,
    })
  }

  if (tool === 'circle') {
    const r = Math.hypot(end.x - start.x, end.y - start.y)
    return new fabric.Circle({
      left:        start.x - r,
      top:         start.y - r,
      radius:      r,
      fill:        'transparent',
      stroke:      color,
      strokeWidth: 1,
      selectable:  true,
    })
  }

  return null
}
