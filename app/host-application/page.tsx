import type { Metadata } from 'next';
import HostApplicationClient from './HostApplicationClient';

export const metadata: Metadata = {
  title: 'Host Application',
  description: 'Apply to become a host and share your Nordic property.',
};

export default function HostApplicationPage() {
  return <HostApplicationClient />;
}
