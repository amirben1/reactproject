/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/recordings/:path*',
        destination: 'http://localhost:8000/recordings/:path*',
      },
    ]
  },
}

export default nextConfig
