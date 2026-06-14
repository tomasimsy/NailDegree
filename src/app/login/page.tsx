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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(true);

    if (!supabaseRef.current) {
      setError('Initializing system... please try again');
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await supabaseRef.current.auth.signInWithPassword({ email, password });

      if (error) {
        setError(error.message);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An unexpected communication error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Consistent full-page loading state matching the dashboard setup
  if (!isClient) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFFFFF]">
        <div className="w-10 h-10 border-4 border-[#1A434E] border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-[#1A434E] font-medium tracking-wide animate-pulse">Initializing application...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF] text-[#0B1E23] px-5 font-sans antialiased">
      <div className="max-w-md w-full p-6 bg-[#FFFFFF] border-2 border-[#FFF0E2] rounded-[2rem] shadow-sm space-y-6">
        
        {/* Header Block matching Top Title Bar style */}
        <div className="text-center space-y-1">
          <p className="text-[0.7rem] font-bold uppercase tracking-widest text-[#E29A49]">
            Secure Access Portal
          </p>
          <h2 className="text-2xl font-black text-[#0B1E23] tracking-tight">
            Technician Login
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Error Message styled like the toast error state */}
          {error && (
            <div className="bg-red-500 text-white text-xs text-center font-bold px-4 py-3 rounded-2xl border border-red-600 animate-slide-in shadow-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Email input component matching setting drawers row */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#1A434E] block pl-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#FFF0E2]/30 border border-[#E29A49]/20 rounded-xl px-4 py-3 text-sm font-medium text-[#0B1E23] focus:outline-none focus:ring-2 focus:ring-[#1A434E]/20 focus:border-[#1A434E] transition-all shadow-inner"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Password input component matching setting drawers row */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#1A434E] block pl-1">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#FFF0E2]/30 border border-[#E29A49]/20 rounded-xl px-4 py-3 text-sm font-medium text-[#0B1E23] focus:outline-none focus:ring-2 focus:ring-[#1A434E]/20 focus:border-[#1A434E] transition-all shadow-inner"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Primary Action Button matching the settings/custom action triggers */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#1A434E] hover:bg-[#1A434E]/90 text-white font-bold text-sm py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Authenticating Credentials...</span>
              </>
            ) : (
              <span>Sign In to Workspace</span>
            )}
          </button>
        </form>

        {/* Footer Brand Node */}
        <div className="text-center pt-2">
          <span className="text-[9px] font-mono font-bold bg-[#FFF0E2] rounded-full px-3 py-1 text-[#E29A49] shadow-inner">
            Database Pipeline Protected
          </span>
        </div>

      </div>
    </div>
  );
}