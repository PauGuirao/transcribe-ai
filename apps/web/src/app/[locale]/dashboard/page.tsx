'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import WhatsAppButton from '@/components/WhatsAppButton';
import { NewTranscriptionModal } from '@/components/transcription/NewTranscriptionModal';
import { RecentTranscriptionsList, type RecentAudio } from '@/components/transcription/RecentTranscriptionsList';
import { useAuth } from '@/contexts/AuthContext';
import { AudioUploadResult } from '@/types';
import { Plus, ArrowRight } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, setPending] = useState<RecentAudio[]>([]);

  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0]
    || user?.email?.split('@')[0]
    || '';
  const greeting = greetingFor(new Date(), firstName);

  const handleSubmitted = (result: AudioUploadResult) => {
    setPending((prev) => [
      {
        id: result.audioId,
        originalName: result.originalName,
        status: 'transcribing',
        uploadDate: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  return (
    <AppLayout>
      <div className="w-full px-8 py-6">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-normal tracking-tight text-neutral-900 sm:text-4xl">
              {greeting}
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Aquestes són les teves transcripcions més recents.
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex h-10 items-center gap-2 self-start rounded-md bg-neutral-900 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800 sm:self-auto"
          >
            <Plus className="size-4" /> Nova transcripció
          </button>
        </header>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Recents
            </h2>
            <button
              onClick={() => router.push('/transcriptions')}
              className="inline-flex items-center gap-1 text-sm font-medium text-neutral-700 hover:text-neutral-900"
            >
              Veure totes <ArrowRight className="size-3.5" />
            </button>
          </div>

          <RecentTranscriptionsList
            limit={10}
            optimistic={pending}
            showSeeAll={false}
            emptyState={
              <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-6 py-12 text-center">
                <p className="text-sm font-medium text-neutral-900">Encara no has fet cap transcripció.</p>
                <p className="mt-1 text-xs text-neutral-500">Comença pujant el primer àudio.</p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-800"
                >
                  <Plus className="size-4" /> Nova transcripció
                </button>
              </div>
            }
          />
        </section>
      </div>

      <NewTranscriptionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmitted={handleSubmitted}
      />
      <WhatsAppButton />
    </AppLayout>
  );
}

function greetingFor(now: Date, firstName: string): string {
  const hour = now.getHours();
  const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const prefix = hour < 12 ? 'Bon dia' : hour < 20 ? 'Bona tarda' : 'Bona nit';
  return firstName ? `${prefix}, ${cap(firstName)}!` : `${prefix}!`;
}
