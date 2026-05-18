'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { PageSkeleton } from '@/components/layout/states/PageSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  Plus,
  User,
  UserPlus,
  Calendar,
  AlertCircle,
  FileText,
  ChevronRight,
  GraduationCap,
  Mic,
  CheckCircle2,
  Hourglass,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlumneProfile {
  id: string;
  name: string;
  age: number | null;
  created_at: string;
  updated_at: string;
}

interface AudioFile {
  id: string;
  originalName?: string;
  customName?: string;
  uploadDate: string;
  status: 'completed' | 'processing' | 'failed' | 'pending' | 'uploaded' | string;
  /**
   * The alumne link historically lives on TWO tables:
   *   - `audios.alumne_id`         → exposed as `alumneId` (top-level)
   *   - `transcriptions.alumne_id` → exposed as `transcription.alumneId`
   * The UI writes only to the transcription one, so we must check both.
   */
  alumneId?: string | null;
  durationSeconds?: number | null;
  transcription?: { alumneId?: string | null } | null;
}

/** Effective alumne id for an audio — checks both possible link locations. */
function effectiveAlumneId(a: AudioFile): string | null {
  return a.alumneId ?? a.transcription?.alumneId ?? null;
}

const ProfilesPage = React.memo(function ProfilesPage() {
  const [profiles, setProfiles] = useState<AlumneProfile[]>([]);
  const [audios, setAudios] = useState<AudioFile[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Create-alumne sheet state
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [ageError, setAgeError] = useState<string | null>(null);

  // Detail drawer state
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /* ----------------------------- Data fetching ---------------------------- */

  const fetchData = async () => {
    setLoading(true);
    setListError(null);
    try {
      const [profilesRes, audiosRes] = await Promise.all([
        fetch('/api/alumne', { cache: 'no-store' }),
        fetch('/api/audio', { cache: 'no-store' }),
      ]);
      if (!profilesRes.ok) throw new Error("No s'han pogut carregar els perfils");
      const profilesData = await profilesRes.json();
      setProfiles(profilesData.profiles || []);

      if (audiosRes.ok) {
        const audiosData = await audiosRes.json();
        setAudios(audiosData.audioFiles || []);
      } else {
        setAudios([]);
      }
    } catch (err) {
      setListError(err instanceof Error ? err.message : "No s'han pogut carregar els perfils");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ----------------------------- Derived state ---------------------------- */

  /** Map alumneId → list of audios assigned to that alumne. Computed once. */
  const audiosByAlumne = useMemo(() => {
    const map = new Map<string, AudioFile[]>();
    for (const a of audios) {
      const id = effectiveAlumneId(a);
      if (!id) continue;
      const arr = map.get(id) ?? [];
      arr.push(a);
      map.set(id, arr);
    }
    // Sort each list newest first.
    for (const arr of map.values()) {
      arr.sort((x, y) => new Date(y.uploadDate).getTime() - new Date(x.uploadDate).getTime());
    }
    return map;
  }, [audios]);

  const selected = useMemo(
    () => profiles.find((p) => p.id === selectedId) ?? null,
    [profiles, selectedId],
  );
  const selectedAudios = selectedId ? audiosByAlumne.get(selectedId) ?? [] : [];

  /* ----------------------------- Create flow ----------------------------- */

  const resetForm = () => {
    setName('');
    setAge('');
    setCreateError(null);
    setNameError(null);
    setAgeError(null);
  };

  const validateName = (value: string) => {
    if (!value.trim()) { setNameError('El nom és obligatori'); return false; }
    if (value.trim().length < 2) { setNameError('Mínim 2 caràcters'); return false; }
    setNameError(null);
    return true;
  };
  const validateAge = (value: string) => {
    if (value && value.trim()) {
      const n = Number(value);
      if (Number.isNaN(n) || n < 0 || n > 25) { setAgeError('Entre 0 i 25 anys'); return false; }
    }
    setAgeError(null);
    return true;
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateName(name) || !validateAge(age)) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/alumne', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), age: age ? Number(age) : null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "No s'ha pogut crear el perfil");
      }
      resetForm();
      setCreateOpen(false);
      await fetchData();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "No s'ha pogut crear el perfil");
    } finally {
      setCreating(false);
    }
  };

  /* ----------------------------- Helpers ---------------------------- */

  const getInitials = (n: string) =>
    n.split(' ').map((s) => s[0]).join('').toUpperCase().slice(0, 2);

  const avatarColor = (n: string) => {
    const colors = [
      'from-blue-400 to-blue-600',
      'from-emerald-400 to-emerald-600',
      'from-violet-400 to-violet-600',
      'from-amber-400 to-amber-600',
      'from-rose-400 to-rose-600',
      'from-cyan-400 to-cyan-600',
    ];
    return colors[n.charCodeAt(0) % colors.length];
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short', year: 'numeric' });

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds || seconds <= 0) return '—';
    if (seconds < 60) return `${Math.round(seconds)} s`;
    const totalMin = Math.round(seconds / 60);
    if (totalMin < 60) return `${totalMin} min`;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  };

  /* ----------------------------- Render ---------------------------- */

  return (
    <AppLayout>
      <div className="w-full px-8 py-6">
        {/* Page header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Alumnes</h1>
            <p className="mt-1 text-[13px] text-gray-500">
              Gestiona els perfils dels teus alumnes
            </p>
          </div>

          <Sheet
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (!open) resetForm();
            }}
          >
            <SheetTrigger asChild>
              <button className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-neutral-800">
                <Plus className="h-3.5 w-3.5" />
                Nou alumne
              </button>
            </SheetTrigger>
            <CreateSheet
              name={name}
              age={age}
              creating={creating}
              createError={createError}
              nameError={nameError}
              ageError={ageError}
              onNameChange={(v) => { setName(v); if (v.trim()) validateName(v); else setNameError(null); }}
              onAgeChange={(v) => { setAge(v); validateAge(v); }}
              onSubmit={handleCreate}
            />
          </Sheet>
        </div>

        {/* Error banner */}
        {listError && (
          <div className="mb-4 rounded-lg border border-red-100 bg-red-50 p-3">
            <p className="text-[13px] text-red-600">{listError}</p>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <PageSkeleton variant="list" count={6} hideHeader />
        ) : profiles.length === 0 ? (
          <EmptyState onAdd={() => setCreateOpen(true)} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50/50">
                  <TableHead className="h-10 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                    Alumne
                  </TableHead>
                  <TableHead className="h-10 w-24 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                    Edat
                  </TableHead>
                  <TableHead className="h-10 w-32 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                    Àudios
                  </TableHead>
                  <TableHead className="h-10 w-40 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                    Creat
                  </TableHead>
                  <TableHead className="h-10 w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => {
                  const count = audiosByAlumne.get(profile.id)?.length ?? 0;
                  return (
                    <TableRow
                      key={profile.id}
                      onClick={() => setSelectedId(profile.id)}
                      className="cursor-pointer border-b border-neutral-100 transition-colors hover:bg-neutral-50/60"
                    >
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-[12px] font-semibold text-white',
                              avatarColor(profile.name),
                            )}
                          >
                            {getInitials(profile.name)}
                          </div>
                          <span className="text-[14px] font-medium text-neutral-900">
                            {profile.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-[13px] text-neutral-600">
                        {profile.age !== null ? `${profile.age} anys` : '—'}
                      </TableCell>
                      <TableCell className="py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
                            count > 0
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-neutral-100 text-neutral-500',
                          )}
                        >
                          <Mic className="h-3 w-3" />
                          {count} {count === 1 ? 'àudio' : 'àudios'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-[13px] text-neutral-600">
                        {formatDate(profile.created_at)}
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <ChevronRight className="ml-auto h-4 w-4 text-neutral-400" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
        >
          {selected && (
            <DetailDrawerBody
              profile={selected}
              audios={selectedAudios}
              getInitials={getInitials}
              avatarColor={avatarColor}
              formatDate={formatDate}
              formatDuration={formatDuration}
            />
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
});

export default ProfilesPage;

/* ============================================================================ */
/* Subcomponents                                                                */
/* ============================================================================ */

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-200 bg-white py-16 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100">
        <GraduationCap className="h-7 w-7 text-neutral-400" />
      </div>
      <h3 className="mb-1 text-[15px] font-medium text-neutral-900">Cap alumne encara</h3>
      <p className="mx-auto mb-6 max-w-xs text-[13px] text-neutral-500">
        Crea el teu primer perfil d&apos;alumne per organitzar les transcripcions.
      </p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-neutral-800"
      >
        <Plus className="h-3.5 w-3.5" />
        Afegir alumne
      </button>
    </div>
  );
}

function CreateSheet({
  name, age, creating, createError, nameError, ageError,
  onNameChange, onAgeChange, onSubmit,
}: {
  name: string;
  age: string;
  creating: boolean;
  createError: string | null;
  nameError: string | null;
  ageError: string | null;
  onNameChange: (v: string) => void;
  onAgeChange: (v: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <SheetContent className="w-full border-l border-neutral-200 bg-white p-0 sm:max-w-md">
      <div className="border-b border-neutral-100 px-6 pb-5 pt-6">
        <div className="mb-1 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
            <UserPlus className="h-5 w-5 text-white" />
          </div>
          <div>
            <SheetTitle className="text-[15px] font-semibold text-neutral-900">Nou alumne</SheetTitle>
            <p className="text-[12px] text-neutral-500">Afegeix un perfil per organitzar</p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 px-6 py-5">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-[12px] font-semibold uppercase tracking-wide text-neutral-600">
            Nom
          </Label>
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <User className="h-4 w-4 text-neutral-400" />
            </div>
            <Input
              id="name"
              placeholder="Nom complet de l'alumne"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className={cn(
                'h-11 rounded-lg border-neutral-200 bg-white pl-10 text-[13px] shadow-sm transition-all focus:border-blue-300 focus:ring-2 focus:ring-blue-100',
                nameError && 'border-red-300 focus:border-red-400 focus:ring-red-100',
              )}
            />
          </div>
          {nameError && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-red-500">
              <AlertCircle className="h-3 w-3" />
              {nameError}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="age" className="text-[12px] font-semibold uppercase tracking-wide text-neutral-600">
            Edat <span className="font-normal normal-case text-neutral-400">(opcional)</span>
          </Label>
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <Calendar className="h-4 w-4 text-neutral-400" />
            </div>
            <Input
              id="age"
              type="number"
              min={0}
              max={25}
              placeholder="Edat en anys"
              value={age}
              onChange={(e) => onAgeChange(e.target.value)}
              className={cn(
                'h-11 rounded-lg border-neutral-200 bg-white pl-10 text-[13px] shadow-sm transition-all focus:border-blue-300 focus:ring-2 focus:ring-blue-100',
                ageError && 'border-red-300 focus:border-red-400 focus:ring-red-100',
              )}
            />
          </div>
          {ageError && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-red-500">
              <AlertCircle className="h-3 w-3" />
              {ageError}
            </p>
          )}
        </div>

        {createError && (
          <div className="rounded-lg border border-red-100 bg-red-50 p-3">
            <p className="flex items-center gap-2 text-[12px] text-red-600">
              <AlertCircle className="h-3.5 w-3.5" />
              {createError}
            </p>
          </div>
        )}

        <div className="pt-3">
          <Button
            type="submit"
            disabled={creating || !name.trim() || !!nameError || !!ageError}
            className={cn(
              'flex h-11 w-full items-center justify-center gap-2 rounded-lg text-[13px] font-medium transition-all',
              creating || !name.trim() || !!nameError || !!ageError
                ? 'cursor-not-allowed bg-neutral-100 text-neutral-400'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm hover:from-blue-600 hover:to-blue-700 hover:shadow-md',
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
          </Button>
        </div>

        <p className="pt-2 text-center text-[11px] text-neutral-400">
          Podràs assignar transcripcions a aquest alumne després de crear-lo.
        </p>
      </form>
    </SheetContent>
  );
}

function DetailDrawerBody({
  profile,
  audios,
  getInitials,
  avatarColor,
  formatDate,
  formatDuration,
}: {
  profile: AlumneProfile;
  audios: AudioFile[];
  getInitials: (s: string) => string;
  avatarColor: (s: string) => string;
  formatDate: (s: string) => string;
  formatDuration: (n: number | null | undefined) => string;
}) {
  const totalSeconds = audios.reduce((sum, a) => sum + (a.durationSeconds ?? 0), 0);
  const lastActivity = audios[0]?.uploadDate;
  return (
    <>
      {/* Header */}
      <div className="border-b border-neutral-200 bg-gradient-to-b from-white to-neutral-50 px-6 py-5">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-[18px] font-semibold text-white shadow-sm',
              avatarColor(profile.name),
            )}
          >
            {getInitials(profile.name)}
          </div>
          <div className="min-w-0 flex-1">
            <SheetTitle className="truncate text-[18px] font-semibold text-neutral-900">
              {profile.name}
            </SheetTitle>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-neutral-500">
              {profile.age !== null && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {profile.age} anys
                </span>
              )}
              <span>Creat {formatDate(profile.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Àudios" value={String(audios.length)} icon={<Mic className="h-3.5 w-3.5 text-blue-500" />} />
          <Stat label="Durada total" value={formatDuration(totalSeconds)} icon={<Hourglass className="h-3.5 w-3.5 text-emerald-500" />} />
          <Stat
            label="Darrera activitat"
            value={lastActivity ? formatDate(lastActivity) : '—'}
            icon={<Calendar className="h-3.5 w-3.5 text-violet-500" />}
          />
        </div>
      </div>

      {/* Audios list */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Transcripcions
          </h3>
          <span className="text-[11px] text-neutral-400">
            {audios.length} {audios.length === 1 ? 'àudio' : 'àudios'}
          </span>
        </div>

        {audios.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 py-10 text-center">
            <FileText className="mx-auto mb-2 h-6 w-6 text-neutral-300" />
            <p className="text-[13px] text-neutral-500">
              Cap àudio assignat encara
            </p>
            <p className="mt-1 text-[11px] text-neutral-400">
              Assigna transcripcions a aquest alumne des de la biblioteca.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {audios.map((a) => (
              <AudioRow
                key={a.id}
                audio={a}
                formatDate={formatDate}
                formatDuration={formatDuration}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
        {icon}
        {label}
      </div>
      <p className="truncate text-[13px] font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

function AudioRow({
  audio,
  formatDate,
  formatDuration,
}: {
  audio: AudioFile;
  formatDate: (s: string) => string;
  formatDuration: (n: number | null | undefined) => string;
}) {
  const title = audio.customName || audio.originalName || `Àudio ${audio.id.slice(0, 8)}`;
  const status = String(audio.status ?? '').toLowerCase();
  const statusBadge = (() => {
    if (status === 'completed') {
      return { label: 'Llest', className: 'bg-emerald-50 text-emerald-700', Icon: CheckCircle2 };
    }
    if (status === 'failed' || status === 'error') {
      return { label: 'Error', className: 'bg-rose-50 text-rose-700', Icon: XCircle };
    }
    if (status === 'processing' || status === 'transcribing') {
      return { label: 'Processant', className: 'bg-indigo-50 text-indigo-700', Icon: Loader2 };
    }
    return { label: 'Pendent', className: 'bg-neutral-100 text-neutral-600', Icon: Hourglass };
  })();
  const Icon = statusBadge.Icon;

  return (
    <Link
      href={`/transcribe?audioId=${audio.id}`}
      className="group flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-3 transition-all hover:border-neutral-300 hover:shadow-sm"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-blue-50">
        <FileText className="h-4 w-4 text-blue-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-neutral-900">{title}</p>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-neutral-500">
          <span>{formatDate(audio.uploadDate)}</span>
          {audio.durationSeconds ? (
            <>
              <span aria-hidden>·</span>
              <span>{formatDuration(audio.durationSeconds)}</span>
            </>
          ) : null}
        </div>
      </div>
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
          statusBadge.className,
        )}
      >
        <Icon className={cn('h-3 w-3', (status === 'processing' || status === 'transcribing') && 'animate-spin')} />
        {statusBadge.label}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300 transition-colors group-hover:text-neutral-500" />
    </Link>
  );
}
