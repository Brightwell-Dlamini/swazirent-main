# Deployment Checklist for SwaziRent

## Pre-deployment Tasks

### Environment Variables

- [ ] Set up production Supabase project
- [ ] Configure environment variables in hosting platform:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `RESEND_API_KEY` (for emails)

### Database

- [ ] Run migrations on production database
- [ ] Set up storage bucket policies
- [ ] Create database functions
- [ ] Set up proper RLS policies

### Email

- [ ] Verify domain with Resend
- [ ] Set up email templates
- [ ] Test welcome email flow

### Security

- [ ] Enable HTTPS
- [ ] Set up rate limiting
- [ ] Add CAPTCHA to forms
- [ ] Review RLS policies
- [ ] Set up backups

### Content

- [ ] Add real city images
- [ ] Create about page
- [ ] Create contact page
- [ ] Add FAQ section
- [ ] Create privacy policy
- [ ] Create terms of service

### SEO

- [ ] Add meta descriptions to all pages
- [ ] Create sitemap.xml
- [ ] Create robots.txt
- [ ] Add Google Analytics
- [ ] Set up Google Search Console

## Deployment Steps

1. Push code to GitHub repository
2. Connect to Vercel/Netlify
3. Configure environment variables
4. Deploy
5. Test all functionality
6. Set up custom domain
7. Enable SSL

## Post-deployment

- [ ] Monitor error logs
- [ ] Set up performance monitoring
- [ ] Create admin account
- [ ] Add test listings
- [ ] Test WhatsApp integration
- [ ] Test email notifications
- [ ] Set up backups schedule
