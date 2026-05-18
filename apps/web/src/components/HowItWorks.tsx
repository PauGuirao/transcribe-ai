'use client';

import { useTranslations } from 'next-intl';
import { Upload, FileText, Download, FileType2, Mail, HardDrive } from 'lucide-react';

type StepKey = 'step1' | 'step2' | 'step3';

function CheckIcon() {
  return (
    <svg className="mt-0.5 size-4 shrink-0 text-emerald-600" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 10.5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UploadVisual({ label }: { label: string }) {
  return (
    <div className="relative h-[280px] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="absolute inset-4 flex items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-neutral-200">
            <Upload className="size-5 text-neutral-700" />
          </div>
          <p className="text-sm text-neutral-600">{label}</p>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-1.5 shadow-sm">
            <FileType2 className="size-3.5 text-indigo-600" />
            <span className="font-mono text-xs text-neutral-700">sessio.mp3</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TranscribeVisual({ durationLabel, accuracyLabel, speakerA, speakerB }: { durationLabel: string; accuracyLabel: string; speakerA: string; speakerB: string }) {
  return (
    <div className="relative h-[280px] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm p-5">
      <div className="space-y-3 text-sm">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">{speakerA}</p>
          <p className="mt-1 text-neutral-800">Avui treballarem la pronunciació de la lletra R.</p>
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">{speakerB}</p>
          <p className="mt-1 text-neutral-800">D'acord! He estat practicant a casa.</p>
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">{speakerA}</p>
          <p className="mt-1 text-neutral-800">Perfecte. Provem amb: "roda", "ratolí".</p>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between border-t border-neutral-100 bg-neutral-50/80 px-5 py-2.5 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
        <span>{durationLabel}: 5:12</span>
        <span>{accuracyLabel}: 98.5%</span>
      </div>
    </div>
  );
}

function ExportVisual({ pdfLabel, docxLabel, gmailLabel, driveLabel }: { pdfLabel: string; docxLabel: string; gmailLabel: string; driveLabel: string }) {
  const items = [
    { icon: <FileText className="size-4 text-rose-500" />, label: pdfLabel },
    { icon: <FileText className="size-4 text-indigo-500" />, label: docxLabel },
    { icon: <Mail className="size-4 text-rose-600" />, label: gmailLabel },
    { icon: <HardDrive className="size-4 text-emerald-600" />, label: driveLabel },
  ];
  return (
    <div className="relative h-[280px] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm p-5">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">Export</span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
          <Download className="size-3" /> Ready
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white p-3 text-xs text-neutral-700">
            {item.icon}
            <span className="truncate">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HowItWorks() {
  const t = useTranslations('howItWorks');
  const t2 = useTranslations('transcriptionExample');

  const pillars: Array<{ key: StepKey; visual: React.ReactNode }> = [
    {
      key: 'step1',
      visual: <UploadVisual label={t('step1.dropzone')} />,
    },
    {
      key: 'step2',
      visual: (
        <TranscribeVisual
          durationLabel={t('step2.duration')}
          accuracyLabel={t('step2.accuracy')}
          speakerA={t2('speaker1')}
          speakerB={t2('speaker2')}
        />
      ),
    },
    {
      key: 'step3',
      visual: (
        <ExportVisual
          pdfLabel={t('step3.exportPDF')}
          docxLabel={t('step3.exportDOCX')}
          gmailLabel={t('step3.sendGmail')}
          driveLabel={t('step3.saveDrive')}
        />
      ),
    },
  ];

  return (
    <section id="how-it-works" className="mx-auto max-w-5xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm">
          <span className="inline-flex size-1.5 rounded-full bg-indigo-500" />
          How it works
        </span>
        <h2 className="mt-4 text-3xl font-normal tracking-tight text-neutral-900 sm:text-4xl">
          {t('title')}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-neutral-600">
          {t('description')}
        </p>
      </div>

      <div className="mt-20 flex flex-col gap-24">
        {pillars.map((pillar, idx) => {
          const items = t.raw(`${pillar.key}.items`) as string[];
          return (
            <div
              key={pillar.key}
              className="grid grid-cols-1 items-center gap-12 md:grid-cols-2"
            >
              <div className={idx % 2 === 1 ? 'md:order-2' : ''}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm">
                  <span className="inline-flex size-1.5 rounded-full bg-indigo-500" />
                  {t(`${pillar.key}.number`)}
                </span>
                <h3 className="mt-4 text-2xl font-normal tracking-tight text-neutral-900 sm:text-3xl">
                  {t(`${pillar.key}.title`)}
                </h3>
                <p className="mt-4 text-base leading-relaxed text-neutral-600">
                  {t(`${pillar.key}.description`)}
                </p>
                <ul className="mt-6 flex flex-col gap-3 text-sm text-neutral-700">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckIcon />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={idx % 2 === 1 ? 'md:order-1' : ''}>{pillar.visual}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
