"use client"
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { 
  collection, addDoc, query, orderBy, onSnapshot, 
  serverTimestamp, where 
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/Card';
import Swal from 'sweetalert2';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]); // State kategori dinamis
  const [budgets, setBudgets] = useState<any[]>([]);       // State budget bulanan
  const [form, setForm] = useState({ description: '', amount: '', type: 'income', category: '' });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 1. Proteksi Halaman & Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // 2. Ambil Data Real-time (Transactions, Categories, Budgets)
  useEffect(() => {
    if (!user) return;

    const currentMonth = new Date().toISOString().slice(0, 7); // Format: "2026-03"

    // Query Transaksi
    const qTrans = query(
      collection(db, "transactions"), 
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    // Query Kategori Dinamis
    const qCat = query(
      collection(db, "categories"), 
      where("userId", "==", user.uid)
    );

    // Query Budget Bulan Ini
    const qBug = query(
      collection(db, "budgets"),
      where("userId", "==", user.uid),
      where("month", "==", currentMonth)
    );

    const unsubTrans = onSnapshot(qTrans, (s) => {
      setTransactions(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    const unsubCat = onSnapshot(qCat, (s) => {
      setCategories(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubBug = onSnapshot(qBug, (s) => {
      setBudgets(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubTrans();
      unsubCat();
      unsubBug();
    };
  }, [user]);

  // Hitung Total Saldo
  const totalBalance = transactions.reduce((acc, curr) => 
    curr.type === 'income' ? acc + curr.amount : acc - curr.amount, 0
  );

  // 3. Fungsi Simpan Transaksi dengan Validasi Budget
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputAmount = Number(form.amount);

    if (!form.description || !form.amount || !form.category) {
      return Swal.fire({ icon: 'error', title: 'Data Tidak Lengkap', text: 'Harap isi semua field!' });
    }

    if (form.type === 'expense') {
      // A. Validasi Saldo
      if (inputAmount > totalBalance) {
        return Swal.fire({
          icon: 'warning',
          title: 'Saldo Tidak Cukup',
          text: `Saldo Anda Rp ${totalBalance.toLocaleString()} tidak mencukupi.`,
        });
      }

      // B. Validasi Budget Kategori
      const categoryBudget = budgets.find(b => b.categoryName === form.category);
      if (categoryBudget) {
        const currentSpent = transactions
          .filter(t => t.type === 'expense' && t.category === form.category)
          .reduce((sum, t) => sum + t.amount, 0);

        if (currentSpent + inputAmount > categoryBudget.amount) {
          const confirm = await Swal.fire({
            icon: 'warning',
            title: 'Melebihi Budget!',
            text: `Pengeluaran ini akan melampaui budget bulanan untuk ${form.category}. Tetap simpan?`,
            showCancelButton: true,
            confirmButtonText: 'Ya, Tetap Simpan',
            cancelButtonText: 'Batal'
          });
          if (!confirm.isConfirmed) return;
        }
      }
    }

    Swal.fire({ title: 'Menyimpan...', didOpen: () => { Swal.showLoading(); } });

    try {
      await addDoc(collection(db, "transactions"), {
        description: form.description,
        amount: inputAmount,
        type: form.type,
        category: form.category,
        userId: user.uid,
        createdAt: serverTimestamp(),
        month: new Date().toISOString().slice(0, 7) // Untuk filter laporan bulan
      });

      Swal.fire({ icon: 'success', title: 'Berhasil!', timer: 1500, showConfirmButton: false });
      setForm({ description: '', amount: '', type: 'income', category: '' });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Kesalahan sistem.' });
    }
  };

  if (!user || loading) return <div className="flex h-screen items-center justify-center font-bold">Memuat Dashboard...</div>;

  return (
    <main className="max-w-md mx-auto min-h-screen p-4 pb-10 bg-gray-50">
      <header className="flex justify-between items-center py-6">
        <div>
          <p className="text-sm text-gray-500 font-medium">Total Saldo Anda</p>
          <h1 className="text-3xl font-extrabold text-gray-900">Rp {totalBalance.toLocaleString('id-ID')}</h1>
        </div>
        <button onClick={() => signOut(auth)} className="text-xs bg-red-50 text-red-500 px-4 py-2 rounded-full font-bold">Keluar</button>
      </header>

      <Link href="/report">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-5 rounded-3xl flex justify-between items-center mb-8 shadow-xl shadow-blue-100 cursor-pointer">
          <div>
            <p className="text-xs opacity-80">Analisis Keuangan</p>
            <p className="font-bold text-lg">Lihat Laporan & Budget</p>
          </div>
          <span className="text-2xl bg-white/20 p-2 rounded-full">📊</span>
        </div>
      </Link>

      <Card className="mb-8 border-none shadow-md">
        <h2 className="font-bold mb-4 text-gray-800 flex items-center gap-2"><span>📝</span> Tambah Transaksi</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="flex bg-gray-100 p-1.5 rounded-2xl">
            {['income', 'expense'].map((t) => (
              <button
                key={t} type="button"
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${form.type === t ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
                onClick={() => setForm({...form, type: t, category: ''})}
              >
                {t === 'income' ? 'Pemasukan' : 'Pengeluaran'}
              </button>
            ))}
          </div>

          <input 
            type="text" placeholder="Keterangan"
            className="w-full bg-gray-50 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            value={form.description}
            onChange={e => setForm({...form, description: e.target.value})}
          />

          <input 
            type="number" placeholder="Nominal Rp"
            className="w-full bg-gray-50 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            value={form.amount}
            onChange={e => setForm({...form, amount: e.target.value})}
          />

          {/* Dropdown Dinamis */}
          <select 
            className="w-full bg-gray-50 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-100 appearance-none"
            value={form.category}
            onChange={e => setForm({...form, category: e.target.value})}
          >
            <option value="">Pilih Kategori</option>
            {categories
              .filter(c => c.type === form.type)
              .map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))
            }
          </select>

          <button className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold mt-2 hover:bg-black shadow-lg shadow-gray-200 active:scale-95 transition-all">
            Simpan Sekarang
          </button>
        </form>
      </Card>

      <section className="space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Riwayat Terbaru</h3>
        {transactions.slice(0, 5).map((t) => (
          <div key={t.id} className="flex justify-between items-center bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 flex items-center justify-center rounded-2xl font-bold ${t.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {t.type === 'income' ? '↓' : '↑'}
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm">{t.description}</p>
                <p className="text-[10px] text-gray-400 uppercase font-extrabold tracking-tighter">{t.category}</p>
              </div>
            </div>
            <p className={`font-bold text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
              {t.type === 'income' ? '+' : '-'} {t.amount.toLocaleString()}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}