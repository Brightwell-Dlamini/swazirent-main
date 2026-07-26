// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
// @ts-ignore
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BackToTop } from '@/components/ui/BackToTop';
import { PhoneBanner } from '@/components/auth/PhoneBanner';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: {
    default: 'Ekhaya — Homes in Eswatini',
    template: '%s · Ekhaya',
  },
  description:
    'Find verified homes, land, and commercial space across Eswatini. Search Manzini, Mbabane, and more — contact landlords directly.',
  applicationName: 'Ekhaya',
  keywords: [
    'Eswatini rentals',
    'Manzini houses',
    'Mbabane apartment',
    'land for sale Eswatini',
    'Ekhaya',
  ],
  authors: [{ name: 'Ekhaya' }],
  openGraph: {
    type: 'website',
    locale: 'en_SZ',
    siteName: 'Ekhaya',
    title: 'Ekhaya — Homes in Eswatini',
    description: 'Verified homes, land, and commercial listings across Eswatini.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ekhaya — Homes in Eswatini',
    description: 'Verified homes, land, and commercial listings across Eswatini.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className={`${inter.className} min-h-dvh flex flex-col`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:rounded-md focus:shadow-lg focus:ring-2 focus:ring-ring"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <AuthProvider>
            <Providers>
              <ErrorBoundary>
                <Header />
                <PhoneBanner />
                <div id="main-content" className="flex-1">
                  {children}
                </div>
                <Footer />
                <BackToTop />
                <Toaster
                  position="top-center"
                  richColors
                  closeButton
                  duration={3500}
                  toastOptions={{
                    className: 'text-sm',
                  }}
                />
              </ErrorBoundary>
            </Providers>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
