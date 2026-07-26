import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME, absoluteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `How ${SITE_NAME} collects, uses, and protects your personal information in Eswatini.`,
  alternates: { canonical: '/privacy' },
  openGraph: { title: `Privacy Policy · ${SITE_NAME}`, url: absoluteUrl('/privacy') },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 md:py-16 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: July 2026</p>

        <section className="space-y-4 text-sm leading-relaxed text-foreground">
          <p>
            Ekhaya (&quot;we&quot;, &quot;us&quot;) operates a property marketplace for Eswatini. This policy explains what data we collect and how we use it.
          </p>
          <h2 className="text-xl font-semibold pt-4">1. Information we collect</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Account details: name, email, phone, role (seeker, landlord, broker, agent).</li>
            <li>Listing content you submit: photos, descriptions, prices, locations.</li>
            <li>Usage data: pages viewed, searches, and device/browser type for security and improvement.</li>
            <li>Communications: messages you send to support or through contact forms.</li>
          </ul>
          <h2 className="text-xl font-semibold pt-4">2. How we use information</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>To provide and improve the platform, including search and verification.</li>
            <li>To connect seekers with landlords, brokers, and agents.</li>
            <li>To send important account notices (verification, security).</li>
            <li>To detect fraud and enforce our terms.</li>
          </ul>
          <h2 className="text-xl font-semibold pt-4">3. Sharing</h2>
          <p className="text-muted-foreground">
            We do not sell your personal data. Contact details on a listing are shown so interested parties can reach you. We use trusted processors (hosting, auth, SMS) under contractual safeguards.
          </p>
          <h2 className="text-xl font-semibold pt-4">4. Security</h2>
          <p className="text-muted-foreground">
            We use industry-standard practices including encrypted connections and secure authentication. Never share bank OTPs or send money before viewing a property in person.
          </p>
          <h2 className="text-xl font-semibold pt-4">5. Your choices</h2>
          <p className="text-muted-foreground">
            You can update profile details, request deletion of your account, or contact us about data requests via the{' '}
            <Link href="/contact" className="text-primary underline">Contact</Link> page.
          </p>
          <h2 className="text-xl font-semibold pt-4">6. Contact</h2>
          <p className="text-muted-foreground">
            Questions about privacy: use <Link href="/contact" className="text-primary underline">Contact</Link> or email info@ekhaya.co.sz.
          </p>
        </section>
      </div>
    </main>
  );
}
