'use client';

import { useTranslations } from 'next-intl';
import { Library, Users, Layers, Highlighter, type LucideIcon } from 'lucide-react';

type FeatureKey = 'library' | 'students' | 'groups' | 'annotations';

const ICONS: Record<FeatureKey, LucideIcon> = {
  library: Library,
  students: Users,
  groups: Layers,
  annotations: Highlighter,
};

export function Features() {
  const t = useTranslations('features');
  const keys: FeatureKey[] = ['library', 'students', 'groups', 'annotations'];

  return (
    <section id="features" className="mx-auto max-w-5xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm">
          <span className="inline-flex size-1.5 rounded-full bg-indigo-500" />
          Features
        </span>
        <h2 className="mt-4 text-3xl font-normal tracking-tight text-neutral-900 sm:text-4xl">
          {t('title')}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-neutral-600">
          {t('description')}
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {keys.map((key) => {
          const Icon = ICONS[key];
          return (
            <div
              key={key}
              className="group rounded-xl border border-neutral-200 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50">
                  <Icon className="size-4 text-neutral-700" />
                </div>
                <h3 className="text-base font-semibold text-neutral-900">
                  {t(`${key}.title`)}
                </h3>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-neutral-600">
                {t(`${key}.description`)}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
