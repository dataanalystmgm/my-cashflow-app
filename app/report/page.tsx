"use client"
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Card from '@/components/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import Link from 'next/link';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    // Mengambil data dengan urutan waktu terbaru di atas
    const q = query(
      collection(db, "transactions"), 
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (s) => setData(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  const expenseData = data
    .filter(t => t.type === 'expense')
    .reduce((acc: any, curr) => {
      const existing = acc.find((item: any) => item.name === curr.category);
      if (existing) { existing.value += curr.amount; }
      else { acc.push({ name: curr.category, value: curr.amount }); }
      return acc;
    }, []);

  const totalIn = data.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
  const totalOut = data.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);

  return (
    <main className="max-w-2xl mx-auto p-4 space-y-6 min-h-screen bg-gray-50 pb-20">
      <div className="flex items-center gap-4">
        <Link href="/" className="bg-white p-2 rounded-full shadow-sm hover:bg-gray-100 transition">←</Link>
        <h1 className="text-xl font-bold">Laporan Keuangan</h1>
      </div>

      {/* Ringkasan Saldo */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <Card className="border-t-4 border-green-500">
          <p className="text-[10px] uppercase text-gray-400 font-bold">Total Masuk</p>
          <p className="text-green-600 font-bold text-lg">Rp{totalIn.toLocaleString()}</p>
        </Card>
        <Card className="border-t-4 border-red-500">
          <p className="text-[10px] uppercase text-gray-400 font-bold">Total Keluar</p>
          <p className="text-red-600 font-bold text-lg">Rp{totalOut.toLocaleString()}</p>
        </Card>
      </div>

      {/* Grafik Pie */}
      <Card>
        <h3 className="font-bold text-gray-700 mb-4 text-center">Analisis Pengeluaran</h3>
        {expenseData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={expenseData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {expenseData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value: any) => `Rp ${Number(value).toLocaleString('id-ID')}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-gray-400 py-10">Belum ada data pengeluaran</p>
        )}
      </Card>

      {/* TABEL RINCIAN TRANSAKSI */}
      <Card className="overflow-hidden p-0">
        <div className="p-4 border-b bg-gray-50/50">
          <h3 className="font-bold text-gray-700">Daftar Transaksi Lengkap</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[11px] uppercase text-gray-400 bg-gray-50">
                <th className="p-4 font-bold">Waktu</th>
                <th className="p-4 font-bold">Keterangan</th>
                <th className="p-4 font-bold">Kategori</th>
                <th className="p-4 font-bold text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {data.length > 0 ? (
                data.map((t) => (
                  <tr key={t.id} className="border-t hover:bg-gray-50 transition">
                    <td className="p-4 text-gray-500 whitespace-nowrap">
                      {t.createdAt?.toDate().toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="p-4 font-medium text-gray-700">{t.description}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-gray-100 rounded-md text-[10px] font-bold text-gray-500 uppercase">
                        {t.category}
                      </span>
                    </td>
                    <td className={`p-4 text-right font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'income' ? '+' : '-'} {t.amount.toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-gray-400">Tidak ada data transaksi</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}