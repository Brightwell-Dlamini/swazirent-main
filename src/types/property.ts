// src/types/property.ts
export type PropertyType = 'house' | 'flat/apartment' | 'shared' | 'backrooms' | 'other';

export type PropertyStatus = 'active' | 'pending' | 'rejected' | 'rented' | 'reported';

export interface Property {
    id: string
    landlord_id: string
    title: string
    description: string
    property_type: PropertyType
    price: number
    location_city: string
    location_suburb: string
    location_address?: string
    latitude?: number
    longitude?: number
    bedrooms?: number
    bathrooms?: number
    is_furnished: boolean
    amenities: string[]
    lease_terms?: string
    status: PropertyStatus
    is_featured: boolean
    views: number
    created_at: string
    updated_at: string
    contact_phone: string
    contact_whatsapp?: string
    country?: string
    landlord?: {
        full_name: string
        phone: string
        is_verified: boolean
        email?: string
    }
    photos?: PropertyPhoto[]
}

export interface PropertyPhoto {
    id: string
    property_id: string
    photo_url: string
    caption?: string
    display_order: number
    created_at: string
}

export interface PropertyFilters {
    city?: string
    minPrice?: number
    maxPrice?: number
    bedrooms?: number
    propertyType?: PropertyType[]
    amenities?: string[]
    furnished?: boolean
    keyword?: string
}

// Extended types for property detail page
export interface ExtendedProperty extends Property {
    landlord: {
        full_name: string
        phone: string
        is_verified: boolean
        email?: string
    }
    photos: PropertyPhoto[]
}

export interface PropertyCardProps {
    property: Property
    viewMode?: 'grid' | 'list'
    onSave?: (id: string) => void
    isSaved?: boolean
    onViewDetails?: (id: string) => void
}

// Property detail page types
export interface NearbyPlace {
    type: string
    name: string
    distance: string
    icon: string
}

export interface SimilarProperty {
    id: string
    title: string
    price: number
    location: string
    image: string
    bedrooms: number
    bathrooms: number
}

export interface Inquiry {
    id: string
    property_id: string
    name: string
    email: string
    phone?: string
    message: string
    status: 'new' | 'read' | 'replied'
    created_at: string
}
