import { useState, useCallback } from 'react'
import { fabric } from 'fabric'
import {
  buildPayload, pushToAllApps,
  checkIntegrationStatus,
  INTEGRATION_PATHS,
  type PushResult,
} from '@/lib/integrationBridge'
import { useAppStore } from '@/store/useAppStore'
import { toast } from '@/components/ui/Toast'
import {
  ArrowRight, CheckCircle, XCircle,
  Loader2, RefreshCw, Database,
  Building2, Calculator, ClipboardList,
  LayoutDashboard, Zap,
} from 'lucide-react'

interface IntegrationPanelProps {
  canvas:    fabric.Canvas | null
  projectId: string
}

const APP_CONFIG = [
  {
    key:   'structural',
    label: 'Structural App',
    desc:  'Grid, Column locations, Beam layout, Slab areas, Floor levels',
    icon:  <Building2    size={16} />,
    color: '#EF4444',
    path:  (pid: string) => INTEGRATION_PATHS.structuralInput(pid),
  },
  {
    key:   'estimating',
    label: 'Estimating App',
    desc:  'BOQ, Schedules, Floor area, Wall quantities',
    icon:  <Calculator   size={16} />,
    color: '#F59E0B',
    path:  (pid: string) => INTEGRATION_PATHS.estimatingInput(pid),
  },
  {
    key:   'projectMgmt',
    label: 'Project Management',
    desc:  'Drawing status, Completion %, Floor count',
    icon:  <ClipboardList size={16} />,
    color: '#8B5CF6',
    path:  (pid: string) => INTEGRATION_PATHS.architecturalStatus(pid),
  },
  {
    key:   'hub',
    label: 'CivilOS Hub',
    desc:  'Master summary, Drawing status update',
    icon:  <LayoutDashboard size={16} />,
    color: '#00B4D8',
    path:  (pid: string) => `projects/${pid}/architecturalSummary/data`,
  },
]

export default function IntegrationPanel({
  canvas, projectId,
}: IntegrationPanelProps) {
  const {
    floors, activeFloorId,
    siteInfo, bnbcSettings, buildingInfo,
  } = useAppStore()

  const [pushing,  setPushing]  = useState(false)
  const [results,  setResults]  = useState<PushResult[] | null>(null)
  const [status,   setStatus]   = useState<Record<string, boolean>>({})
  const [checking, setChecking] = useState(false)
  const [progress, setProgress] = useState<string>('')

  // ── Check status ───────────────────────────────────
  const handleCheckStatus = useCallback(async () => {
    setChecking(true)
    try {
      const s = await checkIntegrationStatus(projectId)
      setStatus(s)
    } catch {
      toast.error('Status check করতে সমস্যা')
    } finally {
      setChecking(false)
    }
  }, [projectId])

  // ── Push to all ────────────────────────────────────
  const handlePushAll = useCallback(async () => {
    if (!canvas) return
    setPushing(true)
    setResults(null)
    setProgress('Data preparing...')

    try {
      setProgress('BOQ ও Schedule extract করছে...')
      const payload = await buildPayload(
        canvas, projectId, floors,
        activeFloorId ?? 'gf',
        siteInfo, bnbcSettings, buildingInfo,
        null
      )

      setProgress('Firestore-এ push করছে...')
      const res = await pushToAllApps(payload, projectId)
      setResults(res)

      const failed  = res.filter((r) => !r.success).length
      const success = res.filter((r) => r.success).length

      if (failed === 0) {
        toast.success(`সব ${success}টি App-এ data push হয়েছে ✓`)
      } else {
        toast.warning(`${success}টি success, ${failed}টি failed`)
      }

      // Refresh status
      await handleCheckStatus()

    } catch (e: any) {
      toast.error('Push করতে সমস্যা হয়েছে')
    } finally {
      setPushing(false)
      setProgress('')
    }
  }, [canvas, projectId, floors, activeFloorId,
      siteInfo, bnbcSettings, buildingInfo, handleCheckStatus])

  const activeFloor = floors.find((f) => f.id === activeFloorId)

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ── Header info ─────────────────────────────── */}
      <div className="px-3 py-3 border-b border-panel-border">
        <div className="flex items-center gap-2 mb-2">
          <Database size={14} className="text-accent-primary" />
          <p className="text-xs font-display font-semibold text-text-primary">
            Integration Bridge
          </p>
        </div>
        <p className="text-2xs text-text-muted font-bengali leading-relaxed">
          Architectural drawing-এর সব data একটা বাটনে
          সব CivilOS App-এ পৌঁছে যাবে।
        </p>
      </div>

      {/* ── Pipeline diagram ─────────────────────────── */}
      <div className="px-3 py-3 border-b border-panel-border">
        <p className="text-2xs font-mono text-text-muted mb-2">DATA PIPELINE</p>
        <div className="flex flex-col gap-1">
          <PipelineStep
            label="Architectural Drawing"
            sublabel={`${activeFloor?.name ?? '—'} · Current floor`}
            color="#00B4D8"
            isSource
          />
          <div className="flex justify-center">
            <ArrowRight size={14} className="text-text-muted rotate-90" />
          </div>
          {APP_CONFIG.map((app, i) => (
            <div key={app.key}>
              <PipelineStep
                label={app.label}
                sublabel={app.desc}
                color={app.color}
                hasData={status[app.key]}
              />
              {i < APP_CONFIG.length - 1 && (
                <div className="flex justify-center my-0.5">
                  <ArrowRight size={12} className="text-text-muted rotate-90 opacity-40" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Push Button ─────────────────────────────── */}
      <div className="px-3 py-3 flex flex-col gap-2">
        <button
          onClick={handlePushAll}
          disabled={pushing}
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2
                     text-sm font-display font-bold text-text-inverse
                     disabled:opacity-60 transition-all hover:scale-[1.01]"
          style={{ background: 'linear-gradient(135deg,#00B4D8,#0077A8)',
                   boxShadow: pushing ? 'none' : '0 0 24px rgba(0,180,216,0.35)' }}
        >
          {pushing ? (
            <><Loader2 size={16} className="animate-spin" /> Pushing...</>
          ) : (
            <><Zap size={16} /> Push to All Apps</>
          )}
        </button>

        {pushing && progress && (
          <p className="text-2xs text-accent-primary font-mono text-center animate-pulse">
            {progress}
          </p>
        )}

        <button
          onClick={handleCheckStatus}
          disabled={checking}
          className="w-full py-2 rounded border border-panel-border
                     text-text-muted text-xs flex items-center justify-center gap-1.5
                     hover:bg-panel-hover transition-colors disabled:opacity-60"
        >
          {checking
            ? <><Loader2 size={11} className="animate-spin" /> Checking...</>
            : <><RefreshCw size={11} /> Check Status</>
          }
        </button>
      </div>

      {/* ── Push Results ─────────────────────────────── */}
      {results && (
        <div className="px-3 pb-3">
          <p className="text-2xs font-mono text-text-muted mb-2">PUSH RESULTS</p>
          <div className="bg-panel-bg border border-panel-border rounded-lg overflow-hidden">
            {results.map((r, i) => (
              <div key={i}
                className="flex items-center gap-2 px-3 py-2 border-b border-panel-border last:border-0">
                {r.success
                  ? <CheckCircle size={12} className="text-accent-success shrink-0" />
                  : <XCircle     size={12} className="text-accent-error shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-2xs text-text-secondary">{r.app}</p>
                  {r.error && (
                    <p className="text-2xs text-accent-error font-mono truncate">{r.error}</p>
                  )}
                </div>
                <span className={`text-2xs font-mono shrink-0
                  ${r.success ? 'text-accent-success' : 'text-accent-error'}`}>
                  {r.success ? 'OK' : 'FAIL'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── What gets pushed ─────────────────────────── */}
      <div className="px-3 pb-3 mt-auto border-t border-panel-border pt-3">
        <p className="text-2xs font-mono text-text-muted mb-2">WHAT GETS PUSHED</p>
        <div className="flex flex-col gap-1.5">
          {[
            { label: 'Grid layout',      to: 'Structural' },
            { label: 'Column locations', to: 'Structural' },
            { label: 'Slab areas',       to: 'Structural' },
            { label: 'Floor levels',     to: 'Structural' },
            { label: 'BOQ items',        to: 'Estimating' },
            { label: 'Door schedule',    to: 'Estimating' },
            { label: 'Window schedule',  to: 'Estimating' },
            { label: 'Room schedule',    to: 'Estimating' },
            { label: 'Drawing status',   to: 'Project Mgmt' },
            { label: 'Completion %',     to: 'Hub' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-accent-primary/60" />
                <span className="text-2xs text-text-secondary">{item.label}</span>
              </div>
              <span className="text-2xs font-mono text-text-muted">{item.to}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Pipeline Step ────────────────────────────────────
function PipelineStep({ label, sublabel, color, isSource, hasData }: {
  label:     string
  sublabel:  string
  color:     string
  isSource?: boolean
  hasData?:  boolean
}) {
  return (
    <div className={`flex items-start gap-2 px-2.5 py-2 rounded-lg border
      ${isSource ? 'border-accent-primary/40 bg-accent-primary/5' : 'border-panel-border bg-panel-bg'}`}>
      <div className="w-1.5 h-1.5 rounded-full mt-1 shrink-0"
        style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <p className={`text-2xs font-display font-semibold leading-tight
          ${isSource ? 'text-accent-primary' : 'text-text-primary'}`}>
          {label}
        </p>
        <p className="text-2xs text-text-muted leading-tight mt-0.5 truncate">
          {sublabel}
        </p>
      </div>
      {!isSource && hasData !== undefined && (
        hasData
          ? <CheckCircle size={11} className="text-accent-success shrink-0 mt-0.5" />
          : <div className="w-2.5 h-2.5 rounded-full border border-panel-border mt-0.5 shrink-0" />
      )}
    </div>
  )
}
