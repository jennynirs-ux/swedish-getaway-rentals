import type { Metadata } from 'next';
import HostDashboardClient from './HostDashboardClient';

export const metadata: Metadata = {
  title: 'Host Dashboard',
  description: 'Manage your properties, bookings, and earnings.',
  robots: { index: false, follow: false },
};

export default function HostDashboardPage() {
  return <HostDashboardClient />;
}
