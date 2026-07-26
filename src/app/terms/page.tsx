import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME, absoluteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `Terms for using ${SITE_NAME}, the property marketplace for Eswatini.`,
  alternates: { canonical: '/terms' },
  openGraph: { title: `Terms · ${SITE_NAME}`, url: absoluteUrl('/terms') },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 md:py-16 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: July 2026</p>

        <section className="space-y-4 text-sm leading-relaxed">
          <p className="text-muted-foreground">
            By using Ekhaya you agree to these terms. If you do not agree, do not use the platform.
          </p>
          <h2 className="text-xl font-semibold pt-4">1. The service</h2>
          <p className="text-muted-foreground">
            Ekhaya is a marketplace that helps people discover and contact posters of residential, land, and commercial listings in Eswatini. We are not a party to rental or sale contracts between users.
          </p>
          <h2 className="text-xl font-semibold pt-4">2. Accounts</h2>
          <p className="text-muted-foreground">
            You must provide accurate information. You are responsible for activity under your account. Phone verification may be required to post listings.
          </p>
          <h2 className="text-xl font-semibold pt-4">3. Listings</h2>
          <p className="text-muted-foreground">
            Posters must only list properties they are authorised to offer. Photos and descriptions must be truthful. Listings may be reviewed, paused, or removed for policy or legal reasons.
          </p>
          <h2 className="text-xl font-semibold pt-4">4. Safety</h2>
          <p className="text-muted-foreground">
            Always view a property in person before paying. Never send deposits via untraceable methods to unknown parties. Report suspicious listings using the report tools or{' '}
            <Link href="/contact" className="text-primary underline">Contact</Link>.
          </p>
          <h2 className="text-xl font-semibold pt-4">5. Acceptable use</h2>
          <p className="text-muted-foreground">
            No scams, spam, harassment, or illegal content. We may suspend or ban accounts that harm other users or the platform.
          </p>
          <h2 className="text-xl font-semibold pt-4">6. Liability</h2>
          <p className="text-muted-foreground">
            Listings are provided by users. Ekhaya is provided &quot;as is&quot; to the extent allowed by law. We are not liable for deals struck offline between users.
          </p>
          <h2 className="text-xl font-semibold pt-4">7. Changes</h2>
          <p className="text-muted-foreground">
            We may update these terms. Continued use after changes means you accept the updated terms.
          </p>
          <h2 className="text-xl font-semibold pt-4">8. Contact</h2>
          <p className="text-muted-foreground">
            Questions: <Link href="/contact" className="text-primary underline">Contact us</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
