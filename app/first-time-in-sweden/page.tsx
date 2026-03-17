import type { Metadata } from 'next';
import FirstTimeInSwedenClient from './FirstTimeInSwedenClient';

export const metadata: Metadata = {
  title: 'First Time in Sweden',
  description: 'Essential guide for first-time visitors to Sweden.',
  openGraph: {
    title: 'First Time in Sweden | Nordic Getaways',
    description: 'Essential guide for first-time visitors to Sweden.',
  },
  keywords: ['Sweden travel guide', 'first time Sweden', 'Nordic travel tips'],
};

export default function FirstTimeInSwedenPage() {
  return <FirstTimeInSwedenClient />;
}
