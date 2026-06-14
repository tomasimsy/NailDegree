'use client';

export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const supabaseRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);

  // Lazy load Supabase client only on the client side
  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      supabaseRef.current = createClient();
      setIsClient(true);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!supabaseRef.current) {
      setError('Initializing... please try again');
      return;
    }

    const { error } = await supabaseRef.current.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
    } else {
      router.push('/dashboard');
    }
  };

  // Show a minimal loading state while the client is being imported
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold text-center mb-6">Technician Login</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}