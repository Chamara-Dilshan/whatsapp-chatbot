'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-4xl">💬</div>
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          WhatsApp Bot Dashboard
        </h1>
        <p className="mb-8 text-gray-600">
          Loading...
        </p>
      </div>
    </div>
  );
}
