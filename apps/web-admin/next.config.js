const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
    images: {
    domains: [
      'lh3.googleusercontent.com', // Google profile images
      'avatars.githubusercontent.com', // GitHub profile images (if needed)
      'googleusercontent.com', // General Google images
    ],
  },

  webpack: (config) => {
    // Simple fix for the undici private class fields issue
    config.resolve.alias = {
      ...config.resolve.alias,
      undici: false,
    };
    
    // Basic Node.js module fallbacks
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    return config;
  },
};


module.exports = nextConfig;
