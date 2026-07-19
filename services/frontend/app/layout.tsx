import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import SiteFooter from "@/components/SiteFooter";
import VisitorActivityTracker from "@/components/VisitorActivityTracker";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ConsentBanner } from '@/components/ConsentBanner';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "flipflop.alfares.cz - Modern FlipFlop Platform",
  description: "Modern, fully automated FlipFlop platform for the Czech Republic",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className="light">
      <body className={`${inter.className} bg-white text-slate-900 antialiased`}>
        <ErrorBoundary>
          <AuthProvider>
            <Suspense fallback={null}>
              <VisitorActivityTracker />
            </Suspense>
            <Header />
            <main className="min-h-screen">{children}</main>
            <SiteFooter />
          </AuthProvider>
        </ErrorBoundary>
        <ConsentBanner />
      </body>
    </html>
  );
}
