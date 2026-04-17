/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.qbitai.com',
      },
      {
        protocol: 'http',
        hostname: 'www.qbitai.com',
      },
      {
        protocol: 'https',
        hostname: 'static001.infoq.cn',
      },
      {
        protocol: 'http',
        hostname: 'static001.infoq.cn',
      },
      {
        protocol: 'https',
        hostname: 'oscimg.oschina.net',
      },
      {
        protocol: 'http',
        hostname: 'oscimg.oschina.net',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

module.exports = nextConfig;
