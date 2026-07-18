// src/components/layout/Footer.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { 
  Home, 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Twitter, 
  Instagram, 
  Youtube,
  ChevronRight,
  Shield,
  CheckCircle,
  Clock,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function Footer() {
  const pathname = usePathname();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    if (!email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      // In production, send to your API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Successfully subscribed to newsletter! 🎉');
      setEmail('');
    } catch {
      toast.error('Something went wrong. Please try again.');
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
      { name: 'Saved Properties', href: '/saved' },
      { name: 'Price Alerts', href: '/alerts' },
      { name: 'Rental Guides', href: '/guides' },
    ],
    landlords: [
      { name: 'List a Property', href: '/dashboard/landlord/add-property' },
      { name: 'Manage Listings', href: '/dashboard/landlord' },
      { name: 'Pricing', href: '/pricing' },
      { name: 'Landlord Resources', href: '/resources' },
    ],
    support: [
      { name: 'FAQs', href: '/faqs' },
      { name: 'Help Center', href: '/help' },
      { name: 'Newsletter', href: '/newsletter' },
      { name: 'Privacy Policy', href: '/privacy' },
    ],
  };

  const socialLinks = [
    { name: 'Facebook', icon: Facebook, href: '#' },
    { name: 'Twitter', icon: Twitter, href: '#' },
    { name: 'Instagram', icon: Instagram, href: '#' },
    { name: 'Youtube', icon: Youtube, href: '#' },
  ];

  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-white">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center space-x-2 mb-4 hover:opacity-80 transition-opacity">
              <Home className="h-6 w-6 text-indigo-400" />
              <span className="font-bold text-xl">Ekhaya</span>
            </Link>
            <p className="text-gray-400 text-sm mb-4 max-w-xs">
              Find your next home in Eswatini. Fast, easy, and verified.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <MapPin className="h-4 w-4 text-indigo-400 shrink-0" />
                <span>Manzini, Eswatini</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Phone className="h-4 w-4 text-indigo-400 shrink-0" />
                <span>+268 1234 5678</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Mail className="h-4 w-4 text-indigo-400 shrink-0" />
                <span>info@ekhaya.co.sz</span>
              </div>
            </div>
            {/* Social Links */}
            <div className="flex gap-3 mt-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="w-9 h-9 rounded-full bg-gray-800 hover:bg-indigo-600 flex items-center justify-center transition-colors duration-300"
                  aria-label={social.name}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2.5">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className={`text-gray-400 hover:text-white transition-colors duration-200 text-sm flex items-center gap-1 group ${
                      pathname === link.href ? 'text-white' : ''
                    }`}
                  >
                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">For Renters</h4>
            <ul className="space-y-2.5">
              {footerLinks.renters.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className={`text-gray-400 hover:text-white transition-colors duration-200 text-sm flex items-center gap-1 group ${
                      pathname === link.href ? 'text-white' : ''
                    }`}
                  >
                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">For Landlords</h4>
            <ul className="space-y-2.5">
              {footerLinks.landlords.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className={`text-gray-400 hover:text-white transition-colors duration-200 text-sm flex items-center gap-1 group ${
                      pathname === link.href ? 'text-white' : ''
                    }`}
                  >
                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Support</h4>
            <ul className="space-y-2.5">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className={`text-gray-400 hover:text-white transition-colors duration-200 text-sm flex items-center gap-1 group ${
                      pathname === link.href ? 'text-white' : ''
                    }`}
                  >
                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div>
              <h4 className="font-semibold text-white mb-1">
                Subscribe to our Newsletter
              </h4>
              <p className="text-gray-400 text-sm">
                Get the latest properties and rental tips in your inbox.
              </p>
            </div>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-indigo-500"
                disabled={isLoading}
                required
              />
              <Button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-700 text-white whitespace-nowrap"
                disabled={isLoading}
              >
                {isLoading ? 'Subscribing...' : 'Subscribe'}
              </Button>
            </form>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-8 pt-8 border-t border-gray-800">
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-8 text-gray-400">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-400" />
              <span className="text-xs">Secure & Safe</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span className="text-xs">Verified Listings</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <span className="text-xs">24/7 Support</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-rose-400" />
              <span className="text-xs">Trusted Platform</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-sm text-gray-400">
            <p>
              &copy; {new Date().getFullYear()} Ekhaya. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs">
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="/cookies" className="hover:text-white transition-colors">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
