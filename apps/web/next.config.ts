/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  // In dev, proxy /api/* to the server
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      const serverPort = process.env.C2M_SERVER_PORT ?? '7456';
      return [
        { source: '/api/:path*', destination: `http://localhost:${serverPort}/api/:path*` },
      ];
    }
    return [];
  },
};

export default nextConfig;
