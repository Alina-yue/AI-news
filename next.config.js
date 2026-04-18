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
        hostname: 'i.qbitai.com',
      },
      {
        protocol: 'http',
        hostname: 'i.qbitai.com',
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
      {
        protocol: 'https',
        hostname: 'mp.toutiao.com',
      },
      {
        protocol: 'http',
        hostname: 'mp.toutiao.com',
      },
      {
        protocol: 'https',
        hostname: 'img1.sinaimg.cn',
      },
      {
        protocol: 'http',
        hostname: 'img1.sinaimg.cn',
      },
      {
        protocol: 'https',
        hostname: 'p3.pstatp.com',
      },
      {
        protocol: 'http',
        hostname: 'p3.pstatp.com',
      },
    ],
  },
};

module.exports = nextConfig;
