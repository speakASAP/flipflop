'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';

function tokenFromHash(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return params.get('access_token') || params.get('token');
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const nextPath = useMemo(() => {
    const next = searchParams.get('next') || '/orders';
    return next.startsWith('/') ? next : '/orders';
  }, [searchParams]);

  useEffect(() => {
    const token = tokenFromHash(window.location.hash);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    if (!token) {
      setError('Aktivační odkaz neobsahuje přihlašovací token.');
      return;
    }
    apiClient.setToken(token);
    router.replace(nextPath);
  }, [nextPath, router]);

  return (
    <main className="min-h-screen bg-white px-6 py-16 text-neutral-950">
      <div className="mx-auto max-w-xl">
        <h1 className="text-3xl font-black">Dokončujeme přihlášení</h1>
        {error ? (
          <div className="mt-6 border border-red-500 bg-red-50 p-5 font-semibold text-red-700">
            <p>{error}</p>
            <Link href="/login" className="mt-4 inline-block underline">Přejít na přihlášení</Link>
          </div>
        ) : (
          <p className="mt-4 font-semibold text-neutral-600">Chvilku strpení, bezpečně vás přesměrujeme do účtu.</p>
        )}
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white px-6 py-16 text-neutral-950">Dokončujeme přihlášení...</main>}>
      <AuthCallbackContent />
    </Suspense>
  );
}
