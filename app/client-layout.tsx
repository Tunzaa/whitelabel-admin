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
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    // Remove any existing theme classes first
    document.documentElement.classList.remove('light', 'dark', 'system');
    // Apply the theme class
    document.documentElement.classList.add(savedTheme);
    document.documentElement.style.colorScheme = savedTheme === 'dark' ? 'dark' : 'light';
  }, []);

  // Initialize fonts on mount
  useEffect(() => {
    document.body.className = `${geistSans.variable} ${geistMono.variable} antialiased`;
  }, []);

  // Mark as loaded after a small delay to ensure proper initialization
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const isServer = typeof window === 'undefined';

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
        {(!isLoaded && !isServer) ? (
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
