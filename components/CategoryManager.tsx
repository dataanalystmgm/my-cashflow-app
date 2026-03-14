"use client"
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import Card from '@/components/Card';
import Swal from 'sweetalert2';

export default function CategoryManager() {
  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('expense');

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, "categories"), where("userId", "==", auth.currentUser.uid));
    return onSnapshot(q, (snapshot) => {
      setCategories(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    try {
      await addDoc(collection(db, "categories"), {
        name: name.trim(),
        type: type,
        userId: auth.currentUser?.uid,
      });
      setName('');
      Swal.fire({ icon: 'success', title: 'Kategori Ditambah', timer: 1000, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal menambah kategori' });
    }
  };

  const handleDelete = async (id: string) => {
    const res = await Swal.fire({
      title: 'Hapus Kategori?',
      text: "Transaksi dengan kategori ini tidak akan terhapus, tapi kategori tak muncul lagi di pilihan.",
      showCancelButton: true,
      confirmButtonColor: '#ef4444'
    });
    if (res.isConfirmed) await deleteDoc(doc(db, "categories", id));
  };

  return (
    <Card className="mb-6">
      <h3 className="font-bold mb-4 flex items-center gap-2">📂 Kelola Kategori</h3>
      <form onSubmit={handleAdd} className="flex flex-col gap-3 mb-6">
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
          <button type="button" onClick={() => setType('expense')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${type === 'expense' ? 'bg-white shadow-sm text-red-500' : 'text-gray-400'}`}>Pengeluaran</button>
          <button type="button" onClick={() => setType('income')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${type === 'income' ? 'bg-white shadow-sm text-green-500' : 'text-gray-400'}`}>Pemasukan</button>
        </div>
        <div className="flex gap-2">
          <input 
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Nama Kategori (ex: Listrik)"
            className="flex-1 bg-gray-50 p-3 rounded-xl text-sm outline-none border focus:border-blue-400"
          />
          <button className="bg-blue-600 text-white px-6 rounded-xl font-bold text-sm">+</button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center gap-2 bg-white border px-3 py-1.5 rounded-full shadow-sm">
            <span className={`w-2 h-2 rounded-full ${cat.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-xs font-medium">{cat.name}</span>
            <button onClick={() => handleDelete(cat.id)} className="text-gray-300 hover:text-red-500">×</button>
          </div>
        ))}
      </div>
    </Card>
  );
}