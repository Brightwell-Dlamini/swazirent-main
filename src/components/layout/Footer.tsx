// src/components/layout/Footer.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Home, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube,
  ChevronRight, Shield, CheckCircle, Clock, Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function Footer() {
  const pathname = usePathname();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }
    setIsLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      toast.success('Subscribed — welcome to Ekhaya updates');
      setEmail('');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const footerLinks = {
    company: [
      { name: 'About Us', href: '/about' },
      { name: 'Contact', href: '/contact' },
      { name: 'Careers', href: '/careers' },
      { name: 'Blog', href: '/blog' },
    ],
    renters: [
      { name: 'Search Properties', href: '/search' },
      { name: 'Map', href: '/map' },
      { name: 'Saved Properties', href: '/dashboard/renter' },
      { name: 'FAQs', href: '/faqs' },
    ],
    landlords: [
      { name: 'List a Property', href: '/dashboard/landlord/add-property' },
      { name: 'Manage Listings', href: '/dashboard/landlord' },
      { name: 'Pricing', href: '/pricing' },
    ],
    support: [
      { name: 'Help Center', href: '/help' },
      { name: 'Newsletter', href: '/newsletter' },
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms', href: '/terms' },
    ],
  };

  const socialLinks = [
    { name: 'Facebook', icon: Facebook, href: '#' },
    { name: 'Twitter', icon: Twitter, href: '#' },
    { name: 'Instagram', icon: Instagram, href: '#' },
    { name: 'Youtube', icon: Youtube, href: '#' },
  ];

  const LinkCol = ({
    title,
    links,
  }: {
    title: string;
    links: { name: string; href: string }[];
  }) => (
    <div>
      <h4 className="font-semibold text-foreground mb-3 text-sm">{title}</h4>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.name}>
            <Link
              href={link.href}
              className={`text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1 group ${
                pathname === link.href ? 'text-foreground font-medium' : ''
              }`}
            >
              <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              {link.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <footer className="bg-muted/40 dark:bg-gray-950 border-t border-border text-foreground">
      <div className="container mx-auto px-4 py-10 md:py-14">
        {/* Brand */}
        <div className="mb-8 max-w-md">
          <Link href="/" className="flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity">
            <Home className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg">Ekhaya</span>
          </Link>
          <p className="text-muted-foreground text-sm mb-3">
            Find your next home in Eswatini. Fast, easy, and verified.
          </p>
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Manzini, Eswatini</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>+268 1234 5678</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>info@ekhaya.co.sz</span>
            </div>
          </div>
        </div>

        {/*
          Mobile: 2 columns × 2 rows
          Company | For Seekers
          For Landlords | Support
          Desktop: 4 columns
        */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
          <LinkCol title="Company" links={footerLinks.company} />
          <LinkCol title="For Seekers" links={footerLinks.renters} />
          <LinkCol title="For Landlords" links={footerLinks.landlords} />
          <LinkCol title="Support" links={footerLinks.support} />
        </div>

        {/* Newsletter */}
        <div className="mt-10 pt-8 border-t border-border">
          <div className="grid md:grid-cols-2 gap-4 items-center">
            <div>
              <h4 className="font-semibold text-sm mb-1">Newsletter</h4>
              <p className="text-muted-foreground text-sm">
                New listings and tips for Eswatini renters and landlords.
              </p>
            </div>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
              <Input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-background"
                disabled={isLoading}
                required
              />
              <Button type="submit" disabled={isLoading} className="whitespace-nowrap">
                {isLoading ? '…' : 'Subscribe'}
              </Button>
            </form>
          </div>
        </div>

        {/* Trust */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex flex-wrap justify-center gap-5 text-muted-foreground">
            <div className="flex items-center gap-1.5 text-xs">
              <Shield className="h-3.5 w-3.5 text-primary" /> Secure
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Verified listings
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Clock className="h-3.5 w-3.5 text-amber-500" /> Local support
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Award className="h-3.5 w-3.5 text-rose-500" /> Built for Eswatini
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: social first, then copyright */}
      <div className="border-t border-border bg-muted/60 dark:bg-black/40">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="w-9 h-9 rounded-full bg-background border border-border hover:border-primary hover:text-primary flex items-center justify-center transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
              <p>© {new Date().getFullYear()} Ekhaya. All rights reserved.</p>
              <div className="flex gap-3">
                <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
                <Link href="/terms" className="hover:text-foreground">Terms</Link>
                <Link href="/cookies" className="hover:text-foreground">Cookies</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
