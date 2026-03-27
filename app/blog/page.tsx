import type { Metadata } from 'next';
import BlogClient from './BlogClient';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Travel tips, Nordic guides, and stories from our vacation rental properties across Scandinavia.',
  openGraph: {
    title: 'Blog | Nordic Getaways',
    description: 'Travel tips, Nordic guides, and stories from our vacation rental properties.',
  },
};

export default function BlogPage() {
  return <BlogClient />;
}
