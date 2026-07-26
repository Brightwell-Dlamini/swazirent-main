// src/lib/faqs.ts
export type FaqItem = { q: string; a: string };
export type FaqCategory = { category: string; questions: FaqItem[] };

export const FAQS: FaqCategory[] = [
  {
    category: 'General',
    questions: [
      {
        q: 'What is Ekhaya?',
        a: "Ekhaya is Eswatini's premier property platform connecting seekers with verified landlords, brokers, and agents. Find homes, land, and commercial space across the country.",
      },
      {
        q: 'Is Ekhaya free to use?',
        a: 'Yes. Searching and contacting posters is free for seekers. Basic listings are free for landlords, brokers, and agents, with optional featured placement.',
      },
      {
        q: 'How do I get started?',
        a: 'Search by city on the homepage, browse verified listings, and contact the poster by phone or WhatsApp. Create a free account to save listings.',
      },
    ],
  },
  {
    category: 'For Renters & Buyers',
    questions: [
      {
        q: 'How do I search for properties?',
        a: 'Use search or the map. Filter by city, price, bedrooms, land size, and property type (residential, land, commercial).',
      },
      {
        q: 'How do I contact a landlord or agent?',
        a: 'Open any listing and use Call, WhatsApp, or Email. Contact details are shown on active listings.',
      },
      {
        q: 'Are the listings verified?',
        a: 'Posters can be verified by Ekhaya admin. Look for the Verified badge. Always view in person before paying.',
      },
      {
        q: 'Can I save properties I like?',
        a: 'Yes. Sign in and use Save on any listing to keep a shortlist in your dashboard.',
      },
    ],
  },
  {
    category: 'For Landlords, Brokers & Agents',
    questions: [
      {
        q: 'How do I list my property?',
        a: 'Create an account as landlord, broker, or agent, verify your phone, then use Add Property. Upload photos, set price and location, and submit for review.',
      },
      {
        q: 'Is there a fee to list?',
        a: 'Basic listings are free. Featured listings may be offered as a paid boost so your property appears higher in search.',
      },
      {
        q: 'How do I manage my listings?',
        a: 'Use the landlord dashboard to edit, pause, mark taken, or update photos and contact details.',
      },
    ],
  },
  {
    category: 'Safety & Trust',
    questions: [
      {
        q: 'How do I report a problem or scam?',
        a: 'Use Report on the listing page, or contact support via the Contact page. Never send money before viewing a property in person.',
      },
      {
        q: 'What if a listing is already taken?',
        a: 'Report it as Already Taken so we can update the status and keep search results accurate.',
      },
      {
        q: 'Is my data secure?',
        a: 'We use industry-standard practices with Supabase auth and secure connections. We do not ask for bank OTPs or one-time payment codes on behalf of landlords.',
      },
    ],
  },
];

export function allFaqPairs(): { question: string; answer: string }[] {
  return FAQS.flatMap((c) => c.questions.map((x) => ({ question: x.q, answer: x.a })));
}
