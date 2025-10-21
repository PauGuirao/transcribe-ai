"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";

interface NavbarProps {
  onContactClick?: () => void;
}

export function Navbar({ onContactClick }: NavbarProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    // Create a sentinel to observe the top of the page
    const sentinel = document.getElementById('nav-sentinel');
    if (!sentinel) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        // When the top sentinel is NOT visible, user has scrolled
        setIsScrolled(!entry.isIntersecting);
      },
      { root: null, threshold: 0.99 } // tweak threshold if you want earlier/later flip
    );

    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  const handlePrimaryAction = async () => {
    if (user) {
      router.push("/dashboard");
    } else {
      setLoading(true);
      router.push("/auth/signin");
    }
  };

  const handleContactClick = () => {
    if (onContactClick) {
      onContactClick();
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-2 z-40 backdrop-blur-sm">
      <div className="md:px-35 px-2">
        <div className={`mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-3 relative transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/95 border border-gray-300 shadow-sm rounded-xl mt-2' 
            : 'bg-transparent border-transparent'
        }`}>
          {/* Logo - Always on the left */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Image 
                src="/logo3.png" 
                alt="Transcriu Logo" 
                width={32} 
                height={32} 
                className="rounded-lg"
              />
              <h1 className="text-2xl font-bold text-gray-900">transcriu</h1>
            </Link>
          </div>
          
          {/* Desktop Navigation - Centered */}
          <nav className="hidden md:flex items-center space-x-8 absolute left-1/2 transform -translate-x-1/2">
            <Link 
              href="/blog"
              className="text-md text-gray-600 hover:text-gray-900 transition-all duration-300 cursor-pointer px-4 py-2 rounded-lg hover:bg-gray-50 hover:scale-105 transform"
            >
              Blog
            </Link>
            <button 
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-md text-gray-600 hover:text-gray-900 transition-all duration-300 cursor-pointer px-4 py-2 rounded-lg hover:bg-gray-50 hover:scale-105 transform"
            >
              Preus
            </button>
            <button 
              onClick={handleContactClick}
              className="text-md text-gray-600 hover:text-gray-900 transition-all duration-300 cursor-pointer px-4 py-2 rounded-lg hover:bg-gray-50 hover:scale-105 transform"
            >
              Contacte
            </button>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <Button variant="ghost" onClick={() => router.push("/dashboard")} className="text-sm h-9 px-4 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 hover:border-blue-300">
                Anar al panell
              </Button>
            ) : (
              <Button asChild variant="ghost" className="text-sm h-9 px-4 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 hover:border-blue-300">
                <Link href="/auth/signin">Inicia sessió</Link>
              </Button>
            )}
            <Button
              onClick={handlePrimaryAction}
              disabled={authLoading || loading}
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm h-9 px-4 font-medium shadow-sm"
            >
              {authLoading || loading ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin">⏳</span>
                  Preparant...
                </>
              ) : user ? (
                "Obrir Transcriu"
              ) : (
                "Comença"
              )}
            </Button>
          </div>

          {/* Mobile Menu Button - Always on the right */}
          <div className="md:hidden flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-600 hover:text-gray-900 p-2"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="border-b md:hidden bg-white/95 backdrop-blur-sm border-gray-200 shadow-sm">
          <div className="mx-auto max-w-7xl px-6 py-4">
            <nav className="flex flex-col space-y-3">
              <Link
                href="/blog"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-gray-600 hover:text-gray-900 text-left py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Blog
              </Link>
              <button
                onClick={() => {
                  document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                  setIsMobileMenuOpen(false);
                }}
                className="text-gray-600 hover:text-gray-900 text-left py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Preus
              </button>
              <button
                onClick={handleContactClick}
                className="text-gray-600 hover:text-gray-900 text-left py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Contacte
              </button>
              {!user && (
                <div className="flex flex-col space-y-2 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      router.push("/auth/signin");
                    }}
                    disabled={loading || authLoading}
                    className="justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-10"
                  >
                    Inicia sessió
                  </Button>
                  <Button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handlePrimaryAction();
                    }}
                    disabled={loading || authLoading}
                    className="bg-blue-500 hover:bg-blue-600 text-white justify-start h-10"
                  >
                    Comença!
                  </Button>
                </div>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}