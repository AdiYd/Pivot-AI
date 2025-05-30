/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
