// src/app/newsletter/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Mail, CheckCircle, Clock, Bell, Zap, Users, TrendingUp, Home, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

const BENEFITS = [
  {
    icon: Bell,
    title: 'New Listings Alerts',
    description: 'Be the first to know when new properties match your preferences.'
  },
  {
    icon: TrendingUp,
    title: 'Market Insights',
    description: 'Stay informed about rental trends, pricing changes, and market updates.'
  },
  {
    icon: Clock,
    title: 'Exclusive Content',
    description: 'Get early access to rental guides, tips, and resources.'
  },
  {
    icon: Users,
    title: 'Community Updates',
    description: 'Connect with other renters and landlords in the Ekhaya community.'
  }
];

export default function NewsletterPage() {
  const [email, setEmail] = useState('');
  const [preferences, setPreferences] = useState({
    newListings: true,
    marketInsights: true,
    tips: true,
    promotions: false
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      // In production, send to your API endpoint
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsSubmitted(true);
      toast.success('Successfully subscribed! 🎉');
      setEmail('');
      // Reset preferences to defaults
      setPreferences({
        newListings: true,
        marketInsights: true,
        tips: true,
        promotions: false
      });
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferenceChange = (key: string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }));
  };

  if (isSubmitted) {
    return (
      <main className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300 flex items-center justify-center py-16">
        <div className="container mx-auto px-4 max-w-md">
          <Card className="border-0 shadow-xl">
            <CardContent className="p-6 md:p-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                You're In! 🎉
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Thanks for subscribing to the Ekhaya Newsletter!
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                We'll keep you updated with the latest properties and rental tips.
              </p>
              <Button 
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => setIsSubmitted(false)}
              >
                <Mail className="h-4 w-4 mr-2" />
                Subscribe Another Email
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
      {/* Hero Section */}
      <section className="py-12 md:py-16 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-950 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-500/10 rounded-full">
                <Mail className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Subscribe to Our Newsletter
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Get the best rental properties, expert tips, and market insights delivered straight to your inbox.
            </p>
          </div>
        </div>
      </section>

      {/* Subscription Form */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <Card className="border-0 shadow-xl bg-white dark:bg-gray-900">
            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-base bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 h-12"
                    required
                    disabled={isLoading}
                  />
                  {error && (
                    <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                      {error}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    What Would You Like to Receive?
                  </label>
                  <div className="space-y-2.5">
                    {Object.entries(preferences).map(([key, value]) => (
                      <label
                        key={key}
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors cursor-pointer min-h-[44px]"
                      >
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={() => handlePreferenceChange(key)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 shrink-0"
                          disabled={isLoading}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  size="lg"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-base h-12"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Subscribing...
                    </>
                  ) : (
                    <>
                      <Mail className="h-5 w-5 mr-2" />
                      Subscribe to Newsletter
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-gray-500 dark:text-gray-500">
                  By subscribing, you agree to our Privacy Policy. You can unsubscribe at any time.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-12 bg-gray-50 dark:bg-gray-900/50">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-10">
            Why Subscribe?
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {BENEFITS.map((benefit) => (
              <Card key={benefit.title} className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white dark:bg-gray-900">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-500/10 rounded-lg shrink-0">
                    <benefit.icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                      {benefit.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {benefit.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <Card className="border border-gray-200 dark:border-gray-800">
              <CardContent className="p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                  How often will I receive emails?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  We send our newsletter once a week with the best new listings, rental tips, and market updates.
                </p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200 dark:border-gray-800">
              <CardContent className="p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                  Can I unsubscribe at any time?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Yes! Every email includes an unsubscribe link. You can also manage your preferences in your account settings.
                </p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200 dark:border-gray-800">
              <CardContent className="p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                  Is my email secure?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Absolutely. We take your privacy seriously and will never share your email with third parties.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Back to Home */}
      <section className="py-8 text-center">
        <Link href="/" className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:underline">
          <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
          Back to Home
        </Link>
      </section>
    </main>
  );
}
