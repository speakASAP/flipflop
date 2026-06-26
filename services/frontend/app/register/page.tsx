'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getRedirectPathFromLocation, redirectToHostedAuth } from '@/lib/auth/hosted-auth';

export default function RegisterPage() {
  const [redirectPath, setRedirectPath] = useState('/');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRedirectPath(getRedirectPathFromLocation());
  }, []);

  const startRegistration = () => {
    setLoading(true);
    redirectToHostedAuth('register', redirectPath);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4">
      <div className="bg-white p-8 md:p-10 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Registrace
          </h1>
          <p className="text-gray-600">Účet vytvoříte bezpečně ve společném Alfares Auth.</p>
        </div>

        <button
          type="button"
          onClick={startRegistration}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Přesměrování...' : 'Registrovat přes Alfares Auth'}
        </button>

        <p className="mt-6 text-center text-gray-600">
          Již máte účet?{' '}
          <Link href={`/login?redirect=${encodeURIComponent(redirectPath)}`} className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
            Přihlásit se
          </Link>
        </p>
      </div>
    </div>
  );
}
