'use client'

import { useEffect, useState } from 'react'
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
import { Loader2, Plus, Users, RefreshCw } from 'lucide-react'

interface AlumneProfile {
  id: string
  name: string
  age: number | null
  created_at: string
  updated_at: string
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
  }

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!name.trim()) {
      setCreateError('El nombre es obligatorio')
      return
    }

    const numericAge = age ? Number(age) : null
    if (numericAge !== null && (Number.isNaN(numericAge) || numericAge < 0 || numericAge > 25)) {
      setCreateError('La edad debe estar entre 0 y 25 años')
      return
    }

    setCreating(true)
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
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
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
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Registrar nuevo alumno</SheetTitle>
                    <SheetDescription>
                      Ingresa nombre y edad para crear el perfil del alumno.
                    </SheetDescription>
                  </SheetHeader>
                  <form className="mt-6 space-y-4" onSubmit={handleCreate}>
                    <div className="space-y-2">
                      <Label htmlFor="alumne-name">Nombre</Label>
                      <Input
                        id="alumne-name"
                        placeholder="Nombre y apellidos"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alumne-age">Edad</Label>
                      <Input
                        id="alumne-age"
                        type="number"
                        min={0}
                        max={25}
                        placeholder="7"
                        value={age}
                        onChange={(event) => setAge(event.target.value)}
                      />
                    </div>
                    {createError && (
                      <p className="text-sm text-destructive">{createError}</p>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={creating} className="gap-2">
                        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Guardar alumno
                      </Button>
                    </div>
                  </form>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {listError && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {listError}
            </div>
          )}

          <Card>
            <CardContent className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : profiles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-muted-foreground/40 bg-muted/30 py-10 text-center text-muted-foreground">
                  Todavía no has registrado alumnos.
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border">
                  <table className="min-w-full divide-y divide-border bg-card">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Nombre</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Edad</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Creado</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Actualizado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-sm">
                      {profiles.map((profile) => (
                        <tr key={profile.id} className="hover:bg-muted/40">
                          <td className="px-4 py-3 font-medium text-foreground">{profile.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{profile.age ?? '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(profile.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(profile.updated_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
