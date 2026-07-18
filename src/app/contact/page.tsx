// src/app/contact/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Mail,
  Phone,
  MapPin,
  Send,
  MessageCircle,
  Clock,
  CheckCircle,
  Loader2,
  ArrowRight,
  Building,
  Home,
  Users,
  Sparkles,
  Shield,
  Zap,
} from 'lucide-react';

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      toast.success('Message sent successfully!');
      toast.info('We\'ll get back to you within 24 hours.');
      
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
      });
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const contactInfo = [
    {
      icon: Phone,
      title: 'Phone',
      details: '+268 7600 0000',
      link: 'tel:+26876000000',
      description: 'Mon-Fri, 9AM - 5PM',
    },
    {
      icon: Mail,
      title: 'Email',
      details: 'support@swazirent.com',
      link: 'mailto:support@swazirent.com',
      description: 'We respond within 24 hours',
    },
    {
      icon: MapPin,
      title: 'Location',
      details: 'Manzini, Eswatini',
      link: 'https://maps.google.com',
      description: 'Main Office',
    },
    {
      icon: MessageCircle,
      title: 'WhatsApp',
      details: '+268 7600 0000',
      link: 'https://wa.me/26876000000',
      description: 'Quick responses',
    },
  ];

  const faqs = [
    {
      question: 'How do I list my property?',
      answer: 'Click "List Your Property" in the navigation or visit the landlord dashboard. You\'ll need to create an account and verify your identity.',
    },
    {
      question: 'Is SwaziRent free to use?',
      answer: 'Yes! Listing your property is free. We only charge a small fee when you successfully find a tenant through our platform.',
    },
    {
      question: 'How do I find a rental property?',
      answer: 'Use our search feature to filter by city, price, bedrooms, and amenities. You can save properties and contact landlords directly.',
    },
    {
      question: 'Are landlords verified?',
      answer: 'Yes. Every landlord goes through a verification process to ensure a safe rental experience for all users.',
    },
  ];

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
      {/* ========== HERO SECTION ========== */}
      <section className="relative overflow-hidden py-16 md:py-20 lg:py-24">
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
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4 md:mb-6 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30 px-4 py-1.5 text-xs md:text-sm transition-colors duration-300">
              Get in Touch
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-4 leading-tight">
              <span className="text-gray-900 dark:text-white transition-colors duration-300">We'd Love to</span>
              <br />
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                Hear From You
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 leading-relaxed px-2 transition-colors duration-300">
              Have questions about SwaziRent? Need help finding a property? 
              Our team is here to assist you.
            </p>
          </div>
        </div>
      </section>

      {/* ========== CONTACT INFO CARDS ========== */}
      <section className="py-8 md:py-12 lg:py-16 bg-white dark:bg-gray-950 transition-colors duration-300 border-b border-gray-100 dark:border-gray-800">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
            {contactInfo.map((item, index) => {
              const Icon = item.icon;
              return (
                <a
                  key={index}
                  href={item.link}
                  target={item.icon === MapPin ? '_blank' : undefined}
                  rel={item.icon === MapPin ? 'noopener noreferrer' : undefined}
                  className="group"
                >
                  <Card className="text-center hover:shadow-xl dark:hover:shadow-indigo-500/10 transition-all duration-300 hover:border-indigo-200 dark:hover:border-indigo-500/30 border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 h-full">
                    <CardContent className="p-4 md:p-6 lg:p-8">
                      <div className="flex justify-center mb-3 md:mb-4">
                        <div className="p-2.5 md:p-3 bg-indigo-100 dark:bg-indigo-500/10 rounded-full group-hover:bg-indigo-200 dark:group-hover:bg-indigo-500/20 group-hover:scale-110 transition-all duration-300">
                          <Icon className="h-5 w-5 md:h-6 md:w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                      </div>
                      <h3 className="font-semibold text-sm md:text-base text-gray-900 dark:text-white transition-colors duration-300">
                        {item.title}
                      </h3>
                      <p className="text-xs md:text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-0.5 md:mb-1 transition-colors duration-300">
                        {item.details}
                      </p>
                      <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">
                        {item.description}
                      </p>
                    </CardContent>
                  </Card>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========== CONTACT FORM & FAQ ========== */}
      <section className="py-12 md:py-20 lg:py-24 bg-gray-50 dark:bg-gray-900/50 transition-colors duration-300">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 max-w-6xl mx-auto">
            {/* Contact Form */}
            <div>
              <div className="mb-5 md:mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-900 dark:text-white transition-colors duration-300">
                  Send Us a Message
                </h2>
                <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 transition-colors duration-300">
                  Fill in the form and we'll get back to you within 24 hours.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                <div>
                  <Label htmlFor="name" className="text-sm md:text-base text-gray-700 dark:text-gray-300 transition-colors duration-300">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Your full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="mt-1.5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors duration-300"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm md:text-base text-gray-700 dark:text-gray-300 transition-colors duration-300">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="mt-1.5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors duration-300"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm md:text-base text-gray-700 dark:text-gray-300 transition-colors duration-300">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+268 7600 0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1.5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors duration-300"
                  />
                </div>

                <div>
                  <Label htmlFor="subject" className="text-sm md:text-base text-gray-700 dark:text-gray-300 transition-colors duration-300">
                    Subject <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="subject"
                    placeholder="What is this regarding?"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    className="mt-1.5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors duration-300"
                  />
                </div>

                <div>
                  <Label htmlFor="message" className="text-sm md:text-base text-gray-700 dark:text-gray-300 transition-colors duration-300">
                    Message <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us how we can help..."
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    className="mt-1.5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors duration-300 resize-y"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 dark:from-indigo-500 dark:to-purple-500 dark:hover:from-indigo-600 dark:hover:to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 text-sm md:text-base h-11 md:h-12"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>

                <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-500 text-center transition-colors duration-300">
                  By submitting, you agree to our Privacy Policy. We'll never share your data.
                </p>
              </form>
            </div>

            {/* FAQ Section */}
            <div className="mt-8 md:mt-0">
              <div className="mb-5 md:mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-900 dark:text-white transition-colors duration-300">
                  Frequently Asked Questions
                </h2>
                <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 transition-colors duration-300">
                  Find quick answers to common questions about SwaziRent.
                </p>
              </div>
              <div className="space-y-3 md:space-y-4">
                {faqs.map((faq, index) => (
                  <Card key={index} className="hover:shadow-lg dark:hover:shadow-indigo-500/5 transition-all duration-300 border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <CardContent className="p-4 md:p-5 lg:p-6">
                      <h3 className="font-semibold text-sm md:text-base mb-1 text-gray-900 dark:text-white transition-colors duration-300">
                        {faq.question}
                      </h3>
                      <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed transition-colors duration-300">
                        {faq.answer}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-4 md:mt-6 p-4 md:p-5 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg border border-indigo-100 dark:border-indigo-500/20 transition-colors duration-300">
                <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 transition-colors duration-300">
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">Still have questions?</span>{' '}
                  Reach out to us and we'll be happy to help.
                </p>
                <Button variant="link" className="p-0 h-auto text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mt-1 text-sm md:text-base" asChild>
                  <Link href="mailto:support@swazirent.com" className="flex items-center gap-1">
                    support@swazirent.com
                    <ArrowRight className="h-3 w-3 md:h-4 md:w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== OFFICE HOURS ========== */}
      <section className="py-10 md:py-16 lg:py-20 bg-white dark:bg-gray-950 transition-colors duration-300 border-y border-gray-100 dark:border-gray-800">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4 md:mb-6 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30 px-4 py-1.5 text-xs md:text-sm transition-colors duration-300">
              Office Hours
            </Badge>
            <div className="grid md:grid-cols-2 gap-6 md:gap-8 lg:gap-12">
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 md:p-6 lg:p-8 transition-colors duration-300">
                <h3 className="font-semibold text-base md:text-lg mb-3 md:mb-4 flex items-center justify-center gap-2 text-gray-900 dark:text-white transition-colors duration-300">
                  <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Business Hours
                </h3>
                <div className="space-y-2 md:space-y-2.5 text-sm md:text-base text-gray-600 dark:text-gray-400 transition-colors duration-300">
                  <div className="flex justify-between items-center">
                    <span>Monday - Friday</span>
                    <span className="font-medium text-gray-900 dark:text-white transition-colors duration-300">9:00 AM - 5:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Saturday</span>
                    <span className="font-medium text-gray-900 dark:text-white transition-colors duration-300">10:00 AM - 2:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Sunday</span>
                    <span className="font-medium text-gray-400 dark:text-gray-600 transition-colors duration-300">Closed</span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 md:p-6 lg:p-8 transition-colors duration-300">
                <h3 className="font-semibold text-base md:text-lg mb-3 md:mb-4 flex items-center justify-center gap-2 text-gray-900 dark:text-white transition-colors duration-300">
                  <CheckCircle className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                  Response Times
                </h3>
                <div className="space-y-2 md:space-y-2.5 text-sm md:text-base text-gray-600 dark:text-gray-400 transition-colors duration-300">
                  <div className="flex justify-between items-center">
                    <span>Email</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 transition-colors duration-300">Within 24 hours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>WhatsApp</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 transition-colors duration-300">Within 2 hours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Phone</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 transition-colors duration-300">Immediate</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== TRUST INDICATORS ========== */}
      <section className="py-10 md:py-16 bg-gray-50 dark:bg-gray-900/50 transition-colors duration-300">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-6 md:mb-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
                Why Choose SwaziRent?
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 transition-colors duration-300">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-500/10 rounded-full shrink-0">
                  <Shield className="h-4 w-4 md:h-5 md:w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="font-medium text-xs md:text-sm text-gray-900 dark:text-white transition-colors duration-300">Verified Listings</p>
                  <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">Every property vetted</p>
                </div>
              </div>
              <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 transition-colors duration-300">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/10 rounded-full shrink-0">
                  <Zap className="h-4 w-4 md:h-5 md:w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium text-xs md:text-sm text-gray-900 dark:text-white transition-colors duration-300">Fast Response</p>
                  <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">Within 24 hours</p>
                </div>
              </div>
              <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 transition-colors duration-300 sm:col-span-2 lg:col-span-1">
                <div className="p-2 bg-purple-100 dark:bg-purple-500/10 rounded-full shrink-0">
                  <Users className="h-4 w-4 md:h-5 md:w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-xs md:text-sm text-gray-900 dark:text-white transition-colors duration-300">Community Trust</p>
                  <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">1,200+ happy renters</p>
                </div>
              </div>
            </div>
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
            Ready to Get Started?
          </h2>
          <p className="text-base sm:text-lg md:text-xl mb-6 md:mb-8 text-white/90 max-w-2xl mx-auto px-2">
            Join the SwaziRent community today. Find your next home or list your property.
          </p>
          <div className="flex flex-wrap justify-center gap-3 md:gap-4">
            <Button size="lg" variant="secondary" asChild className="bg-white text-indigo-700 hover:bg-gray-100 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 text-sm md:text-base h-11 md:h-12 px-5 md:px-8">
              <Link href="/search">
                <Home className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Find a Home
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
