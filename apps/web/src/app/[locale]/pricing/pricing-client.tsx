"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Pricing } from "@/components/Pricing";
import { FAQ } from "@/components/FAQ";
import { useStartCheckout } from "@/hooks/useStartCheckout";

export default function PricingClient() {
  const { loading: authLoading } = useAuth();
  const { startCheckout, loading } = useStartCheckout();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Pricing
          authLoading={authLoading}
          loading={loading}
          onPrimaryAction={startCheckout}
        />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
