'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';

interface Testimonial {
  name: string;
  role: string;
  text: string;
  image?: string;
}

interface TestimonialsProps {
  testimonials?: Testimonial[];
}

export function Testimonials({ testimonials }: TestimonialsProps) {
  const t = useTranslations('testimonials');
  const items = testimonials || (t.raw('items') as Testimonial[]);
  if (items.length === 0) return null;

  const lead = items[0];
  const rest = items.slice(1, 4);

  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm">
          <span className="inline-flex size-1.5 rounded-full bg-indigo-500" />
          Testimonials
        </span>
        <h2 className="mt-4 text-3xl font-normal tracking-tight text-neutral-900 sm:text-4xl">
          {t('title')}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-neutral-600">
          {t('subtitle')}
        </p>

        <blockquote className="mx-auto mt-12 max-w-2xl text-xl leading-relaxed text-neutral-800">
          “{lead.text}”
        </blockquote>

        <div className="mt-8 flex items-center justify-center gap-3">
          {lead.image ? (
            <Image
              src={lead.image}
              alt={lead.name}
              width={36}
              height={36}
              className="size-9 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400 text-sm font-medium text-white">
              {lead.name.charAt(0)}
            </div>
          )}
          <div className="text-left text-sm">
            <p className="font-medium text-neutral-900">{lead.name}</p>
            <p className="text-neutral-500">{lead.role}</p>
          </div>
        </div>
      </div>

      {rest.length > 0 && (
        <div className="mt-20 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {rest.map((item, i) => (
            <figure key={i} className="text-left">
              <blockquote className="text-sm leading-relaxed text-neutral-700">
                “{item.text}”
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={32}
                    height={32}
                    className="size-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-8 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-700">
                    {item.name.charAt(0)}
                  </div>
                )}
                <div className="text-xs">
                  <p className="font-medium text-neutral-900">{item.name}</p>
                  <p className="text-neutral-500">{item.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <p className="mt-16 text-center text-xs text-neutral-500">{t('trustBadge')}</p>
    </section>
  );
}
