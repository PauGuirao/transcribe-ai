import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ClientLanding from "./ClientLanding";
import landingsJson from "../landings.json";

// Landing content registry based on main landing components
const landings = landingsJson as Record<
  string,
  {
    title: string;
    heroTitle: string;
    heroDescription: string;
    description: string;
    keywords?: string[];
  }
>;

export async function generateStaticParams() {
  return Object.keys(landings).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const landing = landings[slug as keyof typeof landings];
  if (!landing) return {};
  const title = `${landing.title} | transcriu`;
  return {
    title,
    description: landing.description,
    keywords: landing.keywords,
    openGraph: {
      title,
      description: landing.description,
      type: "article",
      url: `https://transcriu.cat/landings/${slug}`,
      images: ["/next.svg"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: landing.description,
      images: ["/next.svg"],
    },
  };
}

interface LandingPageProps {
  params: { slug: string };
}

export default async function LandingPage({ params }: LandingPageProps) {
  const { slug } = await params;
  const landing = landings[slug as keyof typeof landings];
  if (!landing) {
    notFound();
  }
  return <ClientLanding landing={landing} />;
}
