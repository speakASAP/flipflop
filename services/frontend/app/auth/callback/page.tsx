'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { catalogApi } from '@/lib/api/catalog';
import { consumeExpectedAuthState, consumeStoredNextPath, isTrustedServerInitiatedState } from '@/lib/auth/hosted-auth';

function hashParams(hash: string): URLSearchParams {
  return new URLSearchParams(hash.replace(/^#/, ''));
}

function tokenFromParams(params: URLSearchParams): string | null {
  return params.get('access_token') || params.get('token');
}

function safeNextPath(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/orders';
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const fallbackNextPath = useMemo(() => safeNextPath(searchParams.get('next')), [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function finishAuth() {
      const params = hashParams(window.location.hash);
      const token = tokenFromParams(params);
      const returnedState = params.get('state');
      const expectedState = consumeExpectedAuthState();
      window.history.replaceState(null, '', window.location.pathname + window.location.search);

      if (!token) {
        setError('Aktivační odkaz neobsahuje přihlašovací token.');
        return;
      }

      if (expectedState && returnedState !== expectedState) {
        setError('Ověření přihlášení se nezdařilo. Zkuste to prosím znovu.');
        return;
      }

      if (!expectedState && returnedState && !isTrustedServerInitiatedState(returnedState)) {
        setError('Ověření přihlášení se nezdařilo. Zkuste to prosím znovu.');
        return;
      }

      const nextPath = consumeStoredNextPath(fallbackNextPath);
      apiClient.setToken(token);

      try {
        const response = await catalogApi.provisionAccess();
        if (!response.success) {
          console.warn('Catalog access provisioning failed:', response.error?.message || 'unknown error');
        }
      } catch (provisionError) {
        console.warn('Catalog access provisioning failed:', provisionError);
      }

      if (!cancelled) {
        router.replace(nextPath);
      }
    }

    void finishAuth();

    return () => {
      cancelled = true;
    };
  }, [fallbackNextPath, router]);

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
