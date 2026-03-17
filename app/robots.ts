import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/profile', '/host-dashboard', '/api/'],
      },
    ],
    sitemap: 'https://nordic-getaways.com/sitemap.xml',
  };
}
