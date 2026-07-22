// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
// @ts-ignore
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BackToTop } from '@/components/ui/BackToTop';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Ekhaya - Find Your Next Home in Eswatini',
  description:
    'Search verified rentals in Manzini, Mbabane, and beyond. No tussle.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <ErrorBoundary>
              <Header />
              {children}
              <Footer />
              <BackToTop />
              <Toaster 
                position="top-right"
                richColors
                closeButton
                toastOptions={{
                  style: {
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    border: '1px solid var(--border)',
                  },
                }}
              />
            </ErrorBoundary>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
