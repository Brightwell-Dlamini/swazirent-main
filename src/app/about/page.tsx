// src/app/about/page.tsx
'use client';

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
  Quote,
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
      initials: 'BD',
    },
    {
      name: 'Nomsa Mamba',
      role: 'Operations Lead',
      initials: 'NM',
    },
    {
      name: 'Sibusiso Mamba',
      role: 'Technical Lead',
      initials: 'SM',
    },
  ];

  const testimonials = [
    {
      quote: "Ekhaya made finding my apartment in Mbabane so easy. The verification gave me peace of mind.",
      author: 'Thandi N.',
      location: 'Mbabane',
    },
    {
      quote: "I listed my property and had qualified tenants within a week. The WhatsApp integration is brilliant.",
      author: 'Michael S.',
      location: 'Manzini',
    },
    {
      quote: "Finally, a platform that understands Eswatini's rental market. No scams, just real listings.",
      author: 'Sarah M.',
      location: 'Ezulwini',
    },
  ];

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
      {/* ========== HERO SECTION ========== */}
      <section className="relative overflow-hidden py-16 md:py-24 lg:py-32">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/80 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-colors duration-300" />
        
        {/* Gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute -top-[40%] -right-[20%] w-[70%] h-[70%] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
              filter: 'blur(80px)',
            }}
          />
          <div 
            className="absolute -bottom-[30%] -left-[20%] w-[60%] h-[60%] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(236, 72, 153, 0.1) 0%, transparent 70%)',
              filter: 'blur(80px)',
            }}
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4 md:mb-6 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30 px-4 py-1.5 text-xs md:text-sm transition-colors duration-300">
              About Ekhaya
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 leading-tight">
              <span className="text-gray-900 dark:text-white transition-colors duration-300">Your Trusted Partner in</span>
              <br />
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                Property Rentals
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl mx-auto px-2 transition-colors duration-300">
              We are on a mission to make finding and renting properties in Eswatini 
              simple, safe, and transparent. No tussle, just trust.
            </p>
            <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-6 md:mt-8">
              <Button asChild size="lg" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 dark:from-indigo-500 dark:to-purple-500 dark:hover:from-indigo-600 dark:hover:to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 text-sm md:text-base h-11 md:h-12 px-5 md:px-8">
                <Link href="/search">
                  <Home className="mr-2 h-4 w-4" />
                  Find a Home
                </Link>
              </Button>
              <Button variant="outline" asChild size="lg" className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-all duration-300 text-sm md:text-base h-11 md:h-12 px-5 md:px-8">
                <Link href="/dashboard/landlord/add-property">
                  <Building className="mr-2 h-4 w-4" />
                  List Property
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ========== STATS SECTION ========== */}
      <section className="py-8 md:py-12 lg:py-16 bg-white dark:bg-gray-950 transition-colors duration-300 border-y border-gray-100 dark:border-gray-800">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 lg:gap-8 max-w-4xl mx-auto">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center group">
                  <div className="flex justify-center mb-2 md:mb-3">
                    <div className="p-2.5 md:p-3 bg-indigo-100 dark:bg-indigo-500/10 rounded-full group-hover:scale-110 transition-transform duration-300">
                      <Icon className="h-5 w-5 md:h-6 md:w-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-indigo-600 dark:text-indigo-400 transition-colors duration-300">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========== OUR STORY SECTION ========== */}
      <section className="py-12 md:py-20 lg:py-24 bg-gray-50 dark:bg-gray-900/50 transition-colors duration-300">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
            {/* Content */}
            <div className="order-2 md:order-1">
              <Badge className="mb-3 md:mb-4 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30 px-3 md:px-4 py-1 text-xs md:text-sm transition-colors duration-300">
                Our Story
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4 text-gray-900 dark:text-white transition-colors duration-300">
                Building Trust in Eswatini's Rental Market
              </h2>
              <div className="space-y-3 md:space-y-4 text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-300">
                <p>
                  Ekhaya was born from a simple idea: finding a home in Eswatini 
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
              <div className="flex flex-wrap gap-3 md:gap-4 mt-5 md:mt-6">
                <Button asChild className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 dark:from-indigo-500 dark:to-purple-500 dark:hover:from-indigo-600 dark:hover:to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 text-sm md:text-base h-10 md:h-11">
                  <Link href="/search">
                    <Home className="mr-2 h-4 w-4" />
                    Find a Home
                  </Link>
                </Button>
                <Button variant="outline" asChild className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 text-sm md:text-base h-10 md:h-11">
                  <Link href="/dashboard/landlord/add-property">
                    <Building className="mr-2 h-4 w-4" />
                    List Property
                  </Link>
                </Button>
              </div>
            </div>

            {/* Visual */}
            <div className="order-1 md:order-2">
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 md:p-6 shadow-xl dark:shadow-2xl border border-gray-100 dark:border-gray-800 transition-colors duration-300">
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-3 md:space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 md:p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-300">
                      <Shield className="h-6 w-6 md:h-8 md:w-8 text-indigo-600 dark:text-indigo-400 mb-1 md:mb-2" />
                      <p className="font-semibold text-xs md:text-sm text-gray-900 dark:text-white transition-colors duration-300">Verified Landlords</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 md:p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-300">
                      <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-emerald-500 dark:text-emerald-400 mb-1 md:mb-2" />
                      <p className="font-semibold text-xs md:text-sm text-gray-900 dark:text-white transition-colors duration-300">No Scams</p>
                    </div>
                  </div>
                  <div className="space-y-3 md:space-y-4 mt-4 md:mt-6">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 md:p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-300">
                      <Phone className="h-6 w-6 md:h-8 md:w-8 text-blue-500 dark:text-blue-400 mb-1 md:mb-2" />
                      <p className="font-semibold text-xs md:text-sm text-gray-900 dark:text-white transition-colors duration-300">Direct Contact</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 md:p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-300">
                      <Globe className="h-6 w-6 md:h-8 md:w-8 text-purple-500 dark:text-purple-400 mb-1 md:mb-2" />
                      <p className="font-semibold text-xs md:text-sm text-gray-900 dark:text-white transition-colors duration-300">All of Eswatini</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== OUR VALUES SECTION ========== */}
      <section className="py-12 md:py-20 lg:py-24 bg-white dark:bg-gray-950 transition-colors duration-300">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <Badge className="mb-3 md:mb-4 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30 px-3 md:px-4 py-1 text-xs md:text-sm transition-colors duration-300">
              Our Values
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4 text-gray-900 dark:text-white transition-colors duration-300">
              What We Stand For
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto transition-colors duration-300 px-2">
              These core values guide everything we do at Ekhaya.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <Card key={index} className="text-center hover:shadow-xl dark:hover:shadow-indigo-500/10 transition-all duration-300 border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                  <CardContent className="p-4 md:p-6 lg:p-8">
                    <div className="flex justify-center mb-3 md:mb-4">
                      <div className="p-2.5 md:p-3 bg-indigo-100 dark:bg-indigo-500/10 rounded-full group-hover:scale-110 transition-transform duration-300">
                        <Icon className="h-5 w-5 md:h-6 md:w-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-sm md:text-base lg:text-lg mb-1 md:mb-2 text-gray-900 dark:text-white transition-colors duration-300">
                      {value.title}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed transition-colors duration-300">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========== WHY CHOOSE US SECTION ========== */}
      <section className="py-12 md:py-20 lg:py-24 bg-gray-50 dark:bg-gray-900/50 transition-colors duration-300">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <Badge className="mb-3 md:mb-4 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30 px-3 md:px-4 py-1 text-xs md:text-sm transition-colors duration-300">
              Why Ekhaya
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4 text-gray-900 dark:text-white transition-colors duration-300">
              Why Choose Us?
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto transition-colors duration-300 px-2">
              We make renting simple, safe, and stress-free for everyone in Eswatini.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 md:gap-6 lg:gap-8 max-w-5xl mx-auto">
            <div className="bg-white dark:bg-gray-900 p-5 md:p-6 lg:p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 text-center hover:shadow-lg dark:hover:shadow-indigo-500/5 transition-all duration-300">
              <div className="flex justify-center mb-3 md:mb-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-500/10 rounded-full">
                  <Shield className="h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
              <h3 className="font-semibold text-sm md:text-base lg:text-lg mb-1 md:mb-2 text-gray-900 dark:text-white transition-colors duration-300">Verified Listings</h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed transition-colors duration-300">
                Every property and landlord is verified to ensure a safe rental experience.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-5 md:p-6 lg:p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 text-center hover:shadow-lg dark:hover:shadow-indigo-500/5 transition-all duration-300">
              <div className="flex justify-center mb-3 md:mb-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-500/10 rounded-full">
                  <ThumbsUp className="h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
              <h3 className="font-semibold text-sm md:text-base lg:text-lg mb-1 md:mb-2 text-gray-900 dark:text-white transition-colors duration-300">No Hidden Fees</h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed transition-colors duration-300">
                We believe in transparency. No hidden charges, no surprises.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-5 md:p-6 lg:p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 text-center hover:shadow-lg dark:hover:shadow-indigo-500/5 transition-all duration-300">
              <div className="flex justify-center mb-3 md:mb-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-500/10 rounded-full">
                  <MapPin className="h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
              <h3 className="font-semibold text-sm md:text-base lg:text-lg mb-1 md:mb-2 text-gray-900 dark:text-white transition-colors duration-300">All of Eswatini</h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed transition-colors duration-300">
                From Mbabane to Manzini, we cover all 13 cities and towns.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== TESTIMONIALS SECTION ========== */}
      <section className="py-12 md:py-20 lg:py-24 bg-white dark:bg-gray-950 transition-colors duration-300">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <Badge className="mb-3 md:mb-4 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30 px-3 md:px-4 py-1 text-xs md:text-sm transition-colors duration-300">
              Testimonials
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4 text-gray-900 dark:text-white transition-colors duration-300">
              What Our Users Say
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto transition-colors duration-300 px-2">
              Real stories from real people who found their home through Ekhaya.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 md:gap-6 lg:gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-xl dark:hover:shadow-indigo-500/5 transition-all duration-300">
                <CardContent className="p-5 md:p-6 lg:p-8">
                  <Quote className="h-6 w-6 md:h-8 md:w-8 text-indigo-400 dark:text-indigo-500 mb-3 md:mb-4 opacity-50" />
                  <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4 md:mb-6 transition-colors duration-300">
                    "{testimonial.quote}"
                  </p>
                  <div>
                    <p className="font-semibold text-sm md:text-base text-gray-900 dark:text-white transition-colors duration-300">
                      {testimonial.author}
                    </p>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">
                      {testimonial.location}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ========== TEAM SECTION ========== */}
      <section className="py-12 md:py-20 lg:py-24 bg-gray-50 dark:bg-gray-900/50 transition-colors duration-300">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <Badge className="mb-3 md:mb-4 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30 px-3 md:px-4 py-1 text-xs md:text-sm transition-colors duration-300">
              Our Team
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4 text-gray-900 dark:text-white transition-colors duration-300">
              Meet the People Behind Ekhaya
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto transition-colors duration-300 px-2">
              A dedicated team committed to making property rentals in Eswatini better for everyone.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 max-w-4xl mx-auto">
            {team.map((member, index) => (
              <div key={index} className="text-center group">
                <div className="w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 mx-auto mb-3 md:mb-4 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-500/20 dark:to-purple-500/20 flex items-center justify-center text-2xl md:text-3xl lg:text-4xl font-bold text-indigo-600 dark:text-indigo-400 border-2 border-indigo-200 dark:border-indigo-500/30 transition-colors duration-300">
                  {member.initials}
                </div>
                <h3 className="font-semibold text-sm md:text-base lg:text-lg text-gray-900 dark:text-white transition-colors duration-300">
                  {member.name}
                </h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                  {member.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CTA SECTION ========== */}
      <section className="relative overflow-hidden py-12 md:py-20 lg:py-24">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 dark:from-indigo-700 dark:to-purple-800" />
        
        {/* Gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute -top-[40%] -right-[20%] w-[70%] h-[70%] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
              filter: 'blur(80px)',
            }}
          />
          <div 
            className="absolute -bottom-[30%] -left-[20%] w-[60%] h-[60%] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
              filter: 'blur(80px)',
            }}
          />
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4 text-white">
            Ready to Find Your Home?
          </h2>
          <p className="text-base sm:text-lg md:text-xl mb-6 md:mb-8 text-white/90 max-w-2xl mx-auto px-2">
            Join thousands of happy renters and landlords in Eswatini.
          </p>
          <div className="flex flex-wrap justify-center gap-3 md:gap-4">
            <Button size="lg" variant="secondary" asChild className="bg-white text-indigo-700 hover:bg-gray-100 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 text-sm md:text-base h-11 md:h-12 px-5 md:px-8">
              <Link href="/search">
                <Home className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Browse Properties
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/30 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 text-sm md:text-base h-11 md:h-12 px-5 md:px-8" asChild>
              <Link href="/dashboard/landlord/add-property">
                <Building className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                List Your Property
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
