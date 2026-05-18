'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Minus } from 'lucide-react';

export function FAQ() {
  const t = useTranslations('faq');
  const [expanded, setExpanded] = useState<number | null>(0);
  const questions = t.raw('questions') as Array<{ question: string; answer: string }>;

  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm">
          <span className="inline-flex size-1.5 rounded-full bg-indigo-500" />
          {t('badge')}
        </span>
        <h2 className="mt-4 text-3xl font-normal tracking-tight text-neutral-900 sm:text-4xl">
          {t('title')}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-neutral-600">
          {t('subtitle')}
        </p>
      </div>

      <ul className="mt-12 divide-y divide-neutral-200 border-y border-neutral-200">
        {questions.map((faq, i) => {
          const open = expanded === i;
          const panelId = `faq-panel-${i}`;
          const buttonId = `faq-button-${i}`;
          return (
            <li key={i}>
              <h3>
                <button
                  id={buttonId}
                  onClick={() => setExpanded(open ? null : i)}
                  aria-expanded={open}
                  aria-controls={panelId}
                  className="flex w-full items-start justify-between gap-6 py-5 text-left text-base font-medium text-neutral-900"
                >
                  <span>{faq.question}</span>
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500"
                  >
                    {open ? <Minus className="size-3.5" /> : <Plus className="size-3.5" />}
                  </span>
                </button>
              </h3>
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                hidden={!open}
                className="pb-6 pr-12 text-sm leading-relaxed text-neutral-600"
              >
                {faq.answer}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-12 text-center">
        <p className="text-sm text-neutral-600">{t('ctaLabel')}</p>
        <button
          onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
          className="mt-2 text-sm font-medium text-neutral-900 underline-offset-4 hover:underline"
        >
          {t('ctaButton')} →
        </button>
      </div>
    </section>
  );
}
