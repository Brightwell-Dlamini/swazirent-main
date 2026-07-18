// src/app/blog/page.tsx
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Calendar, Clock, User, Tag, ChevronRight, BookOpen, Lightbulb, TrendingUp, Home, Shield, DollarSign, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const BLOG_POSTS = [
  {
    id: 1,
    title: '10 Tips for First-Time Renters in Eswatini',
    excerpt: 'Everything you need to know before renting your first property in Eswatini. From budgeting to viewing properties.',
    category: 'Guides',
    author: 'Sarah Mamba',
    date: '2024-01-15',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80',
    tags: ['Renting Tips', 'First Time', 'Budgeting'],
    popular: true
  },
  {
    id: 2,
    title: 'How to Spot a Rental Scam: Red Flags to Watch For',
    excerpt: 'Protect yourself from rental scams with these essential warning signs and safety tips.',
    category: 'Safety',
    author: 'Thabo Dlamini',
    date: '2024-01-10',
    readTime: '4 min read',
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&auto=format&fit=crop&q=80',
    tags: ['Safety', 'Scams', 'Protection'],
    popular: true
  },
  {
    id: 3,
    title: 'The Ultimate Guide to Renting in Manzini',
    excerpt: 'Everything you need to know about finding and renting a property in Eswatini\'s commercial hub.',
    category: 'City Guides',
    author: 'Nomsa Nkosi',
    date: '2024-01-05',
    readTime: '7 min read',
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&auto=format&fit=crop&q=80',
    tags: ['Manzini', 'City Guide', 'Location'],
    popular: false
  },
  {
    id: 4,
    title: 'Landlord Tips: How to Attract Quality Tenants',
    excerpt: 'Practical strategies for landlords to attract and retain responsible tenants for their properties.',
    category: 'Landlords',
    author: 'Bongani Mkhabela',
    date: '2024-01-01',
    readTime: '6 min read',
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80',
    tags: ['Landlords', 'Tenants', 'Management'],
    popular: false
  },
  {
    id: 5,
    title: 'Understanding Rental Contracts in Eswatini',
    excerpt: 'A breakdown of rental agreements, tenant rights, and landlord obligations in Eswatini.',
    category: 'Legal',
    author: 'Zanele Hlophe',
    date: '2023-12-20',
    readTime: '8 min read',
    image: 'https://images.unsplash.com/photo-1589998059171-988d887df646?w=800&auto=format&fit=crop&q=80',
    tags: ['Legal', 'Contracts', 'Rights'],
    popular: false
  },
  {
    id: 6,
    title: 'Top 5 Neighborhoods to Live in Mbabane',
    excerpt: 'Explore the best residential areas in Eswatini\'s capital city for families, professionals, and students.',
    category: 'City Guides',
    author: 'Lindiwe Simelane',
    date: '2023-12-15',
    readTime: '6 min read',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80',
    tags: ['Mbabane', 'Neighborhoods', 'Lifestyle'],
    popular: true
  }
];

const CATEGORIES = [
  { name: 'All', icon: BookOpen },
  { name: 'Guides', icon: Lightbulb },
  { name: 'Safety', icon: Shield },
  { name: 'City Guides', icon: Home },
  { name: 'Landlords', icon: Users },
  { name: 'Legal', icon: DollarSign },
];

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredPosts = useMemo(() => {
    return BLOG_POSTS.filter(post => {
      const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const popularPosts = useMemo(() => BLOG_POSTS.filter(post => post.popular), []);

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
      {/* Hero Section */}
      <section className="py-12 md:py-16 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-950 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-500/10 rounded-full">
                <BookOpen className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Rental Tips & Resources
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Expert advice, guides, and resources to help you navigate the rental market in Eswatini.
            </p>
          </div>
        </div>
      </section>

      {/* Featured/Popular Posts */}
      {popularPosts.length > 0 && (
        <section className="py-8 md:py-12 border-b border-gray-200 dark:border-gray-800">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Popular Articles
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {popularPosts.slice(0, 2).map((post) => (
                <Link key={post.id} href={`/blog/${post.id}`}>
                  <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-0 shadow-md bg-white dark:bg-gray-900 h-full group">
                    <div className="relative h-48 bg-gray-200 dark:bg-gray-800 overflow-hidden">
                      <Image
                        src={post.image}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        loading="lazy"
                      />
                      <Badge className="absolute top-3 left-3 bg-orange-500">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Popular
                      </Badge>
                    </div>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2 flex-wrap">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>{post.readTime}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 text-base">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <User className="h-3 w-3" />
                          <span>{post.author}</span>
                        </div>
                        <span className="text-indigo-600 dark:text-indigo-400 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center">
                          Read More
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Search and Filter */}
      <section className="py-8 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="w-full md:w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 h-12 md:h-10"
                  aria-label="Search articles"
                />
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category.name}
                  onClick={() => setSelectedCategory(category.name)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 flex items-center gap-1.5 min-h-[36px] ${
                    selectedCategory === category.name
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  aria-pressed={selectedCategory === category.name}
                >
                  <category.icon className="h-3.5 w-3.5" />
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                No articles found matching your criteria.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.id}`}>
                  <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-0 shadow-md bg-white dark:bg-gray-900 h-full group">
                    <div className="relative h-48 bg-gray-200 dark:bg-gray-800 overflow-hidden">
                      <Image
                        src={post.image}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        loading="lazy"
                      />
                      <Badge className="absolute top-3 left-3 bg-indigo-600">
                        {post.category}
                      </Badge>
                    </div>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2 flex-wrap">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>{post.readTime}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 text-base">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                        {post.excerpt}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {post.tags.slice(0, 2).map((tag) => (
                          <span 
                            key={tag} 
                            className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                        {post.tags.length > 2 && (
                          <span className="text-xs text-gray-400">+{post.tags.length - 2}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <User className="h-3 w-3" />
                          <span>{post.author}</span>
                        </div>
                        <span className="text-indigo-600 dark:text-indigo-400 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center">
                          Read
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-12 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Get Rental Tips in Your Inbox
          </h2>
          <p className="text-white/80 mb-6">
            Subscribe to our newsletter for the latest property listings, rental tips, and market insights.
          </p>
          <Link href="/newsletter">
            <Button size="lg" className="bg-white text-indigo-600 hover:bg-white/90 shadow-lg">
              Subscribe Now
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
