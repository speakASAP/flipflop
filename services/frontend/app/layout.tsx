import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "flipflop.statex.cz - Modern E-commerce Platform",
  description: "Modern, fully automated e-commerce platform for the Czech Republic",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body className={inter.className}>
        <ErrorBoundary>
          <AuthProvider>
            <Header />
            <main>{children}</main>
            <footer className="bg-gray-800 text-white py-8 mt-16">
              <div className="container mx-auto px-4 text-center">
                <p>&copy; 2025 flipflop.statex.cz. Všechna práva vyhrazena.</p>
              </div>
            </footer>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
