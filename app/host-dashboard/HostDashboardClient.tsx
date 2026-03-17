'use client';
import dynamic from 'next/dynamic';

const HostDashboard = dynamic(() => import('@/components/host/HostDashboard'), { ssr: false });

export default function HostDashboardClient() {
  return <HostDashboard />;
}
