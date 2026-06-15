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

  // PWA state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Lazy load Supabase client
    import('@/lib/supabase/client').then(({ createClient }) => {
      supabaseRef.current = createClient();
      setIsClient(true);
    });

    // 2. Listen for native install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 3. Detect iOS (Safari) for manual instructions
    const isIOSDevice = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent) && !(window.navigator as any).standalone;
    };
    setIsIOS(isIOSDevice());

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') console.log('PWA installed');
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!supabaseRef.current) {
      setError('System initializing, please wait...');
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
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isClient) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-teal-800 border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-teal-800 font-medium">Loading secure portal...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-5 font-sans">
      <div className="max-w-md w-full p-6 bg-white border-2 border-[#FFF0E2] rounded-3xl shadow-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-[0.7rem] font-bold uppercase tracking-widest text-amber-600">Secure Access Portal</p>
          <h2 className="text-2xl font-black text-teal-900 tracking-tight">Technician Login</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500 text-white text-xs text-center font-bold px-4 py-3 rounded-2xl">
              ⚠️ {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-teal-800 block pl-1">Email</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#FFF0E2]/30 border border-amber-200 rounded-xl px-4 py-3 text-sm font-medium text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-800/20 focus:border-teal-800 transition-all"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-teal-800 block pl-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#FFF0E2]/30 border border-amber-200 rounded-xl px-4 py-3 text-sm font-medium text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-800/20 focus:border-teal-800 transition-all"
              required
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-teal-800 hover:bg-teal-800/90 text-white font-bold text-sm py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <span className="text-[9px] font-mono font-bold bg-[#FFF0E2] rounded-full px-3 py-1 text-amber-600">
            Secure workspace
          </span>
        </div>
      </div>

      {/* PWA Install Section */}
      <div className="w-full max-w-md mt-4 px-2 space-y-2">
        {/* Automatic install button (appears when beforeinstallprompt fires) */}
        {isInstallable && (
          <button
            onClick={handleInstallClick}
            className="w-full bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 font-bold text-xs py-3 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2"
          >
            📥 Install NTrack App (Offline ready)
          </button>
        )}

        {/* Manual Android instructions (fallback) */}
        {!isInstallable && !isIOS && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center text-[11px] font-medium text-slate-600 space-y-1">
            <p className="font-bold text-teal-800">📱 Install on Android</p>
            <p>
              Tap Chrome menu <span className="font-bold">⋮</span> → <span className="font-bold">"Add to Home screen"</span>
            </p>
          </div>
        )}

        {/* Manual iOS instructions */}
        {isIOS && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center text-[11px] font-medium text-slate-600 space-y-1">
            <p className="font-bold text-teal-800">🍏 Install on iPhone / iPad</p>
            <p>
              Tap Share <span className="text-base">📤</span> → <span className="font-bold">"Add to Home Screen"</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}