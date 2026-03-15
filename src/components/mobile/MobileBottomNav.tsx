'use client';

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Heart, CalendarDays, MessageCircle, User } from 'lucide-react';

const navItems = [
  { icon: Search, label: 'Explore', path: '/' },
  { icon: Heart, label: 'Wishlists', path: '/profile?tab=favorites' },
  { icon: CalendarDays, label: 'Trips', path: '/profile?tab=bookings' },
  { icon: MessageCircle, label: 'Messages', path: '/profile?tab=messages' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Don't show on admin or host dashboard
  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/host-dashboard')) {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path.split('?')[0]);
          return (
            <button
              key={label}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
