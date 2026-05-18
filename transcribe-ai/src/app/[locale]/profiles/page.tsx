'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Loader2,
  Plus,
  User,
  UserPlus,
  Calendar,
  AlertCircle,
  FileText,
  ChevronRight,
  Clock,
  GraduationCap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AlumneProfile {
  id: string
  name: string
  age: number | null
  created_at: string
  updated_at: string
}

interface TranscriptionSummary {
  id: string
  audioId: string
  name?: string
  createdAt: string
  updatedAt: string
}

const ProfilesPage = React.memo(function ProfilesPage() {
  const [profiles, setProfiles] = useState<AlumneProfile[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [name, setName] = useState('')
  const [age, setAge] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [ageError, setAgeError] = useState<string | null>(null)

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [transcriptions, setTranscriptions] = useState<TranscriptionSummary[]>([])
  const [transcriptionsLoading, setTranscriptionsLoading] = useState(false)
  const [transcriptionsError, setTranscriptionsError] = useState<string | null>(null)

  // Cache helpers
  const CACHE_KEY = 'profiles_cache_v1'
  const CACHE_TTL_MS = 15 * 1000

  const readCache = () => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') return null
      const { etag, timestamp, data } = parsed
      if (!etag || !timestamp || !data) return null
      const isFresh = Date.now() - timestamp < CACHE_TTL_MS
      return { etag, timestamp, data, isFresh }
    } catch {
      return null
    }
  }

  const writeCache = (etag: string, data: any) => {
    try {
      const payload = { etag, timestamp: Date.now(), data }
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload))
    } catch {}
  }

  const clearCache = () => {
    try { sessionStorage.removeItem(CACHE_KEY) } catch {}
  }

  const fetchProfiles = async (opts?: { force?: boolean }) => {
    const force = !!opts?.force
    setRefreshing(true)
    setListError(null)

    const cached = readCache()
    if (cached?.isFresh && !force) {
      setProfiles(cached.data.profiles || [])
      setLoading(false)
    }

    try {
      const res = await fetch('/api/alumne', {
        headers: cached?.etag && !force ? { 'If-None-Match': cached.etag } : {},
        cache: 'no-store',
      })

      if (res.status === 304 && cached) {
        setProfiles(cached.data.profiles || [])
        setLoading(false)
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'No s\'han pogut carregar els perfils')
      }

      const data = await res.json()
      setProfiles(data.profiles || [])
      setListError(null)

      const etag = res.headers.get('ETag') || undefined
      if (etag) writeCache(etag, data)
    } catch (err) {
      if (!cached) {
        setListError(err instanceof Error ? err.message : 'No s\'han pogut carregar els perfils')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchProfiles()
  }, [])

  const resetForm = () => {
    setName('')
    setAge('')
    setCreateError(null)
    setNameError(null)
    setAgeError(null)
  }

  const validateName = (value: string) => {
    if (!value.trim()) {
      setNameError('El nom és obligatori')
      return false
    }
    if (value.trim().length < 2) {
      setNameError('Mínim 2 caràcters')
      return false
    }
    setNameError(null)
    return true
  }

  const validateAge = (value: string) => {
    if (value && value.trim()) {
      const numericAge = Number(value)
      if (Number.isNaN(numericAge) || numericAge < 0 || numericAge > 25) {
        setAgeError('Entre 0 i 25 anys')
        return false
      }
    }
    setAgeError(null)
    return true
  }

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setName(value)
    if (value.trim()) validateName(value)
    else setNameError(null)
  }

  const handleAgeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setAge(value)
    validateAge(value)
  }

  const fetchTranscriptions = async (alumneId: string, forceRefresh = false) => {
    setTranscriptionsLoading(true)
    setTranscriptionsError(null)

    const CACHE_KEY_T = `transcriptions_cache_${alumneId}_v1`
    const TTL = 15 * 1000

    let cached: { etag: string; timestamp: number; data: any } | null = null
    try {
      const raw = sessionStorage.getItem(CACHE_KEY_T)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && parsed.etag && parsed.timestamp && parsed.data) {
          cached = parsed
          const isFresh = Date.now() - parsed.timestamp < TTL
          if (isFresh && !forceRefresh) {
            setTranscriptions(parsed.data.transcriptions || [])
            setTranscriptionsLoading(false)
          }
        }
      }
    } catch {}

    try {
      const url = `/api/transcription?alumneId=${alumneId}`
      const res = await fetch(url, {
        headers: cached?.etag && !forceRefresh ? { 'If-None-Match': cached.etag } : {},
        cache: 'no-store',
      })

      if (res.status === 304 && cached) {
        setTranscriptions(cached.data.transcriptions || [])
        setTranscriptionsLoading(false)
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'No s\'han pogut carregar les transcripcions')
      }
      const data = await res.json()
      setTranscriptions(data.data.transcriptions || [])
      const etag = res.headers.get('ETag') || undefined
      if (etag) {
        try {
          sessionStorage.setItem(
            CACHE_KEY_T,
            JSON.stringify({ etag, timestamp: Date.now(), data })
          )
        } catch {}
      }
    } catch (err) {
      if (!cached) {
        setTranscriptionsError(err instanceof Error ? err.message : 'No s\'han pogut carregar les transcripcions')
        setTranscriptions([])
      }
    } finally {
      setTranscriptionsLoading(false)
    }
  }

  const handleStudentClick = (studentId: string) => {
    if (selectedStudentId === studentId) {
      setSelectedStudentId(null)
      setTranscriptions([])
    } else {
      setSelectedStudentId(studentId)
      fetchTranscriptions(studentId, true)
    }
  }

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const isNameValid = validateName(name)
    const isAgeValid = validateAge(age)

    if (!isNameValid || !isAgeValid) return

    const numericAge = age ? Number(age) : null

    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/alumne', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), age: numericAge }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'No s\'ha pogut crear el perfil')
      }

      clearCache()
      resetForm()
      setSheetOpen(false)
      await fetchProfiles({ force: true })
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'No s\'ha pogut crear el perfil')
    } finally {
      setCreating(false)
    }
  }

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Generate consistent color from name
  const getAvatarColor = (name: string) => {
    const colors = [
      'from-blue-400 to-blue-600',
      'from-emerald-400 to-emerald-600',
      'from-violet-400 to-violet-600',
      'from-amber-400 to-amber-600',
      'from-rose-400 to-rose-600',
      'from-cyan-400 to-cyan-600',
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100/50">
        <div className="mx-auto max-w-3xl px-4 py-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Alumnes</h1>
              <p className="text-[13px] text-gray-500 mt-1">
                Gestiona els perfils dels teus alumnes
              </p>
            </div>
            <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) resetForm() }}>
              <SheetTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                  Nou alumne
                </button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md border-l border-gray-200/60 bg-gradient-to-b from-white to-gray-50/50 p-0">
                {/* Header with visual interest */}
                <div className="px-6 pt-6 pb-5 border-b border-gray-100">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                      <UserPlus className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <SheetTitle className="text-[15px] font-semibold text-gray-900">Nou alumne</SheetTitle>
                      <p className="text-[12px] text-gray-500">Afegeix un perfil per organitzar</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleCreate} className="px-6 py-5 space-y-5">
                  {/* Name field */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[12px] font-semibold text-gray-600 uppercase tracking-wide">
                      Nom
                    </Label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <User className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        id="name"
                        placeholder="Nom complet de l'alumne"
                        value={name}
                        onChange={handleNameChange}
                        className={cn(
                          "h-11 pl-10 text-[13px] bg-white border-gray-200 rounded-lg shadow-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all",
                          nameError && "border-red-300 focus:border-red-400 focus:ring-red-100"
                        )}
                      />
                    </div>
                    {nameError && (
                      <p className="text-[11px] text-red-500 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" />
                        {nameError}
                      </p>
                    )}
                  </div>

                  {/* Age field */}
                  <div className="space-y-2">
                    <Label htmlFor="age" className="text-[12px] font-semibold text-gray-600 uppercase tracking-wide">
                      Edat <span className="text-gray-400 font-normal normal-case">(opcional)</span>
                    </Label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Calendar className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        id="age"
                        type="number"
                        min={0}
                        max={25}
                        placeholder="Edat en anys"
                        value={age}
                        onChange={handleAgeChange}
                        className={cn(
                          "h-11 pl-10 text-[13px] bg-white border-gray-200 rounded-lg shadow-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all",
                          ageError && "border-red-300 focus:border-red-400 focus:ring-red-100"
                        )}
                      />
                    </div>
                    {ageError && (
                      <p className="text-[11px] text-red-500 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" />
                        {ageError}
                      </p>
                    )}
                  </div>

                  {/* Error message */}
                  {createError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                      <p className="text-[12px] text-red-600 flex items-center gap-2">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {createError}
                      </p>
                    </div>
                  )}

                  {/* Submit button */}
                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={creating || !name.trim() || !!nameError || !!ageError}
                      className={cn(
                        "w-full h-11 text-[13px] font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2",
                        creating || !name.trim() || !!nameError || !!ageError
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm hover:shadow-md hover:from-blue-600 hover:to-blue-700"
                      )}
                    >
                      {creating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creant alumne...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Crear alumne
                        </>
                      )}
                    </button>
                  </div>

                  {/* Helper text */}
                  <p className="text-[11px] text-gray-400 text-center pt-2">
                    Podràs assignar transcripcions a aquest alumne després de crear-lo.
                  </p>
                </form>
              </SheetContent>
            </Sheet>
          </div>

          {/* Error state */}
          {listError && (
            <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-100">
              <p className="text-[13px] text-red-600">{listError}</p>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : profiles.length === 0 ? (
            /* Empty state */
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                <GraduationCap className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-[15px] font-medium text-gray-900 mb-1">Cap alumne encara</h3>
              <p className="text-[13px] text-gray-500 mb-6 max-w-xs mx-auto">
                Crea el teu primer perfil d'alumne per organitzar les transcripcions.
              </p>
              <button
                onClick={() => setSheetOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Afegir alumne
              </button>
            </div>
          ) : (
            /* Student list */
            <div className="space-y-2">
              {profiles.map((profile, index) => {
                const isSelected = selectedStudentId === profile.id
                return (
                  <div
                    key={profile.id}
                    className="rounded-xl bg-white border border-gray-200/60 overflow-hidden transition-all duration-200"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Student row */}
                    <button
                      onClick={() => handleStudentClick(profile.id)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50/50 transition-colors text-left"
                    >
                      {/* Avatar */}
                      <div className={cn(
                        "w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-[12px] font-semibold shrink-0",
                        getAvatarColor(profile.name)
                      )}>
                        {getInitials(profile.name)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-gray-900 truncate">
                          {profile.name}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-gray-500">
                          {profile.age !== null && (
                            <span>{profile.age} anys</span>
                          )}
                          <span>Creat {new Date(profile.created_at).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>

                      {/* Chevron */}
                      <ChevronRight className={cn(
                        "h-4 w-4 text-gray-400 transition-transform duration-200",
                        isSelected && "rotate-90"
                      )} />
                    </button>

                    {/* Expanded transcriptions */}
                    {isSelected && (
                      <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3">
                        {transcriptionsLoading ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                            <span className="ml-2 text-[12px] text-gray-500">Carregant...</span>
                          </div>
                        ) : transcriptionsError ? (
                          <div className="py-4 text-center">
                            <p className="text-[12px] text-red-500">{transcriptionsError}</p>
                          </div>
                        ) : transcriptions.length === 0 ? (
                          <div className="py-6 text-center">
                            <FileText className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                            <p className="text-[12px] text-gray-500">Sense transcripcions</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">
                              {transcriptions.length} transcripci{transcriptions.length === 1 ? 'ó' : 'ons'}
                            </p>
                            {transcriptions.map((t) => (
                              <Link
                                key={t.id}
                                href={`/transcribe?audioId=${t.audioId}`}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group"
                              >
                                <div className="w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center shrink-0">
                                  <FileText className="h-4 w-4 text-blue-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-medium text-gray-900 truncate">
                                    {t.name || `Transcripció ${t.id.slice(0, 8)}`}
                                  </p>
                                  <p className="text-[11px] text-gray-500 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(t.createdAt).toLocaleDateString('ca-ES', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-400 transition-colors" />
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
})

export default ProfilesPage
