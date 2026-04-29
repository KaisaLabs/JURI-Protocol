/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    ZG_RPC_URL: process.env.ZG_RPC_URL,
    CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
  },
};

module.exports = nextConfig;
