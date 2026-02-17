'use client';

import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const navigation = [
    { name: 'Inbox', href: '/dashboard/inbox', icon: '📥' },
    { name: 'Cases', href: '/dashboard/cases', icon: '📋' },
    { name: 'Products', href: '/dashboard/products', icon: '🏷️' },
    { name: 'Analytics', href: '/dashboard/analytics', icon: '📊' },
    { name: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile header with hamburger */}
      <div className="fixed left-0 right-0 top-0 z-30 flex items-center justify-between border-b bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="text-2xl">💬</div>
          <div className="font-bold text-gray-900">WhatsApp Bot</div>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
          aria-label="Toggle navigation menu"
          aria-expanded={sidebarOpen}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <Sidebar
        navigation={navigation}
        user={user}
        onLogout={logout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex-1 overflow-auto pt-14 lg:pt-0">
        {children}
      </div>
    </div>
  );
}
