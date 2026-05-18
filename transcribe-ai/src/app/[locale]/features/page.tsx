import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import featuresJson from "./features.json";
import { ArrowRight } from "lucide-react";

const features = featuresJson as Record<
  string,
  {
    title: string;
    metaDescription: string;
    heroTitle: string;
    heroDescription: string;
    icon?: string;
  }
>;

export const metadata: Metadata = {
  title: "Totes les funcionalitats | Transcriu",
  description:
    "Descobreix totes les funcionalitats de Transcriu: transcripció automàtica, diarització, anotacions, gestió de pacients, grups col·laboratius i més.",
  keywords: [
    "funcionalitats transcriu",
    "característiques logopèdia",
    "eines logopedes",
    "transcripció automàtica",
    "gestió pacients",
  ],
  openGraph: {
    title: "Totes les funcionalitats | Transcriu",
    description:
      "Descobreix totes les funcionalitats de Transcriu per a logopedes professionals.",
    type: "website",
    url: "https://www.transcriu.com/features",
    images: ["https://www.transcriu.com/og-image.jpg"],
  },
};

export default function FeaturesIndexPage() {
  const featureEntries = Object.entries(features);

  return (
    <div className="min-h-screen bg-gray-20">
      <div id="nav-sentinel" className="h-1" />
      <Navbar onContactClick={() => {}} />

      <main className="mx-auto w-full max-w-7xl px-6 pb-24 pt-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Totes les funcionalitats de Transcriu
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Descobreix com Transcriu et pot ajudar a optimitzar la teva pràctica
            professional de logopèdia amb tecnologia d'intel·ligència artificial
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureEntries.map(([slug, feature]) => (
            <Link
              key={slug}
              href={`/features/${slug}`}
              className="group bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-xl hover:border-blue-300 transition-all duration-300"
            >
              {/* Icon */}
              {feature.icon && (
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform shadow-md">
                  {feature.icon}
                </div>
              )}

              {/* Title */}
              <h2 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                {feature.heroTitle}
              </h2>

              {/* Description */}
              <p className="text-gray-600 leading-relaxed mb-4 line-clamp-3">
                {feature.heroDescription}
              </p>

              {/* CTA */}
              <div className="flex items-center text-blue-600 font-semibold group-hover:gap-2 transition-all">
                <span>Saber més</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 md:p-12 text-center border border-blue-200">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Comença a utilitzar Transcriu avui
          </h2>
          <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
            Totes aquestes funcionalitats estan disponibles en el nostre pla
            Individual. Prova gratuïtament i descobreix com podem millorar la
            teva pràctica professional.
          </p>
          <Link
            href="/auth/signin"
            className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all"
          >
            Prova gratuïtament →
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
