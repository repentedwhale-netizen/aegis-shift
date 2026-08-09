/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@aegis-shift/shared'],
  experimental: {},
  images: {
    domains: ['ipfs.io', 'cloudflare-ipfs.com'],
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
};

module.exports = nextConfig;
