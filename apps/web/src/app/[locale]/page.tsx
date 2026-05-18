"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Features } from "@/components/Features";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Pricing } from "@/components/Pricing";
import { Testimonials } from "@/components/Testimonials";
import { CTA } from "@/components/CTA";
import { FAQ } from "@/components/FAQ";
import { LandingPageSchemas, defaultFAQs } from "@/components/seo/LandingPageSchemas";
import { useParams } from "next/navigation";
import { useStartCheckout } from "@/hooks/useStartCheckout";

export default function Home() {
  const { loading: authLoading } = useAuth();
  const params = useParams();
  const locale = (params?.locale as string) || 'es';
  const { startCheckout, loading } = useStartCheckout();

  return (
    <div className="min-h-screen bg-white">
      <LandingPageSchemas faqs={defaultFAQs[locale as keyof typeof defaultFAQs] || defaultFAQs.ca} />

      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <Testimonials />
        <FAQ />
        <Pricing
          authLoading={authLoading}
          loading={loading}
          onPrimaryAction={startCheckout}
        />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
