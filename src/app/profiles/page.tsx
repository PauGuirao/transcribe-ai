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

export default function ProfilesPage() {
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

  // State for selected student and transcriptions
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [transcriptions, setTranscriptions] = useState<TranscriptionSummary[]>([])
  const [transcriptionsLoading, setTranscriptionsLoading] = useState(false)
  const [transcriptionsError, setTranscriptionsError] = useState<string | null>(null)

  const router = useRouter()

  const fetchProfiles = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/alumne')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'No se pudieron cargar los perfiles')
      }
      const data = await res.json()
      setProfiles(data.profiles || [])
      setListError(null)
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'No se pudieron cargar los perfiles')
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
      setNameError('El nombre es obligatorio')
      return false
    }
    if (value.trim().length < 2) {
      setNameError('El nombre debe tener al menos 2 caracteres')
      return false
    }
    setNameError(null)
    return true
  }

  const validateAge = (value: string) => {
    if (value && value.trim()) {
      const numericAge = Number(value)
      if (Number.isNaN(numericAge) || numericAge < 0 || numericAge > 25) {
        setAgeError('La edad debe estar entre 0 y 25 años')
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

  const fetchTranscriptions = async (alumneId: string) => {
    setTranscriptionsLoading(true)
    setTranscriptionsError(null)
    try {
      const res = await fetch(`/api/transcription?alumneId=${alumneId}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'No se pudieron cargar las transcripciones')
      }
      const data = await res.json()
      setTranscriptions(data.transcriptions || [])
    } catch (err) {
      setTranscriptionsError(err instanceof Error ? err.message : 'No se pudieron cargar las transcripciones')
      setTranscriptions([])
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
      // If clicking a different student, expand and fetch transcriptions
      setSelectedStudentId(studentId)
      fetchTranscriptions(studentId)
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
        throw new Error(data?.error || 'No se pudo crear el perfil')
      }

      resetForm()
      setSheetOpen(false)
      await fetchProfiles()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'No se pudo crear el perfil')
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
              <h1 className="text-3xl font-bold tracking-tight">Alumnat</h1>
              <p className="text-muted-foreground text-lg">
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
                         <SheetTitle className="text-xl">Nuevo perfil de alumno</SheetTitle>
                         <SheetDescription className="text-sm text-muted-foreground">
                           Crea un perfil para organizar y vincular transcripciones de forma más eficiente
                         </SheetDescription>
                       </div>
                    </div>
                  </SheetHeader>
                  
                  <form className="space-y-6 p-5" onSubmit={handleCreate}>
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <Label htmlFor="alumne-name" className="flex items-center gap-2 text-sm font-medium">
                          <User className="h-4 w-4 text-muted-foreground" />
                          Nombre completo
                        </Label>
                        <Input
                           id="alumne-name"
                           placeholder="Ej: María García López"
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
                              Nombre completo del alumno (mínimo 2 caracteres)
                            </p>
                          )}
                      </div>
                      
                      <div className="space-y-3">
                        <Label htmlFor="alumne-age" className="flex items-center gap-2 text-sm font-medium">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          Edad (opcional)
                        </Label>
                        <Input
                           id="alumne-age"
                           type="number"
                           min={0}
                           max={25}
                           placeholder="Ej: 8"
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
                              Opcional: ayuda a organizar por grupos de edad (0-25 años)
                            </p>
                          )}
                      </div>
                    </div>

                    {createError && (
                      <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-destructive">Error al crear el perfil</p>
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
                             Creando perfil...
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
                        Cancelar
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
                  <h3 className="text-lg font-medium">No hay alumnos registrados</h3>
                  <p className="text-sm">Crea tu primer perfil de alumno para comenzar a organizar transcripciones.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border/60 shadow-sm bg-card/30 backdrop-blur-sm">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nombre</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Edad</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Creado</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actualizado</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transcripciones</th>
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
                                <span className="text-sm">Ver transcripciones</span>
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
                                      <span className="ml-2 text-sm text-muted-foreground">Cargando transcripciones...</span>
                                    </div>
                                  ) : transcriptionsError ? (
                                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                      {transcriptionsError}
                                    </div>
                                  ) : transcriptions.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 py-8 text-center text-muted-foreground">
                                      <div className="space-y-2">
                                        <FileText className="mx-auto h-8 w-8 text-muted-foreground/60" />
                                        <p className="text-sm">No hay transcripciones para este alumno.</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      {transcriptions.map((transcription) => (
                                        <Link
                                          key={transcription.id}
                                          href={`/transcription/${transcription.id}`}
                                          className="block rounded-lg border border-border/60 bg-card/50 p-4 transition-all duration-200 hover:bg-card/80 hover:shadow-sm"
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              <FileText className="h-5 w-5 text-primary" />
                                              <div>
                                                <h4 className="font-medium text-foreground">
                                                  {transcription.name || `Transcripción ${transcription.id.slice(0, 8)}`}
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
}
