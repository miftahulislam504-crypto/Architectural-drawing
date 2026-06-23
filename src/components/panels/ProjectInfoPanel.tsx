import { useAppStore } from '@/store/useAppStore'
import {
  MapPin, Building2, Wind, AlertTriangle,
  CheckCircle, Info, ChevronDown, ChevronUp
} from 'lucide-react'
import { useState } from 'react'

export default function ProjectInfoPanel() {
  const { hubProject, siteInfo, bnbcSettings, buildingInfo } = useAppStore()

  const [siteOpen,  setSiteOpen]  = useState(true)
  const [bnbcOpen,  setBnbcOpen]  = useState(true)
  const [bldOpen,   setBldOpen]   = useState(true)

  if (!hubProject) return (
    <div className="p-4 text-center">
      <p className="text-text-muted text-xs">
        No project loaded
      </p>
    </div>
  )

  return (
    <div className="flex flex-col gap-0 overflow-y-auto h-full">

      {/* ── Project Header ─────────────────────── */}
      <div className="px-3 py-3 border-b border-panel-border">
        <p className="text-xs font-display font-semibold text-text-primary leading-tight truncate">
          {hubProject.projectName}
        </p>
        {hubProject.clientName && (
          <p className="text-2xs text-text-muted mt-0.5">
            Client: {hubProject.clientName}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-1.5">
          <StatusDot status={hubProject.status} />
          <span className="text-2xs text-text-muted font-mono uppercase tracking-wide">
            {hubProject.status}
          </span>
        </div>
      </div>

      {/* ── Site Info ─────────────────────────── */}
      <SectionHead
        icon={<MapPin size={12} />}
        label="Site Info"
        open={siteOpen}
        onToggle={() => setSiteOpen(!siteOpen)}
        missing={!siteInfo}
      />
      {siteOpen && (
        <div className="px-3 pb-3">
          {siteInfo ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2">
              <KV label="Plot Area"   value={`${siteInfo.plotArea} m²`} />
              <KV label="Road Width"  value={`${siteInfo.roadWidth} m`} />
              <KV label="Soil Type"   value={siteInfo.soilType} accent />
              <KV label="District"    value={siteInfo.district ?? '—'} />
              {siteInfo.address && (
                <div className="col-span-2">
                  <p className="text-2xs text-text-muted">Address</p>
                  <p className="text-2xs text-text-secondary mt-0.5 leading-relaxed">
                    {siteInfo.address}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <MissingHint text="Add Site Info in Hub" />
          )}
        </div>
      )}

      <div className="divider" />

      {/* ── BNBC Settings ─────────────────────── */}
      <SectionHead
        icon={<Wind size={12} />}
        label="BNBC Settings"
        open={bnbcOpen}
        onToggle={() => setBnbcOpen(!bnbcOpen)}
        missing={!bnbcSettings}
      />
      {bnbcOpen && (
        <div className="px-3 pb-3">
          {bnbcSettings ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2">
              <KV label="Seismic Zone"   value={`Zone ${bnbcSettings.seismicZone}`}  accent />
              <KV label="Wind Zone"      value={`Zone ${bnbcSettings.windZone}`} />
              <KV label="Occupancy"      value={`Type ${bnbcSettings.occupancyType}`} accent />
              <KV label="Risk Category"  value={bnbcSettings.riskCategory ?? '—'} />
              <KV label="Imp. Factor"    value={String(bnbcSettings.importanceFactor ?? '—')} />
              <KV label="Wind Speed"     value={`${bnbcSettings.basicWindSpeed ?? '—'} m/s`} />
            </div>
          ) : (
            <MissingHint text="Add BNBC Settings in Hub" />
          )}
        </div>
      )}

      <div className="divider" />

      {/* ── Building Info ──────────────────────── */}
      <SectionHead
        icon={<Building2 size={12} />}
        label="Building Info"
        open={bldOpen}
        onToggle={() => setBldOpen(!bldOpen)}
        missing={!buildingInfo}
      />
      {bldOpen && (
        <div className="px-3 pb-3">
          {buildingInfo ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2">
              <KV label="Type"          value={buildingInfo.buildingType} accent />
              <KV label="Total Floors"  value={`${buildingInfo.numFloors} F`} />
              <KV label="Floor Height"  value={`${buildingInfo.floorHeight} m`} />
              <KV label="Total Height"  value={`${buildingInfo.totalHeight ?? '—'} m`} />
              <KV label="Basement"      value={`${buildingInfo.basementCount ?? 0} nos`} />
            </div>
          ) : (
            <MissingHint text="Add Building Info in Hub" />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────

function KV({
  label, value, accent = false
}: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-2xs text-text-muted leading-none mb-0.5">{label}</p>
      <p className={`text-2xs font-mono font-medium
        ${accent ? 'text-accent-primary' : 'text-text-secondary'}`}>
        {value}
      </p>
    </div>
  )
}

function MissingHint({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-1.5 mt-2 py-1.5 px-2
                    bg-accent-warning/5 border border-accent-warning/20 rounded">
      <AlertTriangle size={11} className="text-accent-warning shrink-0" />
      <p className="text-2xs text-text-muted">{text}</p>
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-accent-success',
    hold:   'bg-accent-warning',
    done:   'bg-text-muted',
  }
  return (
    <div className={`w-1.5 h-1.5 rounded-full ${colors[status] ?? 'bg-text-muted'}`} />
  )
}

function SectionHead({
  icon, label, open, onToggle, missing
}: {
  icon:     React.ReactNode
  label:    string
  open:     boolean
  onToggle: () => void
  missing:  boolean
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-3 py-2
                 hover:bg-panel-hover transition-colors"
    >
      <span className={missing ? 'text-accent-warning/60' : 'text-accent-primary'}>
        {icon}
      </span>
      <span className="text-2xs font-mono font-semibold text-text-muted
                       uppercase tracking-wider flex-1 text-left">
        {label}
      </span>
      {missing && (
        <AlertTriangle size={10} className="text-accent-warning/60" />
      )}
      {!missing && (
        <CheckCircle size={10} className="text-accent-success/60" />
      )}
      {open
        ? <ChevronUp   size={11} className="text-text-muted" />
        : <ChevronDown size={11} className="text-text-muted" />
      }
    </button>
  )
}
