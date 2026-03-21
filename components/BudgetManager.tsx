"use client"
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { 
  collection, query, where, onSnapshot, 
  setDoc, doc, deleteDoc 
} from 'firebase/firestore';
import Card from '@/components/Card';
import Swal from 'sweetalert2';

export default function BudgetManager() {
  const [categories, setCategories] = useState<string[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState('');
  const [amount, setAmount] = useState('');

  const currentMonth = new Date().toISOString().slice(0, 7); // Format: "2026-03"

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    // 1. Ambil Master Kategori (Hanya Expense)
    const qMasterCat = query(
      collection(db, "categories"), 
      where("userId", "==", uid), 
      where("type", "==", "expense")
    );

    // 2. Ambil Transaksi (Untuk deteksi kategori "Lainnya" yang tidak terdaftar)
    const qTrans = query(
      collection(db, "transactions"), 
      where("userId", "==", uid), 
      where("month", "==", currentMonth)
    );

    // 3. Ambil Budget Aktif
    const qBug = query(
      collection(db, "budgets"), 
      where("userId", "==", uid), 
      where("month", "==", currentMonth)
    );

    const unsubMaster = onSnapshot(qMasterCat, (s) => {
      const masters = s.docs.map(d => d.data().name);
      
      // Ambil juga kategori unik dari transaksi yang sudah ada
      const unsubTrans = onSnapshot(qTrans, (sTrans) => {
        const transData = sTrans.docs.map(d => d.data());
        setTransactions(transData);

        const transCats = transData
          .filter(t => t.type === 'expense')
          .map(t => t.category);
        
        // Gabungkan Master + Transaksi agar "Lainnya" muncul jika dipakai
        const combined = Array.from(new Set([...masters, ...transCats]));
        setCategories(combined.filter(Boolean).sort());
      });

      return () => unsubTrans();
    });

    const unsubBug = onSnapshot(qBug, (s) => {
      setBudgets(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubMaster(); unsubBug(); };
  }, []);

  const handleSetBudget = async () => {
    if (!selectedCat || !amount) {
      return Swal.fire({ icon: 'warning', title: 'Data belum lengkap', text: 'Pilih kategori dan isi nominal jatah.' });
    }
    
    // ID Unik agar 1 kategori hanya punya 1 budget per bulan
    const budgetId = `${auth.currentUser?.uid}_${currentMonth}_${selectedCat.replace(/\s+/g, '_')}`;
    
    try {
      await setDoc(doc(db, "budgets", budgetId), {
        categoryName: selectedCat,
        amount: Number(amount),
        month: currentMonth,
        userId: auth.currentUser?.uid
      });
      
      setAmount('');
      setSelectedCat('');
      Swal.fire({ icon: 'success', title: 'Jatah Berhasil Disimpan', timer: 1000, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal menyimpan data' });
    }
  };

  const handleDeleteBudget = async (id: string) => {
    const res = await Swal.fire({
      title: 'Hapus Jatah?',
      text: "Monitor pengeluaran untuk kategori ini akan dihentikan.",
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Hapus'
    });

    if (res.isConfirmed) {
      try {
        await deleteDoc(doc(db, "budgets", id));
        Swal.fire({ icon: 'success', title: 'Berhasil dihapus', timer: 800, showConfirmButton: false });
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Gagal menghapus' });
      }
    }
  };

  const handleEditBudget = (item: any) => {
    setSelectedCat(item.categoryName);
    setAmount(item.amount.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Kalkulasi Realisasi Akhir
  const budgetAnalysis = budgets.map(b => {
    const actual = transactions
      .filter(t => t.category === b.categoryName && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { ...b, actual, percent: (actual / b.amount) * 100 };
  });

  return (
    <div className="space-y-6">
      {/* INPUT / EDIT FORM */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800">🎯 Atur Jatah {currentMonth}</h3>
          <span className="text-[10px] bg-blue-50 text-blue-500 px-2 py-1 rounded-lg font-bold">MODE SETTING</span>
        </div>
        
        <div className="space-y-3">
          <div className="relative">
            <select 
              value={selectedCat} 
              onChange={e => setSelectedCat(e.target.value)}
              className="w-full p-4 bg-gray-50 rounded-2xl text-sm border border-gray-100 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all appearance-none"
            >
              <option value="">-- Pilih Kategori --</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="absolute right-4 top-4 pointer-events-none text-gray-400">▼</div>
          </div>

          <div className="relative">
            <span className="absolute left-4 top-4 text-gray-400 font-bold text-sm">Rp</span>
            <input 
              type="number" 
              value={amount} 
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="w-full p-4 pl-12 bg-gray-50 rounded-2xl text-sm border border-gray-100 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-bold"
            />
          </div>

          <button 
            onClick={handleSetBudget} 
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition active:scale-95 shadow-lg shadow-blue-100 flex justify-center items-center gap-2"
          >
            💾 Simpan Jatah
          </button>
        </div>
      </Card>

      {/* LIST BUDGET DENGAN AKSI */}
      <Card>
        <h3 className="font-bold mb-4 text-gray-700">📋 Daftar Monitor Jatah</h3>
        <div className="space-y-4">
          {budgetAnalysis.length > 0 ? budgetAnalysis.map((item) => (
            <div key={item.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 relative group transition-all hover:bg-white hover:shadow-md">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Kategori</p>
                  <p className="font-extrabold text-gray-800 uppercase text-sm tracking-tight">{item.categoryName}</p>
                </div>
                <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEditBudget(item)}
                    className="p-2 bg-white text-blue-500 rounded-xl shadow-sm border border-gray-100 hover:bg-blue-500 hover:text-white transition-all"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => handleDeleteBudget(item.id)}
                    className="p-2 bg-white text-red-500 rounded-xl shadow-sm border border-gray-100 hover:bg-red-500 hover:text-white transition-all"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="flex justify-between text-[11px] mb-2 font-medium">
                <span className="text-gray-500">
                  Pakai: <span className="text-gray-800 font-bold">Rp{item.actual.toLocaleString()}</span>
                </span>
                <span className="text-gray-400">
                  Limit: Rp{item.amount.toLocaleString()}
                </span>
              </div>
              
              <div className="w-full bg-white h-2.5 rounded-full overflow-hidden border border-gray-100">
                <div 
                  className={`h-full transition-all duration-1000 ${item.percent > 100 ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(item.percent, 100)}%` }}
                />
              </div>

              {item.percent > 100 && (
                <p className="text-[10px] text-red-500 font-bold mt-2 animate-pulse">
                  ⚠️ Over Budget Rp{(item.actual - item.amount).toLocaleString()}!
                </p>
              )}
            </div>
          )) : (
            <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-3xl">
              <p className="text-gray-400 text-sm italic">Belum ada jatah yang dipantau.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}