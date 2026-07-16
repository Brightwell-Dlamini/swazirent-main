// src/app/properties/[id]/mockData.ts

import { Property } from "./types";

export const mockProperties: Record<string, Property> = {
    '1': {
        id: '1',
        title: 'Modern 2-Bedroom Apartment',
        description: 'Beautiful modern apartment in a quiet neighborhood. Features include spacious living area, fully fitted kitchen, and secure parking. Close to shopping centers and schools. This apartment is perfect for young professionals or small families looking for comfort and convenience.',
        price: 3500,
        location: {
            address: '123 Main Street',
            suburb: 'Ngwane Park',
            city: 'Manzini',
            coordinates: { lat: -26.4988, lng: 31.3809 }
        },
        bedrooms: 2,
        bathrooms: 1,
        size: 85,
        yearBuilt: 2020,
        status: 'available',
        isVerified: true,
        views: 245,
        landlord: {
            id: 'landlord-1',
            name: 'John Dlamini',
            phone: '+268 7600 0000',
            email: 'john.dlamini@email.com',
            responseTime: 'Usually responds within 1 hour',
            joinedDate: 'Jan 2023',
            isVerified: true,
            properties: 3,
        },
        features: [
            'Secure Parking',
            '24/7 Security',
            'Backup Water',
            'Built-in Wardrobes',
            'Fitted Kitchen',
            'Near Public Transport',
            'Tiled Floors',
            'Prepaid Electricity',
        ],
        amenities: {
            water: true,
            electricity: true,
            wifi: 'Available at extra cost',
            parking: 'Secure parking included',
            security: '24/7 guard',
        },
        photos: [
            'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop', // Modern apartment building
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop', // Modern living room
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop', // Modern bedroom
            'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=800&auto=format&fit=crop', // Modern kitchen
        ],
        nearby: [
            { type: 'Shopping Mall', name: 'The Gables', distance: '2.5 km', icon: '🛍️' },
            { type: 'School', name: 'Ngwane Park High', distance: '0.8 km', icon: '🏫' },
            { type: 'Hospital', name: 'Raleigh Fitkin', distance: '3.2 km', icon: '🏥' },
            { type: 'Bus Stop', name: 'Ngwane Park Taxi Rank', distance: '0.5 km', icon: '🚌' },
            { type: 'Supermarket', name: 'Shoprite', distance: '1.2 km', icon: '🛒' },
            { type: 'Park', name: 'Ngwane Park Recreation', distance: '1.5 km', icon: '🌳' },
        ],
        similarProperties: [
            {
                id: '2',
                title: 'Cozy 1-Bedroom Apartment',
                price: 2800,
                location: 'Ngwane Park',
                image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&auto=format&fit=crop',
                bedrooms: 1,
                bathrooms: 1,
            },
            {
                id: '3',
                title: 'Spacious 3-Bedroom House',
                price: 4800,
                location: 'Mbabane West',
                image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&auto=format&fit=crop',
                bedrooms: 3,
                bathrooms: 2,
            },
        ],
    },
    '2': {
        id: '2',
        title: 'Spacious Family Home',
        description: 'Large family home with garden and secure parking. Perfect for families looking for space and comfort. Features include 3 bedrooms with built-in wardrobes, 2 bathrooms, spacious living areas, and a modern kitchen. The property has a large garden perfect for children and outdoor entertaining.',
        price: 4500,
        location: {
            address: '45 Hillside Road',
            suburb: 'Mbabane West',
            city: 'Mbabane',
            coordinates: { lat: -26.3167, lng: 31.1333 }
        },
        bedrooms: 3,
        bathrooms: 2,
        size: 180,
        yearBuilt: 2018,
        status: 'available',
        isVerified: true,
        views: 189,
        landlord: {
            id: 'landlord-2',
            name: 'Sarah Nkosi',
            phone: '+268 7611 2233',
            email: 'sarah.nkosi@email.com',
            responseTime: 'Usually responds within 2 hours',
            joinedDate: 'Mar 2023',
            isVerified: true,
            properties: 5,
        },
        features: [
            'Large Garden',
            'Double Garage',
            'Staff Quarters',
            'Swimming Pool',
            'Built-in Braai',
            'Solar Geyser',
            'Borehole',
            'Electric Fence',
        ],
        amenities: {
            water: 'Borehole + Municipal',
            electricity: true,
            wifi: 'Fiber ready',
            parking: 'Double garage + 2 open bays',
            security: 'Electric fence + armed response',
        },
        photos: [
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop', // Modern house exterior
            'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&auto=format&fit=crop', // Living room
            'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&auto=format&fit=crop', // Bedroom
            'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&auto=format&fit=crop', // Garden and pool
        ],
        nearby: [
            { type: 'School', name: 'Mbabane International', distance: '1.2 km', icon: '🏫' },
            { type: 'Shopping', name: 'Mall of Mbabane', distance: '2.8 km', icon: '🛍️' },
            { type: 'Hospital', name: 'Mbabane Government', distance: '3.5 km', icon: '🏥' },
            { type: 'Restaurant', name: 'The Mountain Inn', distance: '1.8 km', icon: '🍽️' },
        ],
        similarProperties: [
            {
                id: '1',
                title: 'Modern 2-Bedroom Apartment',
                price: 3500,
                location: 'Ngwane Park',
                image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&auto=format&fit=crop',
                bedrooms: 2,
                bathrooms: 1,
            },
            {
                id: '4',
                title: 'Executive 4-Bedroom Villa',
                price: 6500,
                location: 'Mbabane West',
                image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&auto=format&fit=crop',
                bedrooms: 4,
                bathrooms: 3,
            },
        ],
    },
    '3': {
        id: '3',
        title: 'Secure Backrooms',
        description: 'Modern backrooms perfect for single person or couple. Private entrance and secure parking. Recently renovated with modern finishes. Ideal for someone working in Matsapha industrial area.',
        price: 1800,
        location: {
            address: '78 Industrial Road',
            suburb: 'Matsapha Industrial',
            city: 'Manzini',
            coordinates: { lat: -26.5248, lng: 31.3079 }
        },
        bedrooms: 1,
        bathrooms: 1,
        size: 45,
        yearBuilt: 2021,
        status: 'available',
        isVerified: true,
        views: 312,
        landlord: {
            id: 'landlord-3',
            name: 'Thabo Mamba',
            phone: '+268 7622 3344',
            email: 'thabo.mamba@email.com',
            responseTime: 'Usually responds within 30 minutes',
            joinedDate: 'Jun 2023',
            isVerified: true,
            properties: 2,
        },
        features: [
            'Private Entrance',
            'Secure Parking',
            'Prepaid Electricity',
            'Kitchenette',
            'Bathroom with Shower',
            'Built-in Cupboards',
            'TV Point',
            'Small Garden Area',
        ],
        amenities: {
            water: true,
            electricity: true,
            wifi: 'Not included',
            parking: 'One secure bay',
            security: 'Gated community with guard',
        },
        photos: [
            'https://images.unsplash.com/photo-1626178793928-6abea5aa1f18?w=800&auto=format&fit=crop', // Modern backrooms/studio
            'https://images.unsplash.com/photo-1630699046098-7a9a249d46c7?w=800&auto=format&fit=crop', // Small studio interior
            'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop', // Modern bedroom
            'https://images.unsplash.com/photo-1598928636135-d146006ff4be?w=800&auto=format&fit=crop', // Kitchenette
        ],
        nearby: [
            { type: 'Bus Stop', name: 'Matsapha Taxi Rank', distance: '0.3 km', icon: '🚌' },
            { type: 'Shop', name: 'Matsapha Shopping Centre', distance: '0.8 km', icon: '🛒' },
            { type: 'Factory', name: 'Industrial Zone', distance: '1.0 km', icon: '🏭' },
            { type: 'Restaurant', name: 'Matsapha Fast Foods', distance: '0.5 km', icon: '🍔' },
        ],
        similarProperties: [
            {
                id: '4',
                title: 'Studio Backrooms',
                price: 1500,
                location: 'Matsapha',
                image: 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=400&auto=format&fit=crop',
                bedrooms: 1,
                bathrooms: 1,
            },
        ],
    },
};