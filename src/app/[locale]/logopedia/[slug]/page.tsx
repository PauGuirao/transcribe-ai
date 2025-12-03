import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ClientLanding from "./ClientLanding";
import landingsJson from "../landings-example.json";

// Landing content registry based on main landing components
const landings = landingsJson as Record<
  string,
  {
    title: string;
    metaDescription: string;
    heroTitle: string;
    heroDescription: string;
    description?: string;
    keywords?: string[];
    h2Sections?: Array<{
      title: string;
      content?: string;
      points?: string[];
      useCases?: string[];
    }>;
    faqs?: Array<{
      question: string;
      answer: string;
    }>;
    testimonials?: Array<{
      name: string;
      role: string;
      text: string;
      image?: string;
    }>;
    localInfo?: {
      city?: string;
      province?: string;
      region?: string;
      population?: string;
      speechTherapists?: string;
      hospitals?: string[];
      neighborhoods?: string[];
    };
    relatedServices?: string[];
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
    description: landing.metaDescription || landing.description,
    keywords: landing.keywords,
    openGraph: {
      title,
      description: landing.metaDescription || landing.description,
      type: "website",
      url: `https://www.transcriu.com/logopedia/${slug}`,
      images: ["https://www.transcriu.com/og-image.jpg"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: landing.metaDescription || landing.description,
      images: ["https://www.transcriu.com/og-image.jpg"],
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
