"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Features } from "@/components/Features";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Pricing } from "@/components/Pricing";
import { Testimonials } from "@/components/Testimonials";
import { FAQ } from "@/components/FAQ";
import { LandingPageSchemas, defaultFAQs } from "@/components/seo/LandingPageSchemas";
import { useParams } from "next/navigation";
import { type PlanId, type BillingPeriod } from "@/config/pricing";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'ca';
  const [loading, setLoading] = useState(false);

  const handlePlanSelect = async (planId: PlanId, period: BillingPeriod, users?: number) => {
    // If free plan, go to signin/dashboard
    if (planId === 'free') {
      if (user) {
        router.push("/dashboard");
      } else {
        router.push("/auth/signin");
      }
      return;
    }

    // For paid plans, redirect to payment page with plan details
    if (user) {
      setLoading(true);
      const params = new URLSearchParams({
        plan: planId,
        period: period,
        ...(users && { users: users.toString() }),
      });
      router.push(`/payment?${params.toString()}`);
    } else {
      // Save plan selection and redirect to signin
      const params = new URLSearchParams({
        plan: planId,
        period: period,
        ...(users && { users: users.toString() }),
        redirect: 'payment',
      });
      router.push(`/auth/signin?${params.toString()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-20">
      {/* JSON-LD Structured Data for SEO */}
      <LandingPageSchemas faqs={defaultFAQs[locale as keyof typeof defaultFAQs] || defaultFAQs.ca} />

      <div id="nav-sentinel" className="h-1" />
      <Navbar />
      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl px-6 pb-24 pt-4">
        {/* Hero Section */}
        <Hero />

        {/* How It Works Section */}
        <HowItWorks />

        {/* Features Section */}
        <Features />

        {/* Testimonials Section */}
        <Testimonials />

        {/* FAQ Section */}
        <FAQ />

        {/* Pricing Section */}
        <Pricing
          authLoading={authLoading}
          loading={loading}
          onPrimaryAction={handlePlanSelect}
        />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
