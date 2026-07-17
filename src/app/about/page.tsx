// src/app/about/page.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Users,
  Home,
  Phone,
  CheckCircle,
  Heart,
  Star,
  Award,
  Clock,
  MapPin,
  Building,
  Sparkles,
  Globe,
  ThumbsUp,
  Mail,
} from 'lucide-react';

export default function AboutPage() {
  const stats = [
    { icon: Home, label: 'Active Listings', value: '500+' },
    { icon: Users, label: 'Happy Renters', value: '1,200+' },
    { icon: Building, label: 'Cities Covered', value: '13' },
    { icon: Star, label: 'Average Rating', value: '4.8/5' },
  ];

  const values = [
    {
      icon: Shield,
      title: 'Trust & Safety',
      description: 'Every landlord is verified and every listing is vetted to ensure a safe rental experience.',
    },
    {
      icon: Heart,
      title: 'Community First',
      description: 'We believe in building a strong rental community across Eswatini, connecting people and places.',
    },
    {
      icon: Sparkles,
      title: 'Transparency',
      description: 'No hidden fees, no scams. What you see is what you get. We make renting straightforward.',
    },
    {
      icon: Clock,
      title: 'Fast & Easy',
      description: 'Find your next home or list your property in minutes. We streamline the entire process.',
    },
  ];

  const team = [
    {
      name: 'Brightwell Dlamini',
      role: 'Founder & CEO',
      image: '/images/team/brightwell.jpg',
    },
    {
      name: 'Nomsa Mamba',
      role: 'Operations Lead',
      image: '/images/team/nomsa.jpg',
    },
    {
      name: 'Sibusiso Mamba',
      role: 'Technical Lead',
      image: '/images/team/sibusiso.jpg',
    },
  ];

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-linear-to-b from-blue-50 to-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 px-4 py-1">
              About SwaziRent
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Your Trusted Partner in
              <span className="text-primary"> Property Rentals</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
              We are on a mission to make finding and renting properties in Eswatini 
              simple, safe, and transparent. No tussle, just trust.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className="flex justify-center mb-2">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            <div>
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                Our Story
              </Badge>
              <h2 className="text-3xl font-bold mb-4">
                Building Trust in Eswatini's Rental Market
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  SwaziRent was born from a simple idea: finding a home in Eswatini 
                  should be easy, not stressful. We saw too many people struggling 
                  with scams, unreliable listings, and outdated processes.
                </p>
                <p>
                  Our platform connects verified landlords with quality tenants 
                  across all 13 cities and towns of Eswatini. Every listing is 
                  reviewed, every landlord is verified, and every renter is treated 
                  with respect.
                </p>
                <p>
                  Whether you're looking for a cozy apartment in Mbabane or a 
                  spacious house in Manzini, we're here to help you find your 
                  perfect home.
                </p>
              </div>
              <div className="flex gap-4 mt-6">
                <Button asChild>
                  <Link href="/search">
                    <Home className="mr-2 h-4 w-4" />
                    Find a Home
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/landlord/add-property">
                    <Building className="mr-2 h-4 w-4" />
                    List Property
                  </Link>
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="bg-primary/5 rounded-2xl p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm border">
                      <Shield className="h-8 w-8 text-primary mb-2" />
                      <p className="font-semibold text-sm">Verified Landlords</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border">
                      <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                      <p className="font-semibold text-sm">No Scams</p>
                    </div>
                  </div>
                  <div className="space-y-4 mt-8">
                    <div className="bg-white rounded-xl p-4 shadow-sm border">
                      <Phone className="h-8 w-8 text-blue-500 mb-2" />
                      <p className="font-semibold text-sm">Direct Contact</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border">
                      <Globe className="h-8 w-8 text-purple-500 mb-2" />
                      <p className="font-semibold text-sm">All of Eswatini</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              Our Values
            </Badge>
            <h2 className="text-3xl font-bold mb-4">What We Stand For</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              These core values guide everything we do at SwaziRent.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-center mb-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <h3 className="font-semibold mb-2">{value.title}</h3>
                    <p className="text-sm text-gray-600">{value.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              Why SwaziRent
            </Badge>
            <h2 className="text-3xl font-bold mb-4">Why Choose SwaziRent?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We make renting simple, safe, and stress-free for everyone in Eswatini.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-sm border text-center">
              <div className="flex justify-center mb-4">
                <Shield className="h-12 w-12 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Verified Listings</h3>
              <p className="text-sm text-gray-600">
                Every property and landlord is verified to ensure a safe rental experience.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border text-center">
              <div className="flex justify-center mb-4">
                <ThumbsUp className="h-12 w-12 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">No Hidden Fees</h3>
              <p className="text-sm text-gray-600">
                We believe in transparency. No hidden charges, no surprises.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border text-center">
              <div className="flex justify-center mb-4">
                <MapPin className="h-12 w-12 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">All of Eswatini</h3>
              <p className="text-sm text-gray-600">
                From Mbabane to Manzini, we cover all 13 cities and towns.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-linear-to-r from-primary-600 to-primary-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Find Your Home?</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of happy renters and landlords in Eswatini.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/search">
                <Home className="mr-2 h-5 w-5" />
                Browse Properties
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20" asChild>
              <Link href="/dashboard/landlord/add-property">
                <Building className="mr-2 h-5 w-5" />
                List Your Property
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
