'use client';

import React from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import WhatsAppButton from '@/components/WhatsAppButton';
import { Mic, PencilLine, Library, ArrowRight } from 'lucide-react';

const DashboardPage = React.memo(function DashboardPage() {
  const tools = [
    { title: 'Transcripció', desc: 'Converteix el teu àudio a text amb IA', href: '/transcribe', Icon: Mic },
    { title: 'Anotació', desc: 'Edita, marca i organitza la transcripció', href: '/annotate', Icon: PencilLine },
    { title: 'Biblioteca', desc: 'Gestiona tots els teus àudios i transcripcions', href: '/library', Icon: Library },
  ] as const;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4">
        {/* Capçalera */}
        <div className="text-center">
          <h2 className="mt-20 text-2xl font-bold text-gray-900">Què faràs avui?</h2>
          <p className="mt-2 text-gray-600">Tria una de les nostres eines per començar el teu projecte</p>
        </div>

        {/* Blocs */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center p-5">
          {tools.map(({ title, desc, href, Icon }) => (
            <Link key={title} href={href} className="group block w-full max-w-[520px]" aria-label={title}>
              <div className="rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-gray-300">
                <div className="flex items-start gap-4">
                  {/* Pastilla taronja */}
                  <div className="h-10 w-10 rounded-xl bg-gray-500 text-white grid place-content-center shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Text */}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 leading-snug">{title}</h3>
                    <p className="text-sm text-gray-600 leading-snug">{desc}</p>
                  </div>

                  {/* Fletxa amb micro-animació */}
                  <ArrowRight className="h-5 w-5 text-gray-400 transition-transform duration-200 ease-out group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <WhatsAppButton />
    </AppLayout>
  );
});

export default DashboardPage;