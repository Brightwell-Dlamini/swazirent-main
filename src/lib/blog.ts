// src/lib/blog.ts
export type BlogPost = {
  id: number;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  image: string;
  tags: string[];
  popular: boolean;
  body: string[];
};

export const BLOG_POSTS: BlogPost[] = [
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
    popular: true,
    body: [
      'Renting for the first time in Eswatini can feel overwhelming. Start with a clear monthly budget that includes rent, utilities, transport, and a small emergency buffer.',
      'Always view the property in person. Photos can hide leaks, noise, or distance from work and shops. Bring a checklist: water pressure, locks, power points, and cell signal.',
      'Ask about tenure, who pays rates, and whether the landlord is verified on Ekhaya. Never send a deposit before you have seen the place and agreed terms in writing.',
      'Compare a few listings in the same suburb. Manzini and Mbabane prices vary by street — a short walk can change both cost and safety.',
      'Use WhatsApp or a call through the listing so you keep a record of the conversation. If something feels rushed or secretive, walk away.',
    ],
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
    popular: true,
    body: [
      'Scammers often pressure you to pay before viewing. Legitimate landlords in Eswatini almost always allow a visit first.',
      'Be careful if the price is far below similar homes nearby, or if the poster refuses a video call or in-person meeting.',
      'Never share bank OTPs, mobile-money PINs, or processing fees to unknown accounts. Ekhaya will never ask for your banking codes.',
      'Check for a Verified badge and report suspicious listings with the Report button so we can review them quickly.',
      'If you already paid and suspect fraud, contact your bank or mobile-money provider immediately and report the listing via Contact.',
    ],
  },
  {
    id: 3,
    title: 'The Ultimate Guide to Renting in Manzini',
    excerpt: "Everything you need to know about finding and renting a property in Eswatini's commercial hub.",
    category: 'City Guides',
    author: 'Nomsa Nkosi',
    date: '2024-01-05',
    readTime: '7 min read',
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&auto=format&fit=crop&q=80',
    tags: ['Manzini', 'City Guide', 'Location'],
    popular: false,
    body: [
      'Manzini is Eswatini commercial centre. Demand is strong near the CBD, Fairview, and areas with easy access to the highway.',
      'Expect a mix of flats, townhouses, and stand-alone homes. Budget carefully — popular streets fill quickly at month-end.',
      'Use Ekhaya search filtered to Manzini, or open the city page for recent listings. The map view helps you avoid long commutes.',
      'Ask about water reliability, generator or inverter setups, and security. These details matter as much as bedroom count.',
    ],
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
    popular: false,
    body: [
      'Clear photos sell. Shoot in daylight, show every room, and put the best image first as the cover on Ekhaya.',
      'Write an honest description: suburb, price, what is included, and any house rules. Ambiguity slows serious enquiries.',
      'Respond quickly on WhatsApp. Good tenants often take the first landlord who answers professionally.',
      'Complete verification on Ekhaya so seekers trust your listing. Keep status updated when a unit is taken.',
    ],
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
    popular: false,
    body: [
      'A written lease protects both parties. It should state rent, deposit, duration, who pays utilities, and notice periods.',
      'This article is general information, not legal advice. For complex disputes, consult a qualified professional in Eswatini.',
      'Inspect the property on move-in and note existing damage in writing. Photos help if there is a deposit dispute later.',
      'Keep payment records. Mobile-money confirmations and receipts reduce arguments at month-end.',
    ],
  },
  {
    id: 6,
    title: 'Top 5 Neighborhoods to Live in Mbabane',
    excerpt: "Explore the best residential areas in Eswatini's capital city for families, professionals, and students.",
    category: 'City Guides',
    author: 'Lindiwe Simelane',
    date: '2023-12-15',
    readTime: '6 min read',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80',
    tags: ['Mbabane', 'Neighborhoods', 'Lifestyle'],
    popular: true,
    body: [
      'Mbabane offers quieter residential pockets and easy access to government and services. Prefer areas that match your commute.',
      'Compare listings on Ekhaya by suburb and price. Walk the street if you can — traffic and noise differ block by block.',
      'Families often prioritise space and security; professionals may trade size for proximity to work.',
      'Check our Mbabane city page for the latest active homes, flats, and plots.',
    ],
  },
];

export function getPost(id: number) {
  return BLOG_POSTS.find((p) => p.id === id);
}
