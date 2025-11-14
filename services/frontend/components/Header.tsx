'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            flipflop.statex.cz
          </Link>

          <nav className="flex items-center gap-6">
            <Link href="/products" className="hover:text-blue-600">
              Produkty
            </Link>

            {isAuthenticated ? (
              <>
                <Link href="/cart" className="hover:text-blue-600">
                  Košík
                </Link>
                <Link href="/orders" className="hover:text-blue-600">
                  Objednávky
                </Link>
                <Link href="/profile" className="hover:text-blue-600">
                  {user?.firstName || 'Profil'}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-700"
                >
                  Odhlásit
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="hover:text-blue-600">
                  Přihlásit
                </Link>
                <Link
                  href="/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Registrovat
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

