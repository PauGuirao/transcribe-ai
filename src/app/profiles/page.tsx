'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Loader2, Plus, Users, RefreshCw, User, Calendar, AlertCircle, CheckCircle2, FileText, ChevronDown, ChevronRight, Clock } from 'lucide-react'

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

  // Simple client cache for profiles
  const CACHE_KEY = 'profiles_cache_v1'
  const CACHE_TTL_MS = 15 * 1000 // match server max-age

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
      // Render immediately while revalidating in background
      setProfiles(cached.data.profiles || [])
      setLoading(false)
    }

    try {
      const res = await fetch('/api/alumne', {
        headers: cached?.etag && !force ? { 'If-None-Match': cached.etag } : {},
        cache: 'no-store',
      })

      if (res.status === 304 && cached) {
        // Use cached data
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
      if (etag) {
        writeCache(etag, data)
      }
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
      setNameError('El nom ha de tenir almenys 2 caràcters')
      return false
    }
    setNameError(null)
    return true
  }

  const validateAge = (value: string) => {
    if (value && value.trim()) {
      const numericAge = Number(value)
      if (Number.isNaN(numericAge) || numericAge < 0 || numericAge > 25) {
        setAgeError('L\'edat ha d\'estar entre 0 i 25 anys')
        return false
      }
    }
    setAgeError(null)
    return true
  }

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setName(value)
    if (value.trim()) {
      validateName(value)
    } else {
      setNameError(null)
    }
  }

  const handleAgeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setAge(value)
    validateAge(value)
  }

  // State for selected student and transcriptions
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [transcriptions, setTranscriptions] = useState<TranscriptionSummary[]>([])
  const [transcriptionsLoading, setTranscriptionsLoading] = useState(false)
  const [transcriptionsError, setTranscriptionsError] = useState<string | null>(null)

  const router = useRouter()

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
      setTranscriptions(data.transcriptions || [])
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
      // If clicking the same student, collapse
      setSelectedStudentId(null)
      setTranscriptions([])
    } else {
      // If clicking a different student, expand and fetch transcriptions with force refresh
      setSelectedStudentId(studentId)
      fetchTranscriptions(studentId, true) // Always force refresh for immediate updates
    }
  }

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    // Validate all fields before submission
    const isNameValid = validateName(name)
    const isAgeValid = validateAge(age)

    if (!isNameValid || !isAgeValid) {
      return
    }

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

      // Invalidate cache upon successful creation
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

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Alumnat</h1>
              <p className="text-muted-foreground text-md">
                Gestiona els teus alumnes per vincular-los ràpidament a transcripcions i anotacions.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) resetForm() }}>
                <SheetTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nou alumne
                  </Button>
                </SheetTrigger>
                <SheetContent className="sm:max-w-md">
                  <SheetHeader className="space-y-4 pt-8 px-5">
                    <div className="flex items-center gap-3">
                      <div>
                         <SheetTitle className="text-xl">Nou perfil d'alumne</SheetTitle>
                         <SheetDescription className="text-sm text-muted-foreground">
                           Crea un perfil per organitzar i vincular transcripcions de forma més eficient
                         </SheetDescription>
                       </div>
                    </div>
                  </SheetHeader>
                  
                  <form className="space-y-6 p-5" onSubmit={handleCreate}>
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <Label htmlFor="alumne-name" className="flex items-center gap-2 text-sm font-medium">
                          <User className="h-4 w-4 text-muted-foreground" />
                          Nom complet
                        </Label>
                        <Input
                           id="alumne-name"
                           placeholder="Ex: Maria García López"
                           value={name}
                           onChange={handleNameChange}
                           className={`h-11 ${nameError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                           required
                         />
                         {nameError ? (
                           <div className="flex items-center gap-2 text-xs text-destructive">
                             <AlertCircle className="h-3 w-3" />
                             {nameError}
                           </div>
                         ) : (
                            <p className="text-xs text-muted-foreground">
                              Nom complet de l'alumne (mínim 2 caràcters)
                            </p>
                          )}
                      </div>
                      
                      <div className="space-y-3">
                        <Label htmlFor="alumne-age" className="flex items-center gap-2 text-sm font-medium">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          Edat (opcional)
                        </Label>
                        <Input
                           id="alumne-age"
                           type="number"
                           min={0}
                           max={25}
                           placeholder="Ex: 8"
                           value={age}
                           onChange={handleAgeChange}
                           className={`h-11 ${ageError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                         />
                         {ageError ? (
                           <div className="flex items-center gap-2 text-xs text-destructive">
                             <AlertCircle className="h-3 w-3" />
                             {ageError}
                           </div>
                         ) : (
                            <p className="text-xs text-muted-foreground">
                              Opcional: ajuda a organitzar per grups d'edat (0-25 anys)
                            </p>
                          )}
                      </div>
                    </div>

                    {createError && (
                      <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-destructive">Error en crear el perfil</p>
                          <p className="text-sm text-destructive/80">{createError}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-3 pt-4">
                      <Button 
                         type="submit" 
                         disabled={creating || !name.trim() || !!nameError || !!ageError} 
                         className="h-11 gap-2"
                         size="lg"
                       >
                        {creating ? (
                           <>
                             <Loader2 className="h-4 w-4 animate-spin" />
                             Creant perfil...
                           </>
                         ) : (
                           <>
                             <CheckCircle2 className="h-4 w-4" />
                             Crear perfil
                           </>
                         )}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setSheetOpen(false)}
                        className="h-11"
                        size="lg"
                      >
                        Cancel·lar
                      </Button>
                    </div>
                  </form>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {listError && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-6 py-4 text-sm text-destructive">
              {listError}
            </div>
          )}

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : profiles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-muted-foreground/40 bg-muted/30 py-20 text-center text-muted-foreground">
                <div className="mx-auto max-w-sm space-y-3">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground/60" />
                  <h3 className="text-lg font-medium">No hi ha alumnes registrats</h3>
                  <p className="text-sm">Crea el teu primer perfil d'alumne per començar a organitzar transcripcions.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border/60 shadow-sm bg-card/30 backdrop-blur-sm">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nom</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Edat</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Creat</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actualitzat</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transcripcions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-sm">
                      {profiles.map((profile) => (
                        <React.Fragment key={profile.id}>
                          <tr 
                            className="hover:bg-muted/30 cursor-pointer transition-all duration-200 hover:shadow-sm"
                            onClick={() => handleStudentClick(profile.id)}
                          >
                            <td className="px-6 py-4 font-medium text-foreground flex items-center gap-3">
                              {selectedStudentId === profile.id ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              {profile.name}
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">{profile.age ?? '—'}</td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {new Date(profile.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {new Date(profile.updated_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <FileText className="h-4 w-4" />
                                <span className="text-sm">Veure transcripcions</span>
                              </div>
                            </td>
                          </tr>
                          
                          {/* Expanded transcriptions row */}
                          {selectedStudentId === profile.id && (
                            <tr>
                              <td colSpan={5} className="px-6 py-6 bg-muted/20">
                                <div className="space-y-4">
                                  {transcriptionsLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                      <span className="ml-2 text-sm text-muted-foreground">Carregant transcripcions...</span>
                                    </div>
                                  ) : transcriptionsError ? (
                                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                      {transcriptionsError}
                                    </div>
                                  ) : transcriptions.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 py-8 text-center text-muted-foreground">
                                      <div className="space-y-2">
                                        <FileText className="mx-auto h-8 w-8 text-muted-foreground/60" />
                                        <p className="text-sm">No hi ha transcripcions per aquest alumne.</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-medium text-foreground">Transcripcions assignades</h4>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            fetchTranscriptions(profile.id, true)
                                          }}
                                          disabled={transcriptionsLoading}
                                          className="h-8 gap-2"
                                        >
                                          <RefreshCw className={`h-3 w-3 ${transcriptionsLoading ? 'animate-spin' : ''}`} />
                                          Actualitzar
                                        </Button>
                                      </div>
                                      {transcriptions.map((transcription) => (
                                        <Link
                                          key={transcription.id}
                                          href={`/transcribe?audioId=${transcription.audioId}`}
                                          className="block rounded-lg border border-border/60 bg-card/50 p-4 transition-all duration-200 hover:bg-card/80 hover:shadow-sm"
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              <FileText className="h-5 w-5 text-primary" />
                                              <div>
                                                <h4 className="font-medium text-foreground">
                                                  {transcription.name || `Transcripció ${transcription.id.slice(0, 8)}`}
                                                </h4>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                  <Clock className="h-3 w-3" />
                                                  {new Date(transcription.createdAt).toLocaleDateString()}
                                                </div>
                                              </div>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                          </div>
                                        </Link>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
        </div>
      </div>
    </AppLayout>
  )
});

export default ProfilesPage;
