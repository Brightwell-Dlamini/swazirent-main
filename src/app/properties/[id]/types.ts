// src/app/properties/[id]/types.ts

export interface Landlord {
    id: string;
    name: string;
    phone: string;
    email: string;
    responseTime: string;
    joinedDate: string;
    isVerified: boolean;
    properties: number;
}

export interface Location {
    address: string;
    suburb: string;
    city: string;
    coordinates: {
        lat: number;
        lng: number;
    };
}

export interface NearbyPlace {
    type: string;
    name: string;
    distance: string;
    icon: string;
}

export interface Amenities {
    water: boolean | string;
    electricity: boolean | string;
    wifi: boolean | string;
    parking: boolean | string;
    security: boolean | string;
}

export interface SimilarProperty {
    id: string;
    title: string;
    price: number;
    location: string;
    image: string;
    bedrooms: number;
    bathrooms: number;
}

export interface Property {
    id: string;
    title: string;
    description: string;
    price: number;
    location: Location;
    bedrooms: number;
    bathrooms: number;
    size: number;
    yearBuilt: number;
    status: 'available' | 'rented' | 'pending';
    isVerified: boolean;
    views: number;
    landlord: Landlord;
    features: string[];
    amenities: Amenities;
    photos: string[];
    nearby: NearbyPlace[];
    similarProperties: SimilarProperty[];
    inquiries?: Inquiry[];
}
export interface PropertyPhoto {
    id: string;
    photo_url: string;
    is_primary: boolean;
}

export interface Inquiry {
    id: string;
    property_id: string;
    name: string;
    email: string;
    phone?: string;
    message: string;
    status: 'new' | 'read' | 'replied';
    created_at: string;
}