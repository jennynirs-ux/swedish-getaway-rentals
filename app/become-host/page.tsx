import type { Metadata } from 'next';
import BecomeHostClient from './BecomeHostClient';

export const metadata: Metadata = {
  title: 'Become a Host',
  description: 'List your Nordic property and earn income as a vacation rental host.',
  openGraph: {
    title: 'Become a Host | Nordic Getaways',
    description: 'List your Nordic property and earn income as a vacation rental host.',
  },
  keywords: ['become host', 'list property', 'Nordic rental host'],
};

export default function BecomeHostPage() {
  return <BecomeHostClient />;
}
