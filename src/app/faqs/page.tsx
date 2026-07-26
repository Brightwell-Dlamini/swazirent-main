// src/app/faqs/page.tsx
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ChevronDown, ChevronUp, HelpCircle, MessageCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { FAQS } from '@/lib/faqs';

export default function FAQsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    FAQS.forEach((category) => {
      if (category.questions.length > 0) {
        initial[`${category.category}-0`] = true;
      }
    });
    return initial;
  });

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredFAQs = useMemo(() => {
    if (!searchQuery.trim()) return FAQS;
    const query = searchQuery.toLowerCase();
    return FAQS.map((category) => ({
      ...category,
      questions: category.questions.filter(
        (q) => q.q.toLowerCase().includes(query) || q.a.toLowerCase().includes(query)
      ),
    })).filter((category) => category.questions.length > 0);
  }, [searchQuery]);

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
      <section className="py-12 md:py-16 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-950 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-500/10 rounded-full">
                <HelpCircle className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
              Find answers about renting, buying, and listing property on Ekhaya across Eswatini.
            </p>
            <div className="mt-6 max-w-md mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search FAQs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 h-12 md:h-10"
                  aria-label="Search FAQs"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {filteredFAQs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">No FAQs found matching your search.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {filteredFAQs.map((category) => (
                <div key={category.category}>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                    {category.category}
                  </h2>
                  <div className="space-y-3">
                    {category.questions.map((item, index) => {
                      const id = `${category.category}-${index}`;
                      const isExpanded = expandedItems[id];
                      return (
                        <Card
                          key={id}
                          className="border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow duration-300"
                        >
                          <button
                            onClick={() => toggleExpand(id)}
                            className="w-full text-left p-4 md:p-5 flex items-start justify-between gap-4 min-h-[44px]"
                            aria-expanded={isExpanded}
                          >
                            <span className="font-medium text-gray-900 dark:text-white text-sm md:text-base">
                              {item.q}
                            </span>
                            <span className="shrink-0 mt-0.5">
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-gray-500" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-gray-500" />
                              )}
                            </span>
                          </button>
                          {isExpanded && (
                            <CardContent className="pt-0 pb-4 px-4 md:px-5">
                              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base leading-relaxed">
                                {item.a}
                              </p>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-12 bg-gray-50 dark:bg-gray-900/50">
        <div className="container mx-auto px-4 max-w-3xl">
          <Card className="border-0 shadow-lg bg-white dark:bg-gray-900">
            <CardContent className="p-6 md:p-8 text-center">
              <MessageCircle className="h-12 w-12 text-indigo-600 dark:text-indigo-400 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Still have questions?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Contact our support team and we will get back to you as soon as we can.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Link href="/contact">
                    <Mail className="h-4 w-4 mr-2" />
                    Contact Support
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/newsletter">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Newsletter
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
