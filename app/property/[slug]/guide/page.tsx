import type { Metadata } from 'next';
import GuideClient from './GuideClient';

export const metadata: Metadata = {
  title: 'Property Guide',
  description: 'Everything you need to know about your stay.',
};

export default function GuidePage() {
  return <GuideClient />;
}
