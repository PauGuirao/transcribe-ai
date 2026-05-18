"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from 'next-intl';
import Image from "next/image";

export function Footer() {
  const t = useTranslations('footer');

  const columns = [
    {
      title: t('products.title'),
      links: [
        { href: '/transcribe', label: t('products.transcription') },
        { href: '/annotate', label: t('products.editor') },
        { href: '/library', label: t('products.library') },
        { href: '/organization', label: t('products.teams') },
      ],
    },
    {
      title: t('resources.title'),
      links: [
        { href: '/help', label: t('resources.help') },
        { href: '/tutorials', label: t('resources.tutorials') },
        { href: '/blog', label: t('resources.blog') },
      ],
    },
    {
      title: t('company.title'),
      links: [
        { href: '/pricing', label: t('company.pricing') },
        { href: '/contact', label: t('company.contact') },
        { href: '/terms', label: t('legal.terms') },
        { href: '/privacy', label: t('legal.privacy') },
      ],
    },
  ];

  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2">
              <Image src="/logo3.png" alt="Transcriu" width={24} height={24} />
              <span className="text-sm font-semibold tracking-tight text-neutral-900">transcriu</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-neutral-500">
              {t('copyright')}
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-neutral-700 transition-colors hover:text-neutral-900">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-neutral-100 pt-8 text-xs text-neutral-500 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Transcriu</p>
          <div className="flex items-center gap-4">
            <span>★ 4.9 · {t('rating')}</span>
            <a href="mailto:pau@transcriu.com" className="hover:text-neutral-900">pau@transcriu.com</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
