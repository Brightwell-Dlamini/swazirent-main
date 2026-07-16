import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {

    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'https://pqnrogilspjhoaafezan.supabase.co',
        port: '',
        pathname: '/**',
      },
 {
        protocol: 'https',
        hostname: 'xrinszwnxjbsgkhdbqix.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],

  },

};

export default nextConfig;
