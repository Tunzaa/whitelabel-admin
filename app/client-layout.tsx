"use client"

import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { LanguageInitializer } from "@/src/i18n/language-initializer";
import { useEffect, useState } from 'react';
import { Geist } from "next/font/google";
import { Spinner } from "@/components/ui/spinner";

// Initialize fonts
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function ClientLayout({
  children,
  session,
}: {
  children: React.ReactNode;
  session: any;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Initialize theme on mount
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.classList.remove('light', 'dark', 'system');
    document.documentElement.classList.add(savedTheme);
    document.documentElement.style.colorScheme = savedTheme === 'dark' ? 'dark' : 'light';
  }, []);

  // Initialize fonts on mount
  useEffect(() => {
    if (isMounted) {
      document.body.className = `${geistSans.variable} ${geistMono.variable} antialiased`;
    }
  }, [isMounted]);

  // Mark as loaded after a small delay to ensure proper initialization
  useEffect(() => {
    if (isMounted) {
      const timer = setTimeout(() => setIsLoaded(true), 100);
      return () => clearTimeout(timer);
    }
  }, [isMounted]);

  if (!isMounted) {
    return null;
  }

  return (
    <Providers session={session}>
      <Toaster
        toastOptions={{
          classNames: {
            icon: "group-data-[type=error]:text-red-500 group-data-[type=success]:text-green-500 group-data-[type=warning]:text-amber-500 group-data-[type=info]:text-blue-500",
          },
        }}
      />
      <LanguageInitializer>
        {!isLoaded ? (
          <div className="flex items-center justify-center min-h-screen">
            <Spinner />
          </div>
        ) : (
          children
        )}
      </LanguageInitializer>
    </Providers>
  );
}
