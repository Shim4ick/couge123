/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  
  cacheComponents: true,
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
