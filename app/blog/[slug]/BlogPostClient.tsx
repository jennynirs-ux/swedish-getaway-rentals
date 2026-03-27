'use client';
import dynamic from 'next/dynamic';

const BlogPost = dynamic(() => import('@/pages/BlogPost'), { ssr: true, loading: () => <div className="min-h-screen animate-pulse bg-muted/20" /> });

export default function BlogPostClient() {
  return <BlogPost />;
}
