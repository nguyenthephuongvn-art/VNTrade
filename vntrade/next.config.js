/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cho phép fetch từ TCBS ở server-side (không bị CORS)
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=300" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
