/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Necesario para que @google-cloud/bigquery funcione en el server de Next
  experimental: {
    serverComponentsExternalPackages: ["@google-cloud/bigquery", "googleapis"],
  },
};

module.exports = nextConfig;
