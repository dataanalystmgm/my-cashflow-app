"use client"
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Card from '@/components/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import Link from 'next/link';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function ReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]); // State untuk budget
  const [user, setUser] = useState<any>(null);

  const currentMonth = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // 1. Ambil Transaksi
    const qTrans = query(
      collection(db, "transactions"), 
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    
    // 2. Ambil Budget Bulan Ini
    const qBug = query(
      collection(db, "budgets"),
      where("userId", "==", user.uid),
      where("month", "==", currentMonth)
    );

    const unsubTrans = onSnapshot(qTrans, (s) => setData(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubBug = onSnapshot(qBug, (s) => setBudgets(s.docs.map(d => d.data())));

    return () => { unsubTrans(); unsubBug(); };
  }, [user]);

  // Logika Pengeluaran per Kategori untuk Pie Chart
  const expenseData = data
    .filter(t => t.type === 'expense')
    .reduce((acc: any, curr) => {
      const existing = acc.find((item: any) => item.name === curr.category);
      if (existing) { existing.value += curr.amount; }
      else { acc.push({ name: curr.category, value: curr.amount }); }
      return acc;
    }, []);

  // Logika Analisis Budget
  const budgetAnalysis = budgets.map(b => {
    const actual = data
      .filter(t => t.category === b.categoryName && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { ...b, actual, percent: (actual / b.amount) * 100 };
  });

  const totalIn = data.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
  const totalOut = data.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);

  return (
    <main className="max-w-2xl mx-auto p-4 space-y-6 min-h-screen bg-gray-50 pb-20">
      {/* HEADER DENGAN TOMBOL SETTINGS */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="bg-white p-2 rounded-full shadow-sm hover:bg-gray-100 transition">←</Link>
          <h1 className="text-xl font-bold text-gray-900">Laporan Keuangan</h1>
        </div>
        <Link 
          href="/settings" 
          className="bg-blue-600 text-white text-[10px] px-4 py-2 rounded-xl font-bold uppercase tracking-wider hover:bg-blue-700 transition shadow-md shadow-blue-100"
        >
          ⚙️ Atur Budget
        </Link>
      </div>

      {/* Ringkasan Saldo */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <Card className="border-t-4 border-green-500 p-4">
          <p className="text-[10px] uppercase text-gray-400 font-bold">Total Masuk</p>
          <p className="text-green-600 font-bold text-lg">Rp{totalIn.toLocaleString()}</p>
        </Card>
        <Card className="border-t-4 border-red-500 p-4">
          <p className="text-[10px] uppercase text-gray-400 font-bold">Total Keluar</p>
          <p className="text-red-600 font-bold text-lg">Rp{totalOut.toLocaleString()}</p>
        </Card>
      </div>

      {/* SEKSI BUDGET */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-700">📊 Pantauan Budget</h3>
          <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-bold">{currentMonth}</span>
        </div>
        <div className="space-y-4">
          {budgetAnalysis.length > 0 ? budgetAnalysis.map((item, i) => (
            <div key={i}>
              <div className="flex justify-between text-[11px] mb-1 font-bold">
                <span className="text-gray-600 uppercase tracking-tight">{item.categoryName}</span>
                <span className={item.actual > item.amount ? "text-red-500" : "text-gray-400"}>
                  {Math.round(item.percent)}% Used
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-700 ${item.actual > item.amount ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(item.percent, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] mt-1 text-gray-400 font-medium italic">
                <span>Real: Rp{item.actual.toLocaleString()}</span>
                <span>Limit: Rp{item.amount.toLocaleString()}</span>
              </div>
            </div>
          )) : (
            <div className="text-center py-4">
              <p className="text-gray-400 text-sm italic mb-2">Belum ada budget yang diatur bulan ini.</p>
              <Link href="/settings" className="text-blue-500 text-[10px] font-bold uppercase underline">Klik untuk mengatur</Link>
            </div>
          )}
        </div>
      </Card>

      {/* Grafik Pie Fleksibel */}
      <Card className="flex flex-col">
        <h3 className="font-bold text-gray-700 mb-4 text-center">Proporsi Pengeluaran</h3>
        {expenseData.length > 0 ? (
          <div className="space-y-4">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expenseData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" cx="50%" cy="50%">
                    {expenseData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: any) => `Rp ${Number(value).toLocaleString('id-ID')}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {expenseData.map((entry: any, index: number) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold text-gray-600 truncate uppercase tracking-tighter">{entry.name}</p>
                    <p className="text-[10px] text-blue-600 font-medium">Rp{entry.value.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-400 py-10">Belum ada data pengeluaran</p>
        )}
      </Card>

      {/* Tabel Transaksi */}
      <Card className="overflow-hidden p-0">
        <div className="p-4 border-b bg-gray-50/50">
          <h3 className="font-bold text-gray-700">Rincian Transaksi</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[11px] uppercase text-gray-400 bg-gray-50">
                <th className="p-4 font-bold">Waktu</th>
                <th className="p-4 font-bold">Keterangan</th>
                <th className="p-4 font-bold text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {data.map((t) => (
                <tr key={t.id} className="border-t hover:bg-gray-50 transition">
                  <td className="p-4 text-gray-500 text-[11px]">
                    {t.createdAt?.toDate().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-gray-700">{t.description}</p>
                    <p className="text-[9px] text-gray-400 uppercase font-bold">{t.category}</p>
                  </td>
                  <td className={`p-4 text-right font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'} {t.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}