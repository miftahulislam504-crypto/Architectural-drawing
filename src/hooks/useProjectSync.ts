import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import {
  fetchProjectData,
  markDrawingStarted,
} from '@/lib/hubSync'

export type SyncStatus = 'idle' | 'loading' | 'success' | 'error'

export interface SyncState {
  status:  SyncStatus
  message: string
  loaded: {
    project:      boolean
    siteInfo:     boolean
    bnbcSettings: boolean
    buildingInfo: boolean
  }
}

export function useProjectSync(projectId: string | undefined) {
  const {
    setProject, setCurrentProjectId,
    setSiteInfo, setBNBCSettings, setBuildingInfo,
    hubProject,
  } = useAppStore()

  const [syncState, setSyncState] = useState<SyncState>({
    status:  'idle',
    message: '',
    loaded: {
      project:      false,
      siteInfo:     false,
      bnbcSettings: false,
      buildingInfo: false,
    },
  })

  const sync = useCallback(async () => {
    if (!projectId) return
    // Already loaded this project — skip
    if (hubProject?.id === projectId) {
      setSyncState((s) => ({ ...s, status: 'success' }))
      return
    }

    setSyncState({
      status: 'loading', message: 'Hub থেকে project data load হচ্ছে...',
      loaded: { project: false, siteInfo: false, bnbcSettings: false, buildingInfo: false },
    })

    try {
      const data = await fetchProjectData(projectId)

      // Push to Zustand
      setProject(data.project)
      setCurrentProjectId(projectId)

      setSyncState((s) => ({
        ...s,
        message: 'Project loaded...',
        loaded: { ...s.loaded, project: true },
      }))

      if (data.siteInfo) {
        setSiteInfo(data.siteInfo)
        setSyncState((s) => ({
          ...s,
          message: 'Site info loaded...',
          loaded: { ...s.loaded, siteInfo: true },
        }))
      }

      if (data.bnbcSettings) {
        setBNBCSettings(data.bnbcSettings)
        setSyncState((s) => ({
          ...s,
          message: 'BNBC settings loaded...',
          loaded: { ...s.loaded, bnbcSettings: true },
        }))
      }

      if (data.buildingInfo) {
        setBuildingInfo(data.buildingInfo)
        setSyncState((s) => ({
          ...s,
          message: 'Building info loaded...',
          loaded: { ...s.loaded, buildingInfo: true },
        }))
      }

      // Mark drawing started in Hub (non-blocking)
      markDrawingStarted(projectId)

      setSyncState({
        status: 'success',
        message: 'সব data load সম্পূর্ণ',
        loaded: {
          project:      true,
          siteInfo:     !!data.siteInfo,
          bnbcSettings: !!data.bnbcSettings,
          buildingInfo: !!data.buildingInfo,
        },
      })

    } catch (err: any) {
      setSyncState({
        status: 'error',
        message: err?.message ?? 'Data load করতে সমস্যা হচ্ছে',
        loaded: { project: false, siteInfo: false, bnbcSettings: false, buildingInfo: false },
      })
    }
  }, [projectId, hubProject?.id])

  useEffect(() => {
    sync()
  }, [sync])

  return { syncState, retry: sync }
}
