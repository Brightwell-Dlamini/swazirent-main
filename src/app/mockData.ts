// src/app/mockData.ts

export interface FeaturedListing {
    id: number;
    title: string;
    location: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    image: string;
    isVerified: boolean;
}

export interface City {
    name: string;
    count: number;
    image: string;
}

// Featured listings with REAL images
export const featuredListings: FeaturedListing[] = [
    {
        id: 1,
        title: 'Modern 2-Bedroom Apartment',
        location: 'Ngwane Park, Manzini',
        price: 3500,
        bedrooms: 2,
        bathrooms: 1,
        image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&auto=format&fit=crop',
        isVerified: true,
    },
    {
        id: 2,
        title: 'Spacious Family Home',
        location: 'Mbabane West, Mbabane',
        price: 4500,
        bedrooms: 3,
        bathrooms: 2,
        image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&auto=format&fit=crop',
        isVerified: true,
    },
    {
        id: 3,
        title: 'Secure Backrooms',
        location: 'Matsapha Industrial, Manzini',
        price: 1800,
        bedrooms: 1,
        bathrooms: 1,
        image: 'https://images.unsplash.com/photo-1740512304922-67a9a5e502e4?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8YmFja3Jvb20lMjB0byUyMGxldHxlbnwwfHwwfHx8MA%3D%3D',
        isVerified: true,
    },
    {
        id: 4,
        title: 'Executive 4-Bedroom Villa',
        location: 'Mbabane West, Mbabane',
        price: 6500,
        bedrooms: 4,
        bathrooms: 3,
        image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&auto=format&fit=crop',
        isVerified: true,
    },
    {
        id: 5,
        title: 'Cozy 1-Bedroom Apartment',
        location: 'Ngwane Park, Manzini',
        price: 2800,
        bedrooms: 1,
        bathrooms: 1,
        image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&auto=format&fit=crop',
        isVerified: true,
    },
    {
        id: 6,
        title: 'Modern Studio Backrooms',
        location: 'Matsapha, Manzini',
        price: 1500,
        bedrooms: 1,
        bathrooms: 1,
        image: 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=400&auto=format&fit=crop',
        isVerified: true,
    },
];

// City data with listing counts and REAL images
export const cities: City[] = [
    {
        name: 'Manzini',
        count: 24,
        image: 'https://images.unsplash.com/photo-1746171002636-c4e3f621acb4?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTZ8fE1hbnppbml8ZW58MHx8MHx8fDA%3D'
    },
    {
        name: 'Mbabane',
        count: 18,
        image: 'https://images.unsplash.com/photo-1655207882298-bd11bb69ee43?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8TWJhYmFuZXxlbnwwfHwwfHx8MA%3D%3D'
    },
    {
        name: 'Matsapha',
        count: 12,
        image: 'https://images.unsplash.com/photo-1750750575080-93dd0ba107b5?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8TWF0c2FwaGF8ZW58MHx8MHx8fDA%3D'
    },
    {
        name: 'Nhlangano',
        count: 8,
        image: 'https://images.unsplash.com/photo-1753331379239-46c480422466?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fE5obGFuZ2Fub3xlbnwwfHwwfHx8MA%3D%3D'
    },
    {
        name: 'Siteki',
        count: 6,
        image: 'https://images.unsplash.com/photo-1753331208497-76e3d1de5851?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8TWFuemluaXxlbnwwfHwwfHx8MA%3D%3D'
    },
    {
        name: 'Big Bend',
        count: 5,
        image: 'https://images.unsplash.com/photo-1750582338588-241c5bcbda05?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fE1hbnppbml8ZW58MHx8MHx8fDA%3D'
    },
];