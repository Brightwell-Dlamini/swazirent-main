// src/app/not-found.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-muted-foreground/30 tabular-nums">404</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          That link doesn’t lead anywhere on Ekhaya. Search listings or head home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/" className="gap-1.5">
              <Home className="h-4 w-4" />Home
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/search" className="gap-1.5">
              <Search className="h-4 w-4" />Search
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
