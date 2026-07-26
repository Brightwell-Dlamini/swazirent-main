import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar, Clock, User, ArrowLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BLOG_POSTS, getPost } from '@/lib/blog';
import { SITE_NAME, absoluteUrl, truncateMeta } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ id: String(p.id) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const post = getPost(Number(id));
  if (!post) return { title: 'Article not found', robots: { index: false } };
  const description = truncateMeta(post.excerpt, 160);
  return {
    title: post.title,
    description,
    alternates: { canonical: `/blog/${post.id}` },
    openGraph: {
      title: post.title,
      description,
      url: absoluteUrl(`/blog/${post.id}`),
      type: 'article',
      images: [{ url: post.image, alt: post.title }],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { id } = await params;
  const post = getPost(Number(id));
  if (!post) notFound();

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: post.image,
    datePublished: post.date,
    author: { '@type': 'Person', name: post.author },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl() },
  };

  return (
    <main className="min-h-screen bg-background">
      <JsonLd data={articleLd} />
      <article className="container mx-auto px-4 py-8 md:py-12 max-w-3xl">
        <Button variant="ghost" size="sm" className="mb-6 -ml-2" asChild>
          <Link href="/blog">
            <ArrowLeft className="h-4 w-4 mr-1" />
            All articles
          </Link>
        </Button>

        <Badge className="mb-3">{post.category}</Badge>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{post.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-8">
          <span className="inline-flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {post.author}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(post.date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {post.readTime}
          </span>
        </div>

        <div className="relative h-56 sm:h-72 md:h-80 rounded-xl overflow-hidden mb-8 bg-muted">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>

        <div className="space-y-4 text-base leading-relaxed text-foreground/90">
          {post.body.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mt-8">
          {post.tags.map((t) => (
            <span
              key={t}
              className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground"
            >
              #{t}
            </span>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <p className="text-sm text-muted-foreground">Looking for a home?</p>
          <Button asChild>
            <Link href="/search">
              Browse listings
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </article>
    </main>
  );
}
