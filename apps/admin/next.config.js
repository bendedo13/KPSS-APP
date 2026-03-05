/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    // NEXT_PUBLIC_* are exposed to browser — no secrets here
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};
module.exports = nextConfig;
