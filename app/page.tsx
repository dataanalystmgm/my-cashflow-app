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

// Daftar Kategori sesuai permintaan
const CATEGORIES = {
  income: ['Gaji', 'Pemasukan Bisnis', 'Investasi', 'Lainnya'],
  expense: ['Makan', 'Belanja Bulanan', 'Bensin', 'Service', 'Tagihan', 'Hiburan', 'Lainnya']
};

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [form, setForm] = useState({ description: '', amount: '', type: 'income', category: '' });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 1. Proteksi Halaman (Cek Login)
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

  // 2. Ambil Data Real-time dari Firestore
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "transactions"), 
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Hitung Total Saldo saat ini
  const totalBalance = transactions.reduce((acc, curr) => 
    curr.type === 'income' ? acc + curr.amount : acc - curr.amount, 0
  );

  // 3. Fungsi Simpan Transaksi dengan Swal & Validasi Saldo
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputAmount = Number(form.amount);

    // Validasi Form Kosong
    if (!form.description || !form.amount || !form.category) {
      return Swal.fire({
        icon: 'error',
        title: 'Data Tidak Lengkap',
        text: 'Harap isi keterangan, nominal, dan kategori!',
        confirmButtonColor: '#3b82f6'
      });
    }

    // Validasi Saldo (Jika pengeluaran > saldo saat ini)
    if (form.type === 'expense' && inputAmount > totalBalance) {
      return Swal.fire({
        icon: 'warning',
        title: 'Saldo Tidak Cukup',
        text: `Saldo Anda (Rp ${totalBalance.toLocaleString()}) tidak mencukupi untuk pengeluaran ini.`,
        confirmButtonColor: '#ef4444'
      });
    }

    // Tampilkan Loading Swal
    Swal.fire({
      title: 'Sedang Menyimpan...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      await addDoc(collection(db, "transactions"), {
        description: form.description,
        amount: inputAmount,
        type: form.type,
        category: form.category,
        userId: user.uid,
        createdAt: serverTimestamp()
      });

      // Notifikasi Sukses
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Transaksi telah dicatat.',
        timer: 1500,
        showConfirmButton: false
      });

      // Reset Form
      setForm({ description: '', amount: '', type: 'income', category: '' });
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Terjadi kesalahan sistem.' });
    }
  };

  if (!user || loading) return <div className="flex h-screen items-center justify-center font-bold">Memuat Dashboard...</div>;

  return (
    <main className="max-w-md mx-auto min-h-screen p-4 pb-10 bg-gray-50">
      {/* Header */}
      <header className="flex justify-between items-center py-6">
        <div>
          <p className="text-sm text-gray-500 font-medium">Total Saldo Anda</p>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Rp {totalBalance.toLocaleString('id-ID')}
          </h1>
        </div>
        <button 
          onClick={() => signOut(auth)} 
          className="text-xs bg-red-50 text-red-500 px-4 py-2 rounded-full font-bold hover:bg-red-100 transition"
        >
          Keluar
        </button>
      </header>

      {/* Shortcut Navigasi */}
      <Link href="/report">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-5 rounded-3xl flex justify-between items-center mb-8 shadow-xl shadow-blue-100 hover:scale-[1.02] transition-transform cursor-pointer">
          <div>
            <p className="text-xs opacity-80">Analisis Keuangan</p>
            <p className="font-bold text-lg">Lihat Laporan Grafik</p>
          </div>
          <span className="text-2xl bg-white/20 p-2 rounded-full">📊</span>
        </div>
      </Link>

      {/* Form Input */}
      <Card className="mb-8 border-none shadow-md">
        <h2 className="font-bold mb-4 text-gray-800 flex items-center gap-2">
          <span>📝</span> Tambah Transaksi
        </h2>
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
            type="text" placeholder="Keterangan (misal: Makan Siang)"
            className="w-full bg-gray-50 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-100 transition"
            value={form.description}
            onChange={e => setForm({...form, description: e.target.value})}
          />

          <input 
            type="number" placeholder="Nominal Rp"
            className="w-full bg-gray-50 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-100 transition"
            value={form.amount}
            onChange={e => setForm({...form, amount: e.target.value})}
          />

          <select 
            className="w-full bg-gray-50 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-100 appearance-none"
            value={form.category}
            onChange={e => setForm({...form, category: e.target.value})}
          >
            <option value="">Pilih Kategori</option>
            {CATEGORIES[form.type as keyof typeof CATEGORIES].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <button className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold mt-2 hover:bg-black shadow-lg shadow-gray-200 transition-all active:scale-95">
            Simpan Sekarang
          </button>
        </form>
      </Card>

      {/* Riwayat Terbaru */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Riwayat Terbaru</h3>
        </div>
        
        {transactions.length === 0 && (
          <p className="text-center py-10 text-gray-400 text-sm italic">Belum ada transaksi hari ini.</p>
        )}

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
            <div className="text-right">
              <p className={`font-bold text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                {t.type === 'income' ? '+' : '-'} {t.amount.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}