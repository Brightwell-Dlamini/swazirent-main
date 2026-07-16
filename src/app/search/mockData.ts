// mock/properties.ts

import { Property, PropertyPhoto, PropertyType } from '@/types/property';

// Define types for related data
interface MockLandlord {
    full_name: string;
    phone: string;
    is_verified: boolean;
}

// Extended type for properties with relations
export interface PropertyWithRelations extends Property {
    landlord: MockLandlord;
    photos: PropertyPhoto[];
}

export const MOCK_PROPERTIES: Property[] = [
    {
        id: '1',
        landlord_id: 'landlord_1',
        title: 'Spacious 3-Bedroom House with Garden',
        description: 'Beautiful family home with large garden, modern kitchen, and close to schools and shops in Mbabane. Features include solar panels, backup water, and 24hr security.',
        price: 2500,
        bedrooms: 3,
        bathrooms: 2,
        property_type: 'house',
        location_city: 'Mbabane',
        location_suburb: 'Ezulwini Valley',
        location_address: '15 Mountain Drive',
        latitude: -26.3167,
        longitude: 31.1333,
        is_furnished: false,
        amenities: ['Parking', 'Backup Water', 'Security', 'Garden', 'Built-in Wardrobes', 'Pet Friendly', 'Electric Fence', '24hr Security'],
        status: 'active',
        is_featured: true,
        views: 145,
        contact_phone: '+268 7600 1234',
        created_at: '2024-03-15T10:30:00Z',
        updated_at: '2024-03-15T10:30:00Z'
    },
    {
        id: '2',
        landlord_id: 'landlord_2',
        title: 'Modern 2-Bedroom Apartment with Mountain Views',
        description: 'Stunning apartment with panoramic mountain views in Mbabane Central. Fully furnished with high-end finishes, secure parking, and access to rooftop terrace.',
        price: 3500,
        bedrooms: 2,
        bathrooms: 2,
        property_type: 'apartment',
        location_city: 'Mbabane',
        location_suburb: 'Central',
        location_address: '45 Gwamile Street',
        latitude: -26.3208,
        longitude: 31.1417,
        is_furnished: true,
        amenities: ['Parking', 'Security', 'Furnished', 'Built-in Wardrobes', '24hr Security'],
        status: 'active',
        is_featured: true,
        views: 89,
        contact_phone: '+268 7611 9876',
        created_at: '2024-03-14T14:20:00Z',
        updated_at: '2024-03-14T14:20:00Z'
    },
    {
        id: '3',
        landlord_id: 'landlord_3',
        title: 'Cozy 1-Bedroom Backrooms in Quiet Neighborhood',
        description: 'Private and secure backrooms with separate entrance in Manzini. Perfect for single professional or student. Includes parking and prepaid electricity.',
        price: 1200,
        bedrooms: 1,
        bathrooms: 1,
        property_type: 'backrooms',
        location_city: 'Manzini',
        location_suburb: 'Fairview',
        location_address: '22 Ngwane Street',
        latitude: -26.4988,
        longitude: 31.3800,
        is_furnished: false,
        amenities: ['Parking', 'Pet Friendly', 'Electric Fence'],
        status: 'active',
        is_featured: false,
        views: 56,
        contact_phone: '+268 7622 4567',
        created_at: '2024-03-13T09:15:00Z',
        updated_at: '2024-03-13T09:15:00Z'
    },
    {
        id: '4',
        landlord_id: 'landlord_1',
        title: 'Luxury 4-Bedroom Townhouse in Secure Estate',
        description: 'Elegant townhouse in sought-after security estate in Ezulwini. Open plan living, modern kitchen, private garden, and double garage.',
        price: 4500,
        bedrooms: 4,
        bathrooms: 3,
        property_type: 'townhouse',
        location_city: 'Ezulwini',
        location_suburb: 'The Valley',
        location_address: '8 Mantenga Drive',
        latitude: -26.4167,
        longitude: 31.1667,
        is_furnished: true,
        amenities: ['Parking', 'Backup Water', 'Security', 'Garden', 'Furnished', 'Built-in Wardrobes', 'Electric Fence', '24hr Security'],
        status: 'active',
        is_featured: true,
        views: 234,
        contact_phone: '+268 7600 1234',
        created_at: '2024-03-12T16:45:00Z',
        updated_at: '2024-03-12T16:45:00Z'
    },
    {
        id: '5',
        landlord_id: 'landlord_2',
        title: 'Student-Friendly 2-Bedroom Apartment near University',
        description: 'Conveniently located near University of Eswatini in Kwaluseni. Modern finishes, secure building with laundry facilities and study areas.',
        price: 1800,
        bedrooms: 2,
        bathrooms: 1,
        property_type: 'apartment',
        location_city: 'Manzini',
        location_suburb: 'Kwaluseni',
        location_address: '56 University Road',
        latitude: -26.4833,
        longitude: 31.3333,
        is_furnished: true,
        amenities: ['Security', 'Furnished', 'Built-in Wardrobes', '24hr Security'],
        status: 'active',
        is_featured: false,
        views: 67,
        contact_phone: '+268 7611 9876',
        created_at: '2024-03-11T11:30:00Z',
        updated_at: '2024-03-11T11:30:00Z'
    },
    {
        id: '6',
        landlord_id: 'landlord_3',
        title: 'Spacious 3-Bedroom House with Pool',
        description: 'Beautiful family home with swimming pool, large garden, and entertainment area in Matsapha. Solar powered with battery backup.',
        price: 3800,
        bedrooms: 3,
        bathrooms: 2,
        property_type: 'house',
        location_city: 'Manzini',
        location_suburb: 'Matsapha',
        location_address: '12 Industrial Road',
        latitude: -26.5242,
        longitude: 31.3072,
        is_furnished: false,
        amenities: ['Parking', 'Backup Water', 'Security', 'Garden', 'Built-in Wardrobes', 'Pet Friendly', 'Electric Fence'],
        status: 'active',
        is_featured: true,
        views: 178,
        contact_phone: '+268 7622 4567',
        created_at: '2024-03-10T13:20:00Z',
        updated_at: '2024-03-10T13:20:00Z'
    },
    {
        id: '7',
        landlord_id: 'landlord_1',
        title: 'Executive 3-Bedroom House in Lobamba',
        description: 'Stately home near Parliament buildings, featuring traditional Swazi architecture with modern amenities. Large garden with indigenous plants.',
        price: 4200,
        bedrooms: 3,
        bathrooms: 2.5,
        property_type: 'house',
        location_city: 'Lobamba',
        location_suburb: 'Royal Valley',
        location_address: '3 Parliament Road',
        latitude: -26.4667,
        longitude: 31.2000,
        is_furnished: false,
        amenities: ['Parking', 'Backup Water', 'Security', 'Garden', 'Built-in Wardrobes', 'Electric Fence', 'Staff Quarters'],
        status: 'active',
        is_featured: true,
        views: 92,
        contact_phone: '+268 7600 1234',
        created_at: '2024-03-09T10:00:00Z',
        updated_at: '2024-03-09T10:00:00Z'
    },
    {
        id: '8',
        landlord_id: 'landlord_2',
        title: 'Modern 2-Bedroom Apartment in Nhlangano',
        description: 'Contemporary apartment in Eswatini\'s southern hub. Close to shops, schools, and public transport. Ideal for young professionals.',
        price: 1600,
        bedrooms: 2,
        bathrooms: 1,
        property_type: 'apartment',
        location_city: 'Nhlangano',
        location_suburb: 'Town Centre',
        location_address: '28 Mahlehluka Street',
        latitude: -27.1167,
        longitude: 31.2000,
        is_furnished: false,
        amenities: ['Parking', 'Security', 'Built-in Wardrobes'],
        status: 'active',
        is_featured: false,
        views: 45,
        contact_phone: '+268 7611 9876',
        created_at: '2024-03-08T15:45:00Z',
        updated_at: '2024-03-08T15:45:00Z'
    },
    {
        id: '9',
        landlord_id: 'landlord_3',
        title: 'Riverside Cottage in Piggs Peak',
        description: 'Charming cottage overlooking the Komati River. Perfect for nature lovers, with hiking trails and stunning mountain views.',
        price: 2200,
        bedrooms: 2,
        bathrooms: 1,
        property_type: 'house',
        location_city: 'Piggs Peak',
        location_suburb: 'Forestry Area',
        location_address: '7 River Bend',
        latitude: -25.9667,
        longitude: 31.2500,
        is_furnished: true,
        amenities: ['Parking', 'Garden', 'Furnished', 'Pet Friendly', 'Fireplace'],
        status: 'active',
        is_featured: false,
        views: 78,
        contact_phone: '+268 7622 4567',
        created_at: '2024-03-07T11:20:00Z',
        updated_at: '2024-03-07T11:20:00Z'
    },
    {
        id: '10',
        landlord_id: 'landlord_1',
        title: 'Commercial & Residential Property in Siteki',
        description: 'Unique property with ground floor retail space and upstairs 2-bedroom apartment. Ideal for investor wanting live-work setup.',
        price: 2800,
        bedrooms: 2,
        bathrooms: 1.5,
        property_type: 'townhouse',
        location_city: 'Siteki',
        location_suburb: 'Commercial Area',
        location_address: '45 Main Street',
        latitude: -26.4500,
        longitude: 31.9500,
        is_furnished: false,
        amenities: ['Parking', 'Security', 'Commercial Space', 'Separate Entrance'],
        status: 'active',
        is_featured: false,
        views: 34,
        contact_phone: '+268 7600 1234',
        created_at: '2024-03-06T09:30:00Z',
        updated_at: '2024-03-06T09:30:00Z'
    }
];

// Mock photos for properties
export const MOCK_PHOTOS: Record<string, PropertyPhoto[]> = {
    '1': [
        {
            id: 'photo_1_1',
            property_id: '1',
            photo_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
            caption: 'Living Room',
            display_order: 1,
            created_at: '2024-03-15T10:30:00Z'
        },
        {
            id: 'photo_1_2',
            property_id: '1',
            photo_url: 'https://images.unsplash.com/photo-1600572402589-85c4a86f36db?w=800',
            caption: 'Kitchen',
            display_order: 2,
            created_at: '2024-03-15T10:30:00Z'
        },
        {
            id: 'photo_1_3',
            property_id: '1',
            photo_url: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800',
            caption: 'Garden with Mountain View',
            display_order: 3,
            created_at: '2024-03-15T10:30:00Z'
        }
    ],
    '2': [
        {
            id: 'photo_2_1',
            property_id: '2',
            photo_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
            caption: 'Living Area',
            display_order: 1,
            created_at: '2024-03-14T14:20:00Z'
        },
        {
            id: 'photo_2_2',
            property_id: '2',
            photo_url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
            caption: 'Bedroom',
            display_order: 2,
            created_at: '2024-03-14T14:20:00Z'
        }
    ],
    '3': [
        {
            id: 'photo_3_1',
            property_id: '3',
            photo_url: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800',
            caption: 'Exterior',
            display_order: 1,
            created_at: '2024-03-13T09:15:00Z'
        }
    ],
    '4': [
        {
            id: 'photo_4_1',
            property_id: '4',
            photo_url: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800',
            caption: 'Living Room',
            display_order: 1,
            created_at: '2024-03-12T16:45:00Z'
        },
        {
            id: 'photo_4_2',
            property_id: '4',
            photo_url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
            caption: 'Kitchen',
            display_order: 2,
            created_at: '2024-03-12T16:45:00Z'
        }
    ],
    '5': [
        {
            id: 'photo_5_1',
            property_id: '5',
            photo_url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
            caption: 'Interior',
            display_order: 1,
            created_at: '2024-03-11T11:30:00Z'
        }
    ],
    '6': [
        {
            id: 'photo_6_1',
            property_id: '6',
            photo_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
            caption: 'Pool Area',
            display_order: 1,
            created_at: '2024-03-10T13:20:00Z'
        },
        {
            id: 'photo_6_2',
            property_id: '6',
            photo_url: 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=800',
            caption: 'Garden',
            display_order: 2,
            created_at: '2024-03-10T13:20:00Z'
        }
    ],
    '7': [
        {
            id: 'photo_7_1',
            property_id: '7',
            photo_url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800',
            caption: 'Exterior',
            display_order: 1,
            created_at: '2024-03-09T10:00:00Z'
        },
        {
            id: 'photo_7_2',
            property_id: '7',
            photo_url: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
            caption: 'Garden',
            display_order: 2,
            created_at: '2024-03-09T10:00:00Z'
        }
    ],
    '8': [
        {
            id: 'photo_8_1',
            property_id: '8',
            photo_url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
            caption: 'Living Area',
            display_order: 1,
            created_at: '2024-03-08T15:45:00Z'
        }
    ],
    '9': [
        {
            id: 'photo_9_1',
            property_id: '9',
            photo_url: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800',
            caption: 'Cottage Exterior',
            display_order: 1,
            created_at: '2024-03-07T11:20:00Z'
        },
        {
            id: 'photo_9_2',
            property_id: '9',
            photo_url: 'https://images.unsplash.com/photo-1563299796-17596ed6b017?w=800',
            caption: 'River View',
            display_order: 2,
            created_at: '2024-03-07T11:20:00Z'
        }
    ],
    '10': [
        {
            id: 'photo_10_1',
            property_id: '10',
            photo_url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
            caption: 'Building Exterior',
            display_order: 1,
            created_at: '2024-03-06T09:30:00Z'
        }
    ]
};

// Mock landlord profiles
export const MOCK_LANDLORDS: Record<string, MockLandlord> = {
    'landlord_1': {
        full_name: 'James Dlamini',
        phone: '+268 7600 1234',
        is_verified: true
    },
    'landlord_2': {
        full_name: 'Nomsa Mamba',
        phone: '+268 7611 9876',
        is_verified: true
    },
    'landlord_3': {
        full_name: 'Thabo Nkosi',
        phone: '+268 7622 4567',
        is_verified: false
    }
};

// Helper function to get properties with their related data
export const getMockPropertiesWithRelations = (): PropertyWithRelations[] => {
    return MOCK_PROPERTIES.map(property => ({
        ...property,
        landlord: MOCK_LANDLORDS[property.landlord_id] || {
            full_name: 'Unknown Landlord',
            phone: '',
            is_verified: false
        },
        photos: MOCK_PHOTOS[property.id] || [],
        // Ensure coordinates exist
        latitude: property.latitude ?? 0,
        longitude: property.longitude ?? 0,
    }));
};

// Define filter type
export interface PropertyFilters {
    city?: string;
    keyword?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: string;
    propertyType?: PropertyType[];
    amenities?: string[];
    furnished?: boolean;
}

// Eswatini cities for filter options
export const ESWATINI_CITIES = [
    'Mbabane',
    'Manzini',
    'Ezulwini',
    'Lobamba',
    'Nhlangano',
    'Piggs Peak',
    'Siteki',
    'Big Bend',
    'Mhlume',
    'Simunye',
    'Matsapha',
    'Hlatikulu'
];

// Eswatini-specific amenities
export const ESWATINI_AMENITIES = [
    'Parking',
    'Fully Fitted',
    'Pet Friendly',
    'Electric Gate',
    '24hr Security',
];

// Helper function to filter properties based on criteria
export const filterMockProperties = (
    properties: PropertyWithRelations[],
    filters: PropertyFilters
): PropertyWithRelations[] => {
    return properties.filter(property => {
        // City filter
        if (filters.city && !property.location_city?.toLowerCase().includes(filters.city.toLowerCase())) {
            return false;
        }

        // Keyword search in title and description
        if (filters.keyword) {
            const keyword = filters.keyword.toLowerCase();
            const matchesTitle = property.title?.toLowerCase().includes(keyword) || false;
            const matchesDescription = property.description?.toLowerCase().includes(keyword) || false;
            if (!matchesTitle && !matchesDescription) {
                return false;
            }
        }

        // Price range (in Emalangeni - E)
        if (filters.minPrice && property.price < filters.minPrice) {
            return false;
        }
        if (filters.maxPrice && property.price > filters.maxPrice) {
            return false;
        }

        // Bedrooms - handle 'any' case
        if (filters.bedrooms && filters.bedrooms !== 'any') {
            const minBedrooms = parseInt(filters.bedrooms);
            if (!property.bedrooms || property.bedrooms < minBedrooms) {
                return false;
            }
        }

        // Property type
        if (filters.propertyType && filters.propertyType.length > 0) {
            if (!property.property_type || !filters.propertyType.includes(property.property_type as PropertyType)) {
                return false;
            }
        }

        // Amenities - must have ALL selected amenities
        if (filters.amenities && filters.amenities.length > 0) {
            if (!property.amenities) return false;
            const hasAllAmenities = filters.amenities.every(amenity =>
                property.amenities?.includes(amenity)
            );
            if (!hasAllAmenities) {
                return false;
            }
        }

        // Furnished
        if (filters.furnished && !property.is_furnished) {
            return false;
        }

        return true;
    });
};

// Filter presets for Eswatini market
export const FILTER_PRESETS = [
    { name: 'Under E2000', filters: { maxPrice: 2000 } },
    { name: '2+ Bedrooms', filters: { bedrooms: '2' } },
    { name: 'Furnished', filters: { furnished: true } },
    { name: 'With Parking', filters: { amenities: ['Parking'] } },
    // { name: 'Solar Power', filters: { amenities: ['Solar Power'] } },
    // { name: 'Staff Quarters', filters: { amenities: ['Staff Quarters'] } },
];

export const PROPERTY_TYPES: PropertyType[] = [
    'house',
    'apartment',
    'townhouse',
    'backrooms',
] as const;

export type SortOption = 'newest' | 'price_asc' | 'price_desc';
export type PaginationMode = 'pagination' | 'load-more';

export interface Filters {
    city: string;
    keyword: string;
    minPrice: number;
    maxPrice: number;
    bedrooms: string;
    propertyType: PropertyType[];
    amenities: string[];

    furnished: boolean;
}

export interface SavedSearch {
    name: string;
    filters: Filters;
    createdAt: number;
}

export const ALL_PROPERTIES = getMockPropertiesWithRelations();