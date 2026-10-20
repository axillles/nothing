import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Pin the workspace root to this project so stray lockfiles in parent
  // directories (e.g. ~/package-lock.json) are not picked up.
  outputFileTracingRoot: __dirname,
}

export default nextConfig
