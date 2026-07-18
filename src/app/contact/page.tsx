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
      // Here you would integrate with your email service or API
      // For now, we'll just simulate a successful submission
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
      details: 'support@ekhaya.com',
      link: 'mailto:support@Ekhaya.com',
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
      question: 'Is Ekhaya free to use?',
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
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-linear-to-b from-blue-50 to-white py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 px-4 py-1">
              Get in Touch
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              We'd Love to <span className="text-primary">Hear From You</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Have questions about Ekhaya? Need help finding a property? 
              Our team is here to assist you.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
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
                  <Card className="text-center hover:shadow-lg transition-all duration-300 hover:border-primary/20 h-full">
                    <CardContent className="p-6">
                      <div className="flex justify-center mb-3">
                        <div className="p-3 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      <h3 className="font-semibold mb-1">{item.title}</h3>
                      <p className="text-sm font-medium text-primary mb-1">{item.details}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </CardContent>
                  </Card>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Contact Form */}
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Send Us a Message</h2>
                <p className="text-gray-600">
                  Fill in the form and we'll get back to you within 24 hours.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="Your full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+268 7600 0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    placeholder="What is this regarding?"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us how we can help..."
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
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

                <p className="text-xs text-gray-500 text-center">
                  By submitting, you agree to our Privacy Policy. We'll never share your data.
                </p>
              </form>
            </div>

            {/* FAQ Section */}
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Frequently Asked Questions</h2>
                <p className="text-gray-600">
                  Find quick answers to common questions about Ekhaya.
                </p>
              </div>
              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-1 text-sm">{faq.question}</h3>
                      <p className="text-sm text-gray-600">{faq.answer}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/10">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-primary">Still have questions?</span>{' '}
                  Reach out to us and we'll be happy to help.
                </p>
                <Button variant="link" className="p-0 h-auto text-primary mt-1" asChild>
                  <Link href="mailto:support@ekhaya.com">
                    support@ekhaya.com
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Office Hours */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              Office Hours
            </Badge>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold mb-4 flex items-center justify-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Business Hours
                </h3>
                <div className="space-y-2 text-gray-600">
                  <div className="flex justify-between">
                    <span>Monday - Friday</span>
                    <span className="font-medium">9:00 AM - 5:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saturday</span>
                    <span className="font-medium">10:00 AM - 2:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunday</span>
                    <span className="font-medium text-gray-400">Closed</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-4 flex items-center justify-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Response Times
                </h3>
                <div className="space-y-2 text-gray-600">
                  <div className="flex justify-between">
                    <span>Email</span>
                    <span className="font-medium text-green-600">Within 24 hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span>WhatsApp</span>
                    <span className="font-medium text-green-600">Within 2 hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phone</span>
                    <span className="font-medium text-green-600">Immediate</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-linear-to-r from-primary-600 to-primary-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join the Ekhaya community today. Find your next home or list your property.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/search">
                <Home className="mr-2 h-5 w-5" />
                Find a Home
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
