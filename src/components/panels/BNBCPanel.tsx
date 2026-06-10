import { useState, useCallback } from 'react'
import { fabric } from 'fabric'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  runBNBCChecks,
  scoreColor, statusColor, statusLabel,
  CATEGORY_LABELS,
  type ComplianceReport,
  type CheckResult,
  type CheckCategory,
  type CheckStatus,
} from '@/lib/bnbcChecker'
import { useAppStore } from '@/store/useAppStore'
import { toast } from '@/components/ui/Toast'
import {
  ShieldCheck, ShieldAlert, ShieldX,
  RefreshCw, Download, Upload,
  ChevronDown, ChevronUp,
  CheckCircle, AlertTriangle, XCircle, Minus,
  Filter,
} from 'lucide-react'

interface BNBCPanelProps {
  canvas:    fabric.Canvas | null
  projectId: string
}

type FilterStatus = 'all' | CheckStatus

export default function BNBCPanel({ canvas, projectId }: BNBCPanelProps) {
  const { siteInfo, bnbcSettings, buildingInfo } = useAppStore()

  const [report,      setReport]      = useState<ComplianceReport | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [filterCat,   setFilterCat]   = useState<CheckCategory | 'all'>('all')
  const [filterStat,  setFilterStat]  = useState<FilterStatus>('all')
  const [expandedId,  setExpandedId]  = useState<string | null>(null)
  const [viewMode,    setViewMode]    = useState<'dashboard' | 'list'>('dashboard')

  // ── Run checks ─────────────────────────────────────
  const handleCheck = useCallback(async () => {
    if (!canvas) return
    setLoading(true)
    try {
      await new Promise((r) => setTimeout(r, 80))
      const result = runBNBCChecks(
        canvas, siteInfo, bnbcSettings, buildingInfo, projectId
      )
      setReport(result)
      toast.success(
        result.failed > 0
          ? `${result.failed}টি fail — সমাধান প্রয়োজন`
          : result.warnings > 0
          ? `${result.warnings}টি warning — review করুন`
          : 'সব check pass হয়েছে ✓'
      )
    } catch {
      toast.error('Check করতে সমস্যা হয়েছে')
    } finally {
      setLoading(false)
    }
  }, [canvas, siteInfo, bnbcSettings, buildingInfo, projectId])

  // ── Save report to Firestore ───────────────────────
  const handleSave = useCallback(async () => {
    if (!report) return
    setSaving(true)
    try {
      await setDoc(
        doc(db, `projects/${projectId}/bnbcReport/data`),
        { ...report, savedAt: serverTimestamp() }
      )
      toast.success('BNBC report save হয়েছে')
    } catch {
      toast.error('Save করতে সমস্যা')
    } finally {
      setSaving(false)
    }
  }, [report, projectId])

  // ── Export as JSON ─────────────────────────────────
  const handleExport = useCallback(() => {
    if (!report) return
    const blob = new Blob(
      [JSON.stringify(report, null, 2)],
      { type: 'application/json' }
    )
    const url = URL.createObjectURL(blob)
    const a   = document.createElement('a')
    a.href    = url
    a.download = `${projectId}-bnbc-report.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('BNBC report export হয়েছে')
  }, [report, projectId])

  // ── Filter results ─────────────────────────────────
  const filtered = report?.results.filter((r) => {
    const catOK  = filterCat  === 'all' || r.category === filterCat
    const statOK = filterStat === 'all' || r.status   === filterStat
    return catOK && statOK
  }) ?? []

  // ── Missing data warning ───────────────────────────
  const missingData = !siteInfo || !bnbcSettings || !buildingInfo

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header & Actions ──────────────────────── */}
      <div className="px-2 py-2 border-b border-panel-border flex flex-col gap-1.5 shrink-0">

        {missingData && (
          <div className="flex items-start gap-1.5 bg-accent-warning/10
                          border border-accent-warning/30 rounded px-2 py-1.5">
            <AlertTriangle size={11} className="text-accent-warning shrink-0 mt-0.5" />
            <p className="text-2xs text-text-muted font-bengali leading-relaxed">
              Hub-এ Site Info, BNBC Settings ও Building Info সেট করলে
              আরও accurate check হবে।
            </p>
          </div>
        )}

        <button
          onClick={handleCheck}
          disabled={loading}
          className="w-full py-2 rounded-lg flex items-center justify-center gap-2
                     text-xs font-display font-semibold text-text-inverse
                     disabled:opacity-60 transition-all hover:scale-[1.01]"
          style={{ background: 'linear-gradient(135deg,#00B4D8,#0077A8)' }}
        >
          {loading
            ? <><div className="spinner" style={{ width: 11, height: 11 }} /> Checking...</>
            : <><ShieldCheck size={13} /> Run BNBC Check</>
          }
        </button>

        {report && (
          <div className="flex gap-1">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-1.5 rounded border border-accent-primary/40
                         text-accent-primary text-2xs flex items-center justify-center gap-1
                         hover:bg-accent-primary/10 transition-colors disabled:opacity-60">
              <Upload size={9} />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={handleExport}
              className="flex-1 py-1.5 rounded border border-panel-border
                         text-text-muted text-2xs flex items-center justify-center gap-1
                         hover:bg-panel-hover transition-colors">
              <Download size={9} /> JSON
            </button>
          </div>
        )}
      </div>

      {/* ── No report yet ─────────────────────────── */}
      {!report && (
        <div className="flex flex-col items-center justify-center flex-1 px-4 text-center">
          <ShieldCheck size={32} className="text-text-muted opacity-20 mb-3" />
          <p className="text-xs text-text-muted font-bengali leading-relaxed">
            Drawing-এ BIM object আঁকুন, তারপর BNBC Check চালান।
            Setback, FAR, Stair, Fire Exit, Parking সব check হবে।
          </p>
        </div>
      )}

      {/* ── Report ────────────────────────────────── */}
      {report && (
        <>
          {/* View mode toggle */}
          <div className="flex border-b border-panel-border shrink-0">
            {(['dashboard', 'list'] as const).map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`flex-1 py-1.5 text-2xs border-b-2 transition-colors capitalize
                  ${viewMode === mode
                    ? 'border-accent-primary text-accent-primary'
                    : 'border-transparent text-text-muted hover:text-text-secondary'
                  }`}>
                {mode === 'dashboard' ? 'Dashboard' : 'All Checks'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto">
            {viewMode === 'dashboard' && (
              <DashboardView report={report} />
            )}
            {viewMode === 'list' && (
              <ListView
                results={filtered}
                allResults={report.results}
                filterCat={filterCat}
                filterStat={filterStat}
                onFilterCat={setFilterCat}
                onFilterStat={setFilterStat}
                expandedId={expandedId}
                onToggleExpand={(id) =>
                  setExpandedId(expandedId === id ? null : id)
                }
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Dashboard View ───────────────────────────────────
function DashboardView({ report }: { report: ComplianceReport }) {
  const score = report.overallScore
  const color = scoreColor(score)

  return (
    <div className="p-2 flex flex-col gap-2">

      {/* Score gauge */}
      <div className="bg-panel-bg border border-panel-border rounded-xl p-4 text-center">
        <div className="relative inline-flex items-center justify-center mb-2">
          {/* SVG gauge */}
          <svg width="80" height="80" viewBox="0 0 80 80">
            {/* Background circle */}
            <circle cx="40" cy="40" r="34"
              fill="none" stroke="#1E2128" strokeWidth="8" />
            {/* Score arc */}
            <circle cx="40" cy="40" r="34"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 213.6} 213.6`}
              transform="rotate(-90 40 40)"
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
          </svg>
          <div className="absolute text-center">
            <p className="text-xl font-display font-bold leading-none" style={{ color }}>
              {score}
            </p>
            <p className="text-2xs text-text-muted">/ 100</p>
          </div>
        </div>

        <p className="text-xs font-display font-semibold text-text-primary mb-0.5">
          Compliance Score
        </p>
        <p className="text-2xs text-text-muted font-bengali">
          {report.summary}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-1">
        {[
          { label: 'Pass',    count: report.passed,   color: '#22C55E', icon: <CheckCircle  size={12} /> },
          { label: 'Warn',    count: report.warnings, color: '#F59E0B', icon: <AlertTriangle size={12} /> },
          { label: 'Fail',    count: report.failed,   color: '#EF4444', icon: <XCircle      size={12} /> },
          { label: 'N/A',     count: report.naChecks, color: '#64748B', icon: <Minus        size={12} /> },
        ].map((s) => (
          <div key={s.label}
            className="bg-panel-bg border border-panel-border rounded-lg p-2 text-center">
            <span style={{ color: s.color }} className="flex justify-center mb-0.5">
              {s.icon}
            </span>
            <p className="text-sm font-display font-bold" style={{ color: s.color }}>
              {s.count}
            </p>
            <p className="text-2xs text-text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Failed & warning items */}
      {(report.failed > 0 || report.warnings > 0) && (
        <div className="bg-panel-bg border border-panel-border rounded-lg overflow-hidden">
          <p className="text-2xs font-mono text-text-muted px-3 py-2 border-b border-panel-border">
            ISSUES TO RESOLVE
          </p>
          {report.results
            .filter((r) => r.status === 'fail' || r.status === 'warning')
            .map((r) => (
              <IssueRow key={r.id} result={r} compact />
            ))}
        </div>
      )}

      {/* Category breakdown */}
      <CategoryBreakdown results={report.results} />

      {/* Checked at */}
      <p className="text-2xs text-text-muted font-mono text-center">
        Checked: {new Date(report.checkedAt).toLocaleTimeString()}
        · {report.totalChecks} total checks
      </p>
    </div>
  )
}

// ─── List View ────────────────────────────────────────
function ListView({
  results, allResults,
  filterCat, filterStat,
  onFilterCat, onFilterStat,
  expandedId, onToggleExpand,
}: {
  results:       CheckResult[]
  allResults:    CheckResult[]
  filterCat:     CheckCategory | 'all'
  filterStat:    FilterStatus
  onFilterCat:   (c: CheckCategory | 'all') => void
  onFilterStat:  (s: FilterStatus) => void
  expandedId:    string | null
  onToggleExpand: (id: string) => void
}) {
  // Categories that have results
  const activeCats = ['all', ...new Set(allResults.map((r) => r.category))] as (CheckCategory | 'all')[]

  return (
    <div className="flex flex-col h-full">

      {/* Filters */}
      <div className="px-2 py-1.5 border-b border-panel-border space-y-1.5 shrink-0">
        {/* Status filter */}
        <div className="flex gap-1">
          {(['all', 'fail', 'warning', 'pass', 'na'] as FilterStatus[]).map((s) => {
            const count = s === 'all'
              ? allResults.length
              : allResults.filter((r) => r.status === s).length
            if (count === 0 && s !== 'all') return null
            return (
              <button key={s} onClick={() => onFilterStat(s)}
                className={`px-1.5 py-0.5 rounded text-2xs border transition-colors
                  ${filterStat === s
                    ? 'border-accent-primary text-accent-primary bg-accent-primary/10'
                    : 'border-panel-border text-text-muted hover:text-text-secondary'
                  }`}>
                {s === 'all' ? 'All' : s.toUpperCase()}
                <span className="ml-0.5 opacity-60 font-mono">{count}</span>
              </button>
            )
          })}
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1">
          {activeCats.map((cat) => (
            <button key={cat} onClick={() => onFilterCat(cat)}
              className={`px-1.5 py-0.5 rounded text-2xs border transition-colors
                ${filterCat === cat
                  ? 'border-accent-primary text-accent-primary bg-accent-primary/10'
                  : 'border-panel-border text-text-muted hover:text-text-secondary'
                }`}>
              {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-auto">
        {results.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs text-text-muted">কোনো result নেই এই filter-এ</p>
          </div>
        )}
        {results.map((result) => (
          <IssueRow
            key={result.id}
            result={result}
            expanded={expandedId === result.id}
            onToggle={() => onToggleExpand(result.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Issue Row ────────────────────────────────────────
function IssueRow({
  result, compact = false, expanded, onToggle,
}: {
  result:    CheckResult
  compact?:  boolean
  expanded?: boolean
  onToggle?: () => void
}) {
  const color = statusColor(result.status)
  const Icon  = result.status === 'pass'    ? CheckCircle
              : result.status === 'warning' ? AlertTriangle
              : result.status === 'fail'    ? XCircle
              : Minus

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-panel-border last:border-0">
        <Icon size={11} style={{ color }} className="shrink-0" />
        <p className="text-2xs text-text-secondary flex-1 truncate">{result.title}</p>
        <span className="text-2xs font-mono shrink-0" style={{ color }}>
          {statusLabel(result.status)}
        </span>
      </div>
    )
  }

  return (
    <div className="border-b border-panel-border last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-2 px-3 py-2 hover:bg-panel-hover transition-colors text-left"
      >
        <Icon size={12} style={{ color }} className="shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <p className="text-2xs font-display font-semibold text-text-primary truncate">
              {result.title}
            </p>
            <div className="flex items-center gap-1 shrink-0">
              <span
                className="text-2xs px-1.5 py-0.5 rounded font-mono"
                style={{
                  color,
                  background: `${color}20`,
                }}
              >
                {statusLabel(result.status)}
              </span>
              {onToggle && (
                expanded
                  ? <ChevronUp   size={10} className="text-text-muted" />
                  : <ChevronDown size={10} className="text-text-muted" />
              )}
            </div>
          </div>
          <p className="text-2xs text-text-muted mt-0.5">
            {result.description}
          </p>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 bg-panel-hover animate-fade-in">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="bg-panel-bg rounded p-2">
              <p className="text-2xs text-text-muted mb-0.5">Actual</p>
              <p className="text-2xs font-mono text-text-secondary">{result.actual}</p>
            </div>
            <div className="bg-panel-bg rounded p-2">
              <p className="text-2xs text-text-muted mb-0.5">Required</p>
              <p className="text-2xs font-mono text-text-secondary">{result.required}</p>
            </div>
          </div>
          <p className="text-2xs text-text-muted mb-1 font-bengali leading-relaxed">
            {result.remarks}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono text-accent-primary/60">
              {result.bnbcRef}
            </span>
            <SeverityBadge severity={result.severity} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Category Breakdown ───────────────────────────────
function CategoryBreakdown({ results }: { results: CheckResult[] }) {
  const cats = [...new Set(results.map((r) => r.category))] as CheckCategory[]

  return (
    <div className="bg-panel-bg border border-panel-border rounded-lg overflow-hidden">
      <p className="text-2xs font-mono text-text-muted px-3 py-2 border-b border-panel-border">
        BY CATEGORY
      </p>
      {cats.map((cat) => {
        const catResults = results.filter((r) => r.category === cat)
        const pass = catResults.filter((r) => r.status === 'pass').length
        const warn = catResults.filter((r) => r.status === 'warning').length
        const fail = catResults.filter((r) => r.status === 'fail').length
        const total = catResults.length

        // Dominant status
        const dominantStatus: CheckStatus = fail > 0 ? 'fail'
          : warn > 0 ? 'warning' : 'pass'
        const color = statusColor(dominantStatus)

        return (
          <div key={cat}
            className="flex items-center gap-2 px-3 py-1.5 border-b border-panel-border last:border-0">
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
            <span className="text-2xs text-text-secondary flex-1">
              {CATEGORY_LABELS[cat]}
            </span>
            <div className="flex items-center gap-1.5">
              {pass > 0  && <span className="text-2xs font-mono text-accent-success">{pass}✓</span>}
              {warn > 0  && <span className="text-2xs font-mono text-accent-warning">{warn}⚠</span>}
              {fail > 0  && <span className="text-2xs font-mono text-accent-error">{fail}✗</span>}
            </div>
            {/* Mini progress bar */}
            <div className="w-12 h-1 bg-panel-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(pass / total) * 100}%`,
                  background: color,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Severity Badge ───────────────────────────────────
function SeverityBadge({ severity }: { severity: 'critical' | 'major' | 'minor' }) {
  const colors = {
    critical: 'text-accent-error bg-accent-error/10 border-accent-error/30',
    major:    'text-accent-warning bg-accent-warning/10 border-accent-warning/30',
    minor:    'text-text-muted bg-panel-active border-panel-border',
  }
  return (
    <span className={`text-2xs px-1.5 py-0.5 rounded border font-mono ${colors[severity]}`}>
      {severity}
    </span>
  )
}
