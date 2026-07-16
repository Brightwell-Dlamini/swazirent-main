// src/mock/properties.ts

import { Property } from '@/types/property';

// Store the current user ID to use in mock data
let currentUserId: string | null = null;

// Base mock properties template (without landlord_id)
const baseProperties: Omit<Property, 'landlord_id'>[] = [
    {
        id: 'prop-001',
        title: 'Spacious 3-Bedroom Family Home in Ngwane Park',
        description: 'Beautiful family home with large garden, perfect for families. Features include modern kitchen, spacious living areas, and secure parking. Close to schools and shopping centers.',
        property_type: 'house',
        price: 4500,
        location_city: 'Manzini',
        location_suburb: 'Ngwane Park',
        location_address: '123 Hillside Drive',
        latitude: -26.4833,
        longitude: 31.3667,
        bedrooms: 3,
        bathrooms: 2,
        is_furnished: false,
        amenities: ['Security', 'Garden', 'Parking', 'Backup Water'],
        lease_terms: '12-month lease, 1 month deposit required',
        status: 'active',
        is_featured: true,
        views: 245,
        created_at: '2025-02-15T10:30:00Z',
        updated_at: '2025-02-15T10:30:00Z',
        contact_phone: '+268 7600 1234',
        contact_whatsapp: '+268 7600 1234',
        landlord: {
            full_name: 'James Dlamini',
            phone: '+268 7600 1234',
            is_verified: true
        },
        photos: [
            {
                id: 'photo-001-1',
                property_id: 'prop-001',
                photo_url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
                caption: 'Front view',
                display_order: 0,
                created_at: '2025-02-15T10:30:00Z'
            },
            {
                id: 'photo-001-2',
                property_id: 'prop-001',
                photo_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
                caption: 'Living room',
                display_order: 1,
                created_at: '2025-02-15T10:30:00Z'
            },
            {
                id: 'photo-001-3',
                property_id: 'prop-001',
                photo_url: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800',
                caption: 'Kitchen',
                display_order: 2,
                created_at: '2025-02-15T10:30:00Z'
            }
        ]
    },
    {
        id: 'prop-002',
        title: 'Modern 2-Bedroom Apartment in CBD',
        description: 'Contemporary apartment in the heart of the city. Walking distance to shops, restaurants, and business districts. Secure building with 24hr security.',
        property_type: 'apartment',
        price: 3200,
        location_city: 'Mbabane',
        location_suburb: 'CBD',
        location_address: '45 Gwamile Street',
        latitude: -26.3167,
        longitude: 31.1333,
        bedrooms: 2,
        bathrooms: 1,
        is_furnished: true,
        amenities: ['24hr Security', 'Parking', 'Backup Water', 'Solar Power', 'Built-in Wardrobes'],
        lease_terms: '6 or 12 month lease, furnished, immediate move-in',
        status: 'active',
        is_featured: false,
        views: 189,
        created_at: '2025-02-20T14:15:00Z',
        updated_at: '2025-02-20T14:15:00Z',
        contact_phone: '+268 7600 1234',
        contact_whatsapp: '+268 7600 1234',
        landlord: {
            full_name: 'James Dlamini',
            phone: '+268 7600 1234',
            is_verified: true
        },
        photos: [
            {
                id: 'photo-002-1',
                property_id: 'prop-002',
                photo_url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
                caption: 'Building exterior',
                display_order: 0,
                created_at: '2025-02-20T14:15:00Z'
            },
            {
                id: 'photo-002-2',
                property_id: 'prop-002',
                photo_url: 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800',
                caption: 'Living area',
                display_order: 1,
                created_at: '2025-02-20T14:15:00Z'
            },
            {
                id: 'photo-002-3',
                property_id: 'prop-002',
                photo_url: 'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=800',
                caption: 'Modern kitchen',
                display_order: 2,
                created_at: '2025-02-20T14:15:00Z'
            }
        ]
    },
    {
        id: 'prop-003',
        title: 'Cozy Townhouse with Garden - Matsapha',
        description: 'Perfect for professionals or small families. Low-maintenance townhouse with small garden, secure complex, and easy access to industrial area.',
        property_type: 'townhouse',
        price: 2800,
        location_city: 'Matsapha',
        location_suburb: 'Industrial Area',
        location_address: '12 Industrial Road',
        latitude: -26.5248,
        longitude: 31.3287,
        bedrooms: 2,
        bathrooms: 1.5,
        is_furnished: false,
        amenities: ['Security', 'Garden', 'Parking', 'Electric Fence'],
        lease_terms: '12-month lease, pets allowed with deposit',
        status: 'active',
        is_featured: false,
        views: 112,
        created_at: '2025-02-10T09:00:00Z',
        updated_at: '2025-02-10T09:00:00Z',
        contact_phone: '+268 7600 1234',
        contact_whatsapp: '+268 7600 1234',
        landlord: {
            full_name: 'James Dlamini',
            phone: '+268 7600 1234',
            is_verified: true
        },
        photos: [
            {
                id: 'photo-003-1',
                property_id: 'prop-003',
                photo_url: 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=800',
                caption: 'Townhouse exterior',
                display_order: 0,
                created_at: '2025-02-10T09:00:00Z'
            },
            {
                id: 'photo-003-2',
                property_id: 'prop-003',
                photo_url: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800',
                caption: 'Living room',
                display_order: 1,
                created_at: '2025-02-10T09:00:00Z'
            }
        ]
    },
    {
        id: 'prop-004',
        title: 'Budget-Friendly Backrooms - Nhlangano',
        description: 'Simple but comfortable backrooms with private entrance. Ideal for single person or student. Shared yard with main house.',
        property_type: 'backrooms',
        price: 1200,
        location_city: 'Nhlangano',
        location_suburb: 'Township',
        location_address: '78 Extension',
        latitude: -27.1167,
        longitude: 31.2000,
        bedrooms: 1,
        bathrooms: 1,
        is_furnished: false,
        amenities: ['Parking', 'Backup Water'],
        lease_terms: 'Month-to-month, electricity prepaid',
        status: 'rented',
        is_featured: false,
        views: 67,
        created_at: '2025-01-25T16:45:00Z',
        updated_at: '2025-02-28T11:20:00Z',
        contact_phone: '+268 7600 1234',
        contact_whatsapp: '+268 7600 1234',
        landlord: {
            full_name: 'James Dlamini',
            phone: '+268 7600 1234',
            is_verified: true
        },
        photos: [
            {
                id: 'photo-004-1',
                property_id: 'prop-004',
                photo_url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
                caption: 'Exterior view',
                display_order: 0,
                created_at: '2025-01-25T16:45:00Z'
            },
            {
                id: 'photo-004-2',
                property_id: 'prop-004',
                photo_url: 'https://images.unsplash.com/photo-1592595896551-12b371d546d5?w=800',
                caption: 'Interior',
                display_order: 1,
                created_at: '2025-01-25T16:45:00Z'
            }
        ]
    },
    {
        id: 'prop-005',
        title: 'Luxury 4-Bedroom with Pool - Ezulwini',
        description: 'Stunning luxury home in the valley. Features include swimming pool, staff quarters, and beautiful mountain views. Perfect for executive family.',
        property_type: 'house',
        price: 8500,
        location_city: 'Mbabane',
        location_suburb: 'Ezulwini',
        location_address: '56 Valley Road',
        latitude: -26.4167,
        longitude: 31.1500,
        bedrooms: 4,
        bathrooms: 3,
        is_furnished: true,
        amenities: ['Swimming Pool', 'Staff Quarters', '24hr Security', 'Garden', 'Solar Power', 'Backup Water', 'Electric Fence'],
        lease_terms: '24-month lease, references required',
        status: 'pending',
        is_featured: true,
        views: 312,
        created_at: '2025-03-01T13:30:00Z',
        updated_at: '2025-03-01T13:30:00Z',
        contact_phone: '+268 7600 1234',
        contact_whatsapp: '+268 7600 1234',
        landlord: {
            full_name: 'James Dlamini',
            phone: '+268 7600 1234',
            is_verified: true
        },
        photos: [
            {
                id: 'photo-005-1',
                property_id: 'prop-005',
                photo_url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
                caption: 'Pool and garden',
                display_order: 0,
                created_at: '2025-03-01T13:30:00Z'
            },
            {
                id: 'photo-005-2',
                property_id: 'prop-005',
                photo_url: 'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800',
                caption: 'Living room',
                display_order: 1,
                created_at: '2025-03-01T13:30:00Z'
            },
            {
                id: 'photo-005-3',
                property_id: 'prop-005',
                photo_url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
                caption: 'Master bedroom',
                display_order: 2,
                created_at: '2025-03-01T13:30:00Z'
            },
            {
                id: 'photo-005-4',
                property_id: 'prop-005',
                photo_url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800',
                caption: 'Modern kitchen',
                display_order: 3,
                created_at: '2025-03-01T13:30:00Z'
            }
        ]
    }
];

// Function to set the current user ID
export const setMockUserId = (userId: string) => {
    currentUserId = userId;
};

// Function to get properties with the current user's ID
export const getMockProperties = (): Property[] => {
    if (!currentUserId) {
        console.warn('Mock user ID not set. Call setMockUserId first.');
        return [];
    }

    return baseProperties.map(prop => ({
        ...prop,
        landlord_id: currentUserId
    })) as Property[];
};

// Helper function to get properties by landlord ID (now just filters the mock data)
export const getPropertiesByLandlordId = (landlordId: string): Property[] => {
    return getMockProperties().filter(prop => prop.landlord_id === landlordId);
};

// Helper function to get a property by ID
export const getPropertyById = (propertyId: string): Property | undefined => {
    return getMockProperties().find(prop => prop.id === propertyId);
};

// Helper function to get stats for a landlord
export const getLandlordStats = (landlordId: string) => {
    const landlordProps = getPropertiesByLandlordId(landlordId);

    return {
        total: landlordProps.length,
        active: landlordProps.filter(p => p.status === 'active').length,
        rented: landlordProps.filter(p => p.status === 'rented').length,
        totalViews: landlordProps.reduce((sum, p) => sum + (p.views || 0), 0),
    };
};