import { useEffect, useRef, useState, useCallback } from 'react'
import { fabric } from 'fabric'
import { saveDrawing, autoSaveLocal } from '@/lib/canvasStorage'
import { toast } from '@/components/ui/Toast'

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

export function useAutoSave(
  canvas:    fabric.Canvas | null,
  projectId: string,
  floorId:   string,
  intervalMs = 120_000   // 2 minutes
) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [lastSaved,  setLastSaved]  = useState<Date | null>(null)
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const isDirtyRef  = useRef(false)

  // Mark dirty on any canvas change
  useEffect(() => {
    if (!canvas) return
    const onModified = () => { isDirtyRef.current = true; setSaveStatus('unsaved') }
    canvas.on('object:added',    onModified)
    canvas.on('object:modified', onModified)
    canvas.on('object:removed',  onModified)
    return () => {
      canvas.off('object:added',    onModified)
      canvas.off('object:modified', onModified)
      canvas.off('object:removed',  onModified)
    }
  }, [canvas])

  // Manual save
  const save = useCallback(async () => {
    if (!canvas || !projectId || !floorId) return
    setSaveStatus('saving')
    try {
      await saveDrawing(projectId, floorId, canvas)
      autoSaveLocal(projectId, floorId, canvas)
      setSaveStatus('saved')
      setLastSaved(new Date())
      isDirtyRef.current = false
    } catch {
      setSaveStatus('error')
    }
  }, [canvas, projectId, floorId])

  // Auto-save interval
  useEffect(() => {
    if (!canvas || !projectId || !floorId) return
    timerRef.current = setInterval(async () => {
      if (!isDirtyRef.current) return
      setSaveStatus('saving')
      try {
        autoSaveLocal(projectId, floorId, canvas)
        await saveDrawing(projectId, floorId, canvas)
        setSaveStatus('saved')
        setLastSaved(new Date())
        isDirtyRef.current = false
      } catch {
        setSaveStatus('error')
      }
    }, intervalMs)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [canvas, projectId, floorId, intervalMs])

  // Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [save])

  return { saveStatus, lastSaved, save }
}
