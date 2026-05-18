import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import featuresJson from "./features.json";
import {
  ArrowRight,
  AudioLines,
  UsersRound,
  Highlighter,
  Library,
  UserCog,
  Layers,
  FileDown,
  Sparkles,
  Check,
  ShieldCheck,
  Clock,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  JsonLd,
  generateBreadcrumbSchema,
  generateItemListSchema,
} from "@/components/seo/JsonLd";
import { generatePageHreflang } from "@/components/seo/HreflangTags";

const BASE_URL = "https://www.transcriu.com";
const LOCALES = ["ca", "es", "en"] as const;
type LocaleCode = (typeof LOCALES)[number];

const isLocale = (l: string): l is LocaleCode =>
  (LOCALES as readonly string[]).includes(l);

const FEATURE_ICONS: Record<string, LucideIcon> = {
  "transcripcion-automatica": AudioLines,
  "diarizacion-interlocutores": UsersRound,
  "anotaciones-inteligentes": Highlighter,
  "biblioteca-transcripciones": Library,
  "gestion-pacientes": UserCog,
  "grupos-colaborativos": Layers,
  "exportar-transcripciones": FileDown,
};

const STAT_ICONS = {
  accuracy: Sparkles,
  users: Users,
  savings: Clock,
  gdpr: ShieldCheck,
} as const;

const FEATURED_SLUG = "transcripcion-automatica";
const SECTIONS = {
  ai: ["diarizacion-interlocutores", "anotaciones-inteligentes"],
  organization: ["biblioteca-transcripciones", "gestion-pacientes"],
  team: ["grupos-colaborativos", "exportar-transcripciones"],
} as const;

const BREADCRUMB_HOME: Record<LocaleCode, string> = {
  ca: "Inici",
  es: "Inicio",
  en: "Home",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const lc: LocaleCode = isLocale(locale) ? locale : "ca";
  const t = await getTranslations({ locale: lc, namespace: "featuresPage" });

  const metaTitle = t("metaTitle");
  const description = t("metaDescription");
  const fullTitle = `${metaTitle} | Transcriu`;

  return {
    title: { absolute: fullTitle },
    description,
    openGraph: {
      title: fullTitle,
      description,
      type: "website",
      url: `${BASE_URL}/${lc}/features`,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
    alternates: generatePageHreflang({ currentLocale: lc, path: "/features" }),
  };
}

interface FeaturesIndexPageProps {
  params: Promise<{ locale: string }>;
}

export default async function FeaturesIndexPage({
  params,
}: FeaturesIndexPageProps) {
  const { locale } = await params;
  const lc: LocaleCode = isLocale(locale) ? locale : "ca";
  const t = await getTranslations({ locale: lc, namespace: "featuresPage" });

  const allSlugs = Object.keys(featuresJson);

  const breadcrumbSchema = generateBreadcrumbSchema({
    items: [
      { name: BREADCRUMB_HOME[lc], url: `${BASE_URL}/${lc}` },
      { name: t("hero.eyebrow"), url: `${BASE_URL}/${lc}/features` },
    ],
  });

  const itemListSchema = generateItemListSchema({
    name: t("metaTitle"),
    items: allSlugs.map((slug, i) => ({
      position: i + 1,
      name: t(`items.${slug}.title`),
      url: `${BASE_URL}/${lc}/features/${slug}`,
      description: t(`items.${slug}.description`),
    })),
  });

  const stats = (["accuracy", "users", "savings", "gdpr"] as const).map(
    (key) => ({
      key,
      value: t(`stats.${key}.value`),
      label: t(`stats.${key}.label`),
      Icon: STAT_ICONS[key],
    }),
  );

  const featuredBullets = t.raw(`items.${FEATURED_SLUG}.bullets`) as string[];
  const proofMetrics = t.raw("proof.metrics") as Array<{
    value: string;
    label: string;
  }>;

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={itemListSchema} />
      <div id="nav-sentinel" className="h-1" />
      <Navbar />

      <main>
        {/* Hero */}
        <section className="relative isolate overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-grid-lines bg-grid-fade"
            aria-hidden="true"
          />
          <div className="mx-auto max-w-4xl px-6 pt-20 pb-12 text-center sm:pt-28">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm">
              <span className="inline-flex size-1.5 rounded-full bg-indigo-500" />
              {t("hero.eyebrow")}
            </span>
            <h1 className="mt-4 text-4xl font-normal tracking-tight text-neutral-900 sm:text-5xl md:text-6xl">
              {t("hero.title")}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-neutral-600 sm:text-lg">
              {t("hero.description")}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/auth/signin"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-6 text-sm font-medium text-white transition-colors hover:bg-neutral-800 sm:w-auto"
              >
                {t("hero.primaryCta")}
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/#pricing"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-6 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50 sm:w-auto"
              >
                {t("hero.secondaryCta")}
              </Link>
            </div>
          </div>

          {/* Stats strip */}
          <div className="mx-auto max-w-5xl px-6 pb-16">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 sm:grid-cols-4">
              {stats.map(({ key, value, label, Icon }) => (
                <div
                  key={key}
                  className="flex flex-col items-center gap-2 bg-white px-4 py-6 text-center"
                >
                  <div className="flex size-8 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50">
                    <Icon className="size-4 text-neutral-700" />
                  </div>
                  <div className="text-2xl font-medium tracking-tight text-neutral-900">
                    {value}
                  </div>
                  <div className="text-xs leading-tight text-neutral-600">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section: AI & Transcription (featured + 2 side) */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <SectionHeader
            eyebrow={t("sections.ai.eyebrow")}
            title={t("sections.ai.title")}
            description={t("sections.ai.description")}
          />

          <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Featured card */}
            <Link
              href={`/features/${FEATURED_SLUG}`}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white p-8 transition-shadow hover:shadow-md lg:col-span-2"
            >
              <DecorativeWaveform />

              <div className="relative">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-700">
                  <Sparkles className="size-3" />
                  {t("featuredBadge")}
                </span>

                <div className="mt-5 flex size-11 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50">
                  <AudioLines className="size-5 text-neutral-700" />
                </div>

                <h3 className="mt-6 text-2xl font-normal tracking-tight text-neutral-900 sm:text-3xl">
                  {t(`items.${FEATURED_SLUG}.title`)}
                </h3>
                <p className="mt-3 max-w-lg text-base leading-relaxed text-neutral-600">
                  {t(`items.${FEATURED_SLUG}.description`)}
                </p>

                <ul className="mt-6 space-y-2">
                  {featuredBullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-start gap-2 text-sm text-neutral-700"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-neutral-900" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-900">
                  {t("learnMore")}
                  <ArrowRight className="size-3.5 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>

            {/* Side stack */}
            <div className="flex flex-col gap-4">
              {SECTIONS.ai.map((slug) => (
                <FeatureCard
                  key={slug}
                  slug={slug}
                  title={t(`items.${slug}.title`)}
                  description={t(`items.${slug}.description`)}
                  tag={t(`items.${slug}.tag`)}
                  learnMore={t("learnMore")}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Section: Organization */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <SectionHeader
            eyebrow={t("sections.organization.eyebrow")}
            title={t("sections.organization.title")}
            description={t("sections.organization.description")}
          />
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {SECTIONS.organization.map((slug) => (
              <FeatureCard
                key={slug}
                slug={slug}
                title={t(`items.${slug}.title`)}
                description={t(`items.${slug}.description`)}
                tag={t(`items.${slug}.tag`)}
                learnMore={t("learnMore")}
              />
            ))}
          </div>
        </section>

        {/* Section: Team & Export */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <SectionHeader
            eyebrow={t("sections.team.eyebrow")}
            title={t("sections.team.title")}
            description={t("sections.team.description")}
          />
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {SECTIONS.team.map((slug) => (
              <FeatureCard
                key={slug}
                slug={slug}
                title={t(`items.${slug}.title`)}
                description={t(`items.${slug}.description`)}
                tag={t(`items.${slug}.tag`)}
                learnMore={t("learnMore")}
              />
            ))}
          </div>
        </section>

        {/* Social proof */}
        <section className="mx-auto max-w-5xl px-6 pb-24">
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-10 text-center md:p-14">
            <h2 className="text-2xl font-normal tracking-tight text-neutral-900 sm:text-3xl">
              {t("proof.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-neutral-600">
              {t("proof.subtitle")}
            </p>
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
              {proofMetrics.map((m) => (
                <div key={m.label}>
                  <div className="text-3xl font-normal tracking-tight text-neutral-900 sm:text-4xl">
                    {m.value}
                  </div>
                  <div className="mt-1 text-sm text-neutral-600">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-5xl px-6 pb-24">
          <div className="relative overflow-hidden rounded-2xl bg-neutral-900 p-10 text-center text-white md:p-14">
            <DecorativeRings />
            <div className="relative">
              <h2 className="text-3xl font-normal tracking-tight sm:text-4xl">
                {t("cta.title")}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-neutral-300">
                {t("cta.description")}
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/auth/signin"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-white px-6 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-100 sm:w-auto"
                >
                  {t("cta.primary")}
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/#pricing"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-neutral-700 bg-transparent px-6 text-sm font-medium text-white transition-colors hover:bg-neutral-800 sm:w-auto"
                >
                  {t("cta.secondary")}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm">
        <span className="inline-flex size-1.5 rounded-full bg-indigo-500" />
        {eyebrow}
      </span>
      <h2 className="mt-4 text-3xl font-normal tracking-tight text-neutral-900 sm:text-4xl">
        {title}
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-neutral-600">
        {description}
      </p>
    </div>
  );
}

function FeatureCard({
  slug,
  title,
  description,
  tag,
  learnMore,
}: {
  slug: string;
  title: string;
  description: string;
  tag: string;
  learnMore: string;
}) {
  const Icon = FEATURE_ICONS[slug] ?? Sparkles;
  return (
    <Link
      href={`/features/${slug}`}
      className="group flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-6 transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className="flex size-10 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50">
          <Icon className="size-5 text-neutral-700" />
        </div>
        <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
          {tag}
        </span>
      </div>
      <h3 className="mt-5 text-base font-semibold text-neutral-900">{title}</h3>
      <p className="mt-2 flex-grow text-sm leading-relaxed text-neutral-600">
        {description}
      </p>
      <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-900">
        {learnMore}
        <ArrowRight className="size-3.5 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function DecorativeWaveform() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 480 120"
      className="pointer-events-none absolute right-0 bottom-0 w-[60%] max-w-[420px] text-neutral-200 opacity-70"
      fill="none"
      preserveAspectRatio="xMaxYMax meet"
    >
      {Array.from({ length: 48 }).map((_, i) => {
        const x = i * 10;
        const seed = Math.sin(i * 1.3) * 0.5 + Math.cos(i * 0.7) * 0.5;
        const h = 16 + Math.abs(seed) * 80;
        const y = 60 - h / 2;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width="3"
            height={h}
            rx="1.5"
            fill="currentColor"
          />
        );
      })}
    </svg>
  );
}

function DecorativeRings() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 400"
      className="pointer-events-none absolute -right-24 -top-24 size-[420px] text-white/5"
      fill="none"
    >
      <circle cx="200" cy="200" r="80" stroke="currentColor" strokeWidth="1" />
      <circle cx="200" cy="200" r="130" stroke="currentColor" strokeWidth="1" />
      <circle cx="200" cy="200" r="180" stroke="currentColor" strokeWidth="1" />
      <circle cx="200" cy="200" r="230" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
