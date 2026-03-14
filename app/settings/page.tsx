"use client"
import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CategoryManager from '@/components/CategoryManager';
import BudgetManager from '@/components/BudgetManager';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center font-bold">
      Memuat Pengaturan...
    </div>
  );

  return (
    <main className="max-w-md mx-auto min-h-screen p-4 pb-20 bg-gray-50">
      {/* Header Navigasi */}
      <div className="flex items-center gap-4 py-6">
        <Link 
          href="/" 
          className="bg-white p-2 rounded-full shadow-sm hover:bg-gray-100 transition"
        >
          ←
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pengaturan Data</h1>
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">
            Kategori & Budgeting
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Bagian 1: Pengelolaan Kategori */}
        <section>
          <CategoryManager />
        </section>

        {/* Bagian 2: Pengelolaan Budget */}
        <section>
          <BudgetManager />
        </section>
      </div>

      {/* Footer info */}
      <p className="text-center text-[10px] text-gray-300 mt-10">
        Semua perubahan akan disimpan secara otomatis ke cloud.
      </p>
    </main>
  );
}