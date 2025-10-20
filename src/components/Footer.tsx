"use client";

import Link from "next/link";
import { Mail, Instagram, Twitter, Youtube, Linkedin, ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-gray-50 text-gray-900 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Products Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
              Productes
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/transcribe" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Transcripció automàtica
                </Link>
              </li>
              <li>
                <Link href="/annotate" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Editor d'anotacions
                </Link>
              </li>
              <li>
                <Link href="/library" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Biblioteca de sessions
                </Link>
              </li>
              <li>
                <Link href="/organization" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Gestió d'equips
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Panell de control
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
              Recursos
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/help" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Centre d'ajuda
                </Link>
              </li>
              <li>
                <Link href="/tutorials" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Tutorials
                </Link>
              </li>
              <li>
                <Link href="/api-docs" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Documentació API
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Learn Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
              Aprèn
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/guides/getting-started" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Guia d'inici
                </Link>
              </li>
              <li>
                <Link href="/guides/best-practices" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Millors pràctiques
                </Link>
              </li>
              <li>
                <Link href="/guides/speech-therapy" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Logopèdia digital
                </Link>
              </li>
              <li>
                <Link href="/webinars" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Webinars
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
              Empresa
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Sobre nosaltres
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Preus
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Contacte
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Treballa amb nosaltres
                </Link>
              </li>
            </ul>

            {/* Legal Links */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                Legal
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/terms" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                    Termes del servei
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                    Política de privacitat
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-300 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            {/* Copyright and Contact */}
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6">
              <p className="text-gray-600 text-sm">
                © 2025 Transcriu — Tots els drets reservats
              </p>
              <a 
                href="mailto:hola@transcriu.app" 
                className="text-gray-600 hover:text-gray-900 transition-colors text-sm flex items-center"
              >
                <Mail className="h-4 w-4 mr-1" />
                ajuda@transcriu.com
              </a>
            </div>
          {/* Rating/Review Section */}
          <div className="flex justify-center mt-6">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400">★</span>
                ))}
                <span className="ml-2 font-medium">4.9</span>
              </div>
              <span>•</span>
              <span>Valorat per professionals de la logopèdia</span>
            </div>
          </div>
          </div>

        </div>
      </div>
    </footer>
  );
}