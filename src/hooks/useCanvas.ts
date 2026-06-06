import { useEffect, useRef, useCallback } from 'react'
import { fabric } from 'fabric'
import { useAppStore } from '@/store/useAppStore'
import {
  drawGrid, snapPoint, findNearestEndpoint,
  clampZoom, pxToMm, formatMm, DEFAULT_SCALE,
} from '@/lib/canvasUtils'
import { WallTool   } from '@/components/canvas/tools/WallTool'
import { ColumnTool } from '@/components/canvas/tools/ColumnTool'
import { DoorTool   } from '@/components/canvas/tools/DoorTool'
import { WindowTool } from '@/components/canvas/tools/WindowTool'
import { RoomTool   } from '@/components/canvas/tools/RoomTool'

interface UseCanvasOptions {
  canvasId:      string
  onMouseMove?:  (x: number, y: number, xMm: number, yMm: number) => void
  onZoomChange?: (zoom: number) => void
}

export function useCanvas({ canvasId, onMouseMove, onZoomChange }: UseCanvasOptions) {
  const canvasRef    = useRef<fabric.Canvas | null>(null)
  const isPanning    = useRef(false)
  const lastPos      = useRef({ x: 0, y: 0 })

  // BIM Tool instances
  const wallToolRef   = useRef<WallTool   | null>(null)
  const columnToolRef = useRef<ColumnTool | null>(null)
  const doorToolRef   = useRef<DoorTool   | null>(null)
  const windowToolRef = useRef<WindowTool | null>(null)
  const roomToolRef   = useRef<RoomTool   | null>(null)

  // Simple draw state for basic tools
  const isDrawing  = useRef(false)
  const drawStart  = useRef({ x: 0, y: 0 })
  const tempObj    = useRef<fabric.Object | null>(null)

  const {
    activeTool, snapMode, gridSize, showGrid,
    setViewport, activeLayerId,
    doorCount, windowCount, columnCount, roomCount,
    nextDoorId, nextWindowId, nextColumnId, nextRoomId,
  } = useAppStore()

  // ── Init Canvas ──────────────────────────────────
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
    drawGrid(canvas, { gridSize, scale: DEFAULT_SCALE, width: w, height: h, showGrid })
    canvas.renderAll()

    const ro = new ResizeObserver(() => {
      const nw = container.clientWidth
      const nh = container.clientHeight
      canvas.setWidth(nw)
      canvas.setHeight(nh)
      drawGrid(canvas, { gridSize, scale: DEFAULT_SCALE, width: nw, height: nh, showGrid })
      canvas.renderAll()
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      wallToolRef.current?.dispose()
      columnToolRef.current?.dispose()
      doorToolRef.current?.dispose()
      windowToolRef.current?.dispose()
      roomToolRef.current?.dispose()
      canvas.dispose()
      canvasRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasId])

  // ── Grid sync ────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawGrid(canvas, { gridSize, scale: DEFAULT_SCALE, width: canvas.getWidth(), height: canvas.getHeight(), showGrid })
    canvas.renderAll()
  }, [gridSize, showGrid])

  // ── BIM Tool instances — recreate when tool changes ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const zoom = canvas.getZoom()

    // Dispose previous
    wallToolRef.current?.dispose()
    columnToolRef.current?.dispose()
    doorToolRef.current?.dispose()
    windowToolRef.current?.dispose()
    roomToolRef.current?.dispose()

    if (activeTool === 'wall') {
      wallToolRef.current = new WallTool(canvas, gridSize, zoom, undefined, () => {})
    }
    if (activeTool === 'column') {
      columnToolRef.current = new ColumnTool(canvas, gridSize, zoom, columnCount, undefined, () => {})
    }
    if (activeTool === 'door') {
      doorToolRef.current = new DoorTool(canvas, gridSize, zoom, doorCount, undefined, () => {})
    }
    if (activeTool === 'window') {
      windowToolRef.current = new WindowTool(canvas, gridSize, zoom, windowCount, undefined, () => {})
    }
    if (activeTool === 'room') {
      roomToolRef.current = new RoomTool(canvas, gridSize, zoom, roomCount, () => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool])

  // ── Snap helper ──────────────────────────────────
  const getSnapped = useCallback((x: number, y: number, zoom: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x, y }
    if (snapMode === 'grid')     return snapPoint(x, y, gridSize, zoom)
    if (snapMode === 'endpoint') {
      const near = findNearestEndpoint(canvas, new fabric.Point(x, y))
      if (near) return { x: near.x, y: near.y }
    }
    return { x, y }
  }, [snapMode, gridSize])

  // ── Mouse Events ─────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onDown = (e: fabric.IEvent<MouseEvent>) => {
      const pointer  = canvas.getPointer(e.e)
      const zoom     = canvas.getZoom()
      const snapped  = getSnapped(pointer.x, pointer.y, zoom)

      // Pan
      if (e.e.button === 1 || activeTool === 'pan') {
        isPanning.current = true
        lastPos.current = { x: e.e.clientX, y: e.e.clientY }
        canvas.selection     = false
        canvas.defaultCursor = 'grabbing'
        return
      }

      if (activeTool === 'select') return

      // ── Route to BIM tools ──────────────────────
      if (activeTool === 'wall')   { wallToolRef.current?.onMouseDown(snapped.x, snapped.y);   return }
      if (activeTool === 'column') { columnToolRef.current?.onMouseDown(snapped.x, snapped.y); return }
      if (activeTool === 'door')   { doorToolRef.current?.onMouseDown(snapped.x, snapped.y);   return }
      if (activeTool === 'window') { windowToolRef.current?.onMouseDown(snapped.x, snapped.y); return }
      if (activeTool === 'room')   { roomToolRef.current?.onMouseDown(snapped.x, snapped.y);   return }

      // ── Basic draw tools ────────────────────────
      isDrawing.current  = true
      drawStart.current  = snapped

      if (activeTool === 'line' || activeTool === 'rectangle' || activeTool === 'circle') {
        let obj: fabric.Object | null = null
        if (activeTool === 'line') {
          obj = new fabric.Line([snapped.x, snapped.y, snapped.x, snapped.y], {
            stroke: '#E8EAF0', strokeWidth: 1, selectable: false, evented: false,
          })
        } else if (activeTool === 'rectangle') {
          obj = new fabric.Rect({ left: snapped.x, top: snapped.y, width: 1, height: 1,
            fill: 'transparent', stroke: '#E8EAF0', strokeWidth: 1, selectable: false, evented: false })
        } else {
          obj = new fabric.Circle({ left: snapped.x, top: snapped.y, radius: 1,
            fill: 'transparent', stroke: '#00B4D8', strokeWidth: 1, selectable: false, evented: false })
        }
        if (obj) {
          ;(obj as any).__temp = true
          canvas.add(obj)
          tempObj.current = obj
        }
      }
      canvas.renderAll()
    }

    const onMove = (e: fabric.IEvent<MouseEvent>) => {
      const pointer = canvas.getPointer(e.e)
      const zoom    = canvas.getZoom()
      const xMm     = pxToMm(pointer.x, zoom)
      const yMm     = pxToMm(pointer.y, zoom)
      onMouseMove?.(Math.round(pointer.x), Math.round(pointer.y), xMm, yMm)

      // Pan
      if (isPanning.current) {
        const dx = e.e.clientX - lastPos.current.x
        const dy = e.e.clientY - lastPos.current.y
        lastPos.current = { x: e.e.clientX, y: e.e.clientY }
        const vpt = canvas.viewportTransform!
        vpt[4] += dx; vpt[5] += dy
        canvas.setViewportTransform(vpt)
        setViewport({ panX: vpt[4], panY: vpt[5] })
        canvas.renderAll()
        return
      }

      const snapped = getSnapped(pointer.x, pointer.y, zoom)

      // Route to BIM tools
      if (activeTool === 'wall')   { wallToolRef.current?.onMouseMove(snapped.x, snapped.y);   return }
      if (activeTool === 'column') { columnToolRef.current?.onMouseMove(snapped.x, snapped.y); return }
      if (activeTool === 'door')   { doorToolRef.current?.onMouseMove(snapped.x, snapped.y);   return }
      if (activeTool === 'window') { windowToolRef.current?.onMouseMove(snapped.x, snapped.y); return }
      if (activeTool === 'room')   { roomToolRef.current?.onMouseMove(snapped.x, snapped.y);   return }

      // Basic tools
      if (!isDrawing.current || !tempObj.current) return
      const start = drawStart.current
      if (activeTool === 'line') {
        (tempObj.current as fabric.Line).set({ x2: snapped.x, y2: snapped.y })
      } else if (activeTool === 'rectangle') {
        const w = snapped.x - start.x; const h = snapped.y - start.y
        ;(tempObj.current as fabric.Rect).set({
          left: w < 0 ? snapped.x : start.x, top: h < 0 ? snapped.y : start.y,
          width: Math.abs(w), height: Math.abs(h),
        })
      } else if (activeTool === 'circle') {
        const r = Math.hypot(snapped.x - start.x, snapped.y - start.y)
        ;(tempObj.current as fabric.Circle).set({ radius: r })
      }
      canvas.renderAll()
    }

    const onUp = (e: fabric.IEvent<MouseEvent>) => {
      if (isPanning.current) {
        isPanning.current    = false
        canvas.selection     = activeTool === 'select'
        canvas.defaultCursor = activeTool === 'pan' ? 'grab' : 'crosshair'
        return
      }
      if (!isDrawing.current || !tempObj.current) return
      isDrawing.current = false

      const pointer = canvas.getPointer(e.e)
      const zoom    = canvas.getZoom()
      const snapped = getSnapped(pointer.x, pointer.y, zoom)
      const start   = drawStart.current
      canvas.remove(tempObj.current)
      tempObj.current = null

      const dx = Math.abs(snapped.x - start.x)
      const dy = Math.abs(snapped.y - start.y)
      if (dx < 3 && dy < 3) return

      let final: fabric.Object | null = null
      if (activeTool === 'line') {
        final = new fabric.Line([start.x, start.y, snapped.x, snapped.y], {
          stroke: '#E8EAF0', strokeWidth: 1, selectable: true,
        })
      } else if (activeTool === 'rectangle') {
        const w = snapped.x - start.x; const h = snapped.y - start.y
        final = new fabric.Rect({
          left: w < 0 ? snapped.x : start.x, top: h < 0 ? snapped.y : start.y,
          width: Math.abs(w), height: Math.abs(h),
          fill: 'transparent', stroke: '#E8EAF0', strokeWidth: 1, selectable: true,
        })
      } else if (activeTool === 'circle') {
        const r = Math.hypot(snapped.x - start.x, snapped.y - start.y)
        final = new fabric.Circle({
          left: start.x - r, top: start.y - r, radius: r,
          fill: 'transparent', stroke: '#00B4D8', strokeWidth: 1, selectable: true,
        })
      }
      if (final) {
        ;(final as any).__layerId    = activeLayerId
        ;(final as any).__objectType = activeTool
        canvas.add(final)
        canvas.setActiveObject(final)
      }
      canvas.renderAll()
    }

    const onWheel = (e: fabric.IEvent<WheelEvent>) => {
      e.e.preventDefault()
      let zoom = clampZoom(canvas.getZoom() * 0.999 ** e.e.deltaY)
      canvas.zoomToPoint(new fabric.Point(e.e.offsetX, e.e.offsetY), zoom)
      const vpt = canvas.viewportTransform!
      setViewport({ zoom, panX: vpt[4], panY: vpt[5] })
      onZoomChange?.(zoom)
      wallToolRef.current?.setZoom(zoom)
      columnToolRef.current?.setZoom(zoom)
      doorToolRef.current?.setZoom(zoom)
      windowToolRef.current?.setZoom(zoom)
      roomToolRef.current?.setZoom(zoom)
      drawGrid(canvas, { gridSize, scale: DEFAULT_SCALE, width: canvas.getWidth(), height: canvas.getHeight(), showGrid })
      canvas.renderAll()
      e.e.stopPropagation()
    }

    const onDblClick = (e: fabric.IEvent<MouseEvent>) => {
      const pointer = canvas.getPointer(e.e)
      const zoom    = canvas.getZoom()
      const snapped = getSnapped(pointer.x, pointer.y, zoom)
      if (activeTool === 'wall')   wallToolRef.current?.onDoubleClick()
      if (activeTool === 'room')   roomToolRef.current?.onMouseDown(snapped.x, snapped.y, true)
    }

    canvas.on('mouse:down',        onDown)
    canvas.on('mouse:move',        onMove as any)
    canvas.on('mouse:up',          onUp)
    canvas.on('mouse:wheel',       onWheel as any)
    canvas.on('mouse:dblclick',    onDblClick)

    return () => {
      canvas.off('mouse:down',     onDown)
      canvas.off('mouse:move',     onMove as any)
      canvas.off('mouse:up',       onUp)
      canvas.off('mouse:wheel',    onWheel as any)
      canvas.off('mouse:dblclick', onDblClick)
    }
  }, [activeTool, getSnapped, activeLayerId, gridSize, showGrid, setViewport, onMouseMove, onZoomChange])

  // ── Cursor ───────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const CURSORS: Record<string, string> = {
      select: 'default', pan: 'grab', wall: 'crosshair', door: 'crosshair',
      window: 'crosshair', column: 'crosshair', room: 'crosshair',
      grid: 'crosshair', dimension: 'crosshair', text: 'text',
      line: 'crosshair', polyline: 'crosshair', circle: 'crosshair',
      rectangle: 'crosshair', eraser: 'cell',
    }
    canvas.defaultCursor = CURSORS[activeTool] ?? 'crosshair'
    canvas.selection     = activeTool === 'select'

    // ESC handler for BIM tools
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      wallToolRef.current?.onEscape()
      columnToolRef.current?.onEscape()
      doorToolRef.current?.onEscape()
      windowToolRef.current?.onEscape()
      roomToolRef.current?.onEscape()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeTool])

  // ── Zoom Controls ────────────────────────────────
  const zoomAction = useCallback((factor: number, reset = false) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cx = canvas.getWidth() / 2; const cy = canvas.getHeight() / 2
    const zoom = reset ? 1 : clampZoom(canvas.getZoom() * factor)
    if (reset) canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
    else canvas.zoomToPoint(new fabric.Point(cx, cy), zoom)
    const vpt = canvas.viewportTransform!
    setViewport({ zoom: reset ? 1 : zoom, panX: vpt[4], panY: vpt[5] })
    onZoomChange?.(reset ? 1 : zoom)
    drawGrid(canvas, { gridSize, scale: DEFAULT_SCALE, width: canvas.getWidth(), height: canvas.getHeight(), showGrid })
    canvas.renderAll()
  }, [gridSize, showGrid, setViewport, onZoomChange])

  const zoomIn    = useCallback(() => zoomAction(1.2),    [zoomAction])
  const zoomOut   = useCallback(() => zoomAction(1 / 1.2),[zoomAction])
  const resetZoom = useCallback(() => zoomAction(1, true),[zoomAction])

  const deleteSelected = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    canvas.getActiveObjects().forEach((o) => { if (!(o as any).__isGrid) canvas.remove(o) })
    canvas.discardActiveObject(); canvas.renderAll()
  }, [])

  const historyRef = useRef<string[]>([])
  const histIdxRef = useRef(-1)

  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const json = JSON.stringify(canvas.toJSON(['__layerId','__objectType','__isGrid','__isBIM','__props','__id']))
    historyRef.current = historyRef.current.slice(0, histIdxRef.current + 1)
    historyRef.current.push(json)
    histIdxRef.current++
  }, [])

  const undo = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || histIdxRef.current <= 0) return
    histIdxRef.current--
    canvas.loadFromJSON(JSON.parse(historyRef.current[histIdxRef.current]), () => canvas.renderAll())
  }, [])

  const redo = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || histIdxRef.current >= historyRef.current.length - 1) return
    histIdxRef.current++
    canvas.loadFromJSON(JSON.parse(historyRef.current[histIdxRef.current]), () => canvas.renderAll())
  }, [])

  return {
    canvas: canvasRef.current,
    zoomIn, zoomOut, resetZoom,
    deleteSelected, saveHistory, undo, redo,
  }
}
