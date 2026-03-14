"use client"
import { auth } from '@/lib/firebase';
import { 
  GoogleAuthProvider, 
  signInWithRedirect, 
  getRedirectResult, 
  onAuthStateChanged 
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [isloading, setIsLoading] = useState(false);

  // Cek jika user sudah login atau baru saja kembali dari redirect Google
  useEffect(() => {
    // 1. Jika user sudah login, langsung lempar ke dashboard
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push('/');
      }
    });

    // 2. Tangani hasil redirect setelah user memilih akun Google
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          router.push('/');
        }
      })
      .catch((error) => {
        console.error("Gagal mendapatkan hasil login:", error);
      });

    return () => unsubscribe();
  }, [router]);

  const loginWithGoogle = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    // Tambahkan prompt select_account agar user bisa ganti akun jika perlu
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Login gagal", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-10 rounded-[40px] shadow-2xl shadow-gray-200 text-center max-w-sm w-full border border-gray-100">
        <div className="text-5xl mb-6">💰</div>
        <h1 className="text-3xl font-extrabold mb-2 text-gray-900">Cashflow AI</h1>
        <p className="text-gray-400 text-sm mb-8">Kelola keuangan cerdas dengan integrasi budget</p>
        
        <button 
          onClick={loginWithGoogle}
          disabled={isloading}
          className={`w-full bg-black text-white px-8 py-4 rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-3 ${isloading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-gray-800'}`}
        >
          {isloading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Menghubungkan...
            </span>
          ) : (
            <>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/layout/google.svg" alt="Google" className="w-5 h-5 bg-white rounded-full p-0.5" />
              Masuk dengan Google
            </>
          )}
        </button>
        
        <p className="mt-8 text-[10px] text-gray-300 uppercase tracking-widest font-bold">
          Secure Cloud Database
        </p>
      </div>
    </div>
  );
}