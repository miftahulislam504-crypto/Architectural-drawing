import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { useAppStore } from '@/store/useAppStore'
import type { HubProject } from '@/types'
import {
  FolderOpen, Search, ChevronRight,
  MapPin, User, Clock, AlertCircle, Hash
} from 'lucide-react'

export default function ProjectSelectPage() {
  const navigate = useNavigate()
  const { setProject, setCurrentProjectId } = useAppStore()

  const [projects, setProjects] = useState<HubProject[]>([])
  const [filtered, setFiltered] = useState<HubProject[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Load projects from Firestore (Hub's projects collection)
  // Filters by createdBy == current user uid — matching Hub's query
  useEffect(() => {
    const auth = getAuth()
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setError('লগইন করুন। Hub-এ login করা থাকতে হবে।')
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        const q = query(
          collection(db, 'projects'),
          where('createdBy', '==', user.uid),
          orderBy('createdAt', 'desc')
        )
        const snap = await getDocs(q)
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as HubProject[]
        setProjects(data)
        setFiltered(data)
      } catch (err) {
        console.error(err)
        setError('Firebase connect করতে পারছে না। Vercel-এ env variables চেক করুন।')
      } finally {
        setLoading(false)
      }
    })
    return () => unsub()
  }, [])

  // Search filter — uses projectName (Hub's actual field)
  useEffect(() => {
    if (!search.trim()) {
      setFiltered(projects)
      return
    }
    const q = search.toLowerCase()
    setFiltered(
      projects.filter(
        (p) =>
          p.projectName?.toLowerCase().includes(q) ||
          p.clientName?.toLowerCase().includes(q) ||
          p.location?.toLowerCase().includes(q) ||
          p.projectCode?.toLowerCase().includes(q)
      )
    )
  }, [search, projects])

  const handleSelect = (project: HubProject) => {
    setProject(project)
    setCurrentProjectId(project.id)
    navigate(`/draw/${project.id}`)
  }

  // Hub status values: 'active' | 'on_hold' | 'completed'
  const statusColor = (s: string) => {
    if (s === 'active')    return 'text-accent-success bg-accent-success/10'
    if (s === 'on_hold')   return 'text-accent-warning bg-accent-warning/10'
    if (s === 'completed') return 'text-text-muted bg-panel-active'
    return 'text-text-muted bg-panel-active'
  }

  const statusLabel = (s: string) => {
    if (s === 'active')    return 'চলমান'
    if (s === 'on_hold')   return 'বিরতি'
    if (s === 'completed') return 'সম্পন্ন'
    return s
  }

  // Format Firestore Timestamp or ISO string
  const formatDate = (val: any): string => {
    if (!val) return ''
    try {
      const d = val?.toDate ? val.toDate() : new Date(val)
      return d.toLocaleDateString('bn-BD')
    } catch {
      return ''
    }
  }

  return (
    <div className="min-h-screen bg-canvas-bg flex flex-col">

      {/* Header */}
      <div className="bg-panel-bg border-b border-panel-border px-4 py-3 flex items-center gap-3">
        <FolderOpen size={20} className="text-accent-primary" />
        <div>
          <h1 className="font-display font-semibold text-text-primary text-sm">
            Project Select
          </h1>
          <p className="text-2xs text-text-muted font-bengali">
            Hub থেকে প্রজেক্ট সিলেক্ট করুন
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            className="cad-input pl-8"
            placeholder="প্রজেক্ট নাম, কোড বা ক্লায়েন্ট খুঁজুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-6 overflow-y-auto">

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="spinner" />
            <p className="text-text-muted text-xs">Hub থেকে লোড হচ্ছে...</p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 bg-accent-error/10 border border-accent-error/30 rounded-lg p-3 mb-4">
            <AlertCircle size={16} className="text-accent-error mt-0.5 shrink-0" />
            <p className="text-accent-error text-xs">{error}</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-16">
            <FolderOpen size={32} className="text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary text-sm mb-1">কোনো প্রজেক্ট নেই</p>
            <p className="text-text-muted text-xs font-bengali">
              Hub-এ নতুন প্রজেক্ট তৈরি করুন
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {filtered.map((project) => (
            <button
              key={project.id}
              onClick={() => handleSelect(project)}
              className="w-full text-left bg-panel-bg border border-panel-border rounded-xl p-4
                         hover:border-accent-primary/40 hover:bg-panel-hover
                         transition-all duration-150 group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  {/* Project code badge */}
                  {project.projectCode && (
                    <span className="text-2xs font-mono text-text-muted bg-panel-active px-1.5 py-0.5 rounded mb-1 inline-block">
                      {project.projectCode}
                    </span>
                  )}
                  <h3 className="font-display font-semibold text-text-primary text-sm leading-tight">
                    {project.projectName}
                  </h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-2xs px-2 py-0.5 rounded-full font-mono ${statusColor(project.status)}`}>
                    {statusLabel(project.status)}
                  </span>
                  <ChevronRight size={14}
                    className="text-text-muted group-hover:text-accent-primary transition-colors" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                {project.clientName && (
                  <div className="flex items-center gap-1.5 text-2xs text-text-muted">
                    <User size={11} />
                    <span>{project.clientName}</span>
                  </div>
                )}
                {project.location && (
                  <div className="flex items-center gap-1.5 text-2xs text-text-muted">
                    <MapPin size={11} />
                    <span>{project.location}</span>
                  </div>
                )}
                {project.createdAt && (
                  <div className="flex items-center gap-1.5 text-2xs text-text-muted">
                    <Clock size={11} />
                    <span>{formatDate(project.createdAt)}</span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
