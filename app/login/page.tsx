"use client"
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push('/');
    } catch (error) {
      console.error("Login gagal", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-10 rounded-3xl shadow-xl text-center">
        <h1 className="text-3xl font-bold mb-6">Cashflow AI</h1>
        <button 
          onClick={loginWithGoogle}
          className="bg-black text-white px-8 py-4 rounded-2xl font-bold hover:scale-105 transition"
        >
          Masuk dengan Google
        </button>
      </div>
    </div>
  );
}