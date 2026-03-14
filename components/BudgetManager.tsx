"use client"
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, onSnapshot, setDoc, doc, getDocs } from 'firebase/firestore';
import Card from '@/components/Card';
import Swal from 'sweetalert2';

export default function BudgetManager() {
  const [categories, setCategories] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState('');
  const [amount, setAmount] = useState('');

  const currentMonth = new Date().toISOString().slice(0, 7); // "2026-03"

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    // 1. Ambil Kategori (Hanya Expense)
    const qCat = query(collection(db, "categories"), where("userId", "==", uid), where("type", "==", "expense"));
    const unsubCat = onSnapshot(qCat, (s) => setCategories(s.docs.map(d => d.data().name)));

    // 2. Ambil Budget Bulan Ini
    const qBug = query(collection(db, "budgets"), where("userId", "==", uid), where("month", "==", currentMonth));
    const unsubBug = onSnapshot(qBug, (s) => setBudgets(s.docs.map(d => d.data())));

    // 3. Ambil Transaksi Bulan Ini (Untuk Realisasi)
    const qTrans = query(collection(db, "transactions"), where("userId", "==", uid), where("month", "==", currentMonth));
    const unsubTrans = onSnapshot(qTrans, (s) => setTransactions(s.docs.map(d => d.data())));

    return () => { unsubCat(); unsubBug(); unsubTrans(); };
  }, []);

  const handleSetBudget = async () => {
    if (!selectedCat || !amount) return;
    const budgetId = `${auth.currentUser?.uid}_${currentMonth}_${selectedCat}`;
    
    await setDoc(doc(db, "budgets", budgetId), {
      categoryName: selectedCat,
      amount: Number(amount),
      month: currentMonth,
      userId: auth.currentUser?.uid
    });
    
    setAmount('');
    Swal.fire({ icon: 'success', title: 'Budget Diset', timer: 1000, showConfirmButton: false });
  };

  // Kalkulasi Gabungan Budget vs Realisasi
  const analysis = budgets.map(b => {
    const actual = transactions
      .filter(t => t.category === b.categoryName && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { ...b, actual, percent: (actual / b.amount) * 100 };
  });

  return (
    <div className="space-y-6">
      {/* Form Input Budget */}
      <Card>
        <h3 className="font-bold mb-4">🎯 Atur Jatah Bulan Ini</h3>
        <div className="space-y-3">
          <select 
            value={selectedCat} onChange={e => setSelectedCat(e.target.value)}
            className="w-full p-3 bg-gray-50 rounded-xl text-sm border outline-none"
          >
            <option value="">Pilih Kategori Pengeluaran</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input 
            type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="Nominal Budget (Rp)"
            className="w-full p-3 bg-gray-50 rounded-xl text-sm border outline-none"
          />
          <button onClick={handleSetBudget} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold">Simpan Jatah</button>
        </div>
      </Card>

      {/* Progress Realisasi */}
      <Card>
        <h3 className="font-bold mb-4 text-gray-700">📊 Progress Budget {currentMonth}</h3>
        <div className="space-y-5">
          {analysis.length > 0 ? analysis.map((item, i) => (
            <div key={i}>
              <div className="flex justify-between text-[11px] mb-1 font-bold uppercase">
                <span>{item.categoryName}</span>
                <span className={item.actual > item.amount ? "text-red-500" : "text-gray-500"}>
                  Rp{item.actual.toLocaleString()} / Rp{item.amount.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden border">
                <div 
                  className={`h-full transition-all duration-700 ${item.actual > item.amount ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(item.percent, 100)}%` }}
                />
              </div>
            </div>
          )) : <p className="text-center text-gray-400 text-sm py-4 italic">Belum ada budget yang diatur.</p>}
        </div>
      </Card>
    </div>
  );
}