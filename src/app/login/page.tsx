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
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      supabaseRef.current = createClient();
      setIsClient(true);
    });

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

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
    // If the native prompt is available, use it
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') console.log('PWA installed');
      setDeferredPrompt(null);
      setIsInstallable(false);
      return;
    }

    // Otherwise, show instructions modal
    setShowInstallModal(true);
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

  // Loading state (uncommented for consistency)
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
      <div className="max-w-md w-full p-6 bg-white border-2 border-amber-50 rounded-3xl shadow-sm space-y-6">
        <div className="text-center space-y-1">
          <p className="text-[0.7rem] font-bold uppercase tracking-widest text-amber-600">Secure Access Portal</p>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Technician Login</h2>
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
              className="w-full bg-amber-50/30 border border-amber-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-800/20 focus:border-teal-800 transition-all"
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
              className="w-full bg-amber-50/30 border border-amber-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-800/20 focus:border-teal-800 transition-all"
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
          <span className="text-[9px] font-mono font-bold bg-amber-50 rounded-full px-3 py-1 text-amber-600">
            Secure workspace
          </span>
        </div>
      </div>

      {/* ALWAYS VISIBLE INSTALL BUTTON */}
      <button
        onClick={handleInstallClick}
        className="w-full max-w-md mt-4 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
      >
        📥 Download / Install NTrack App
      </button>

      {/* Existing fallback instructions (if needed) – optional, but we keep them for extra guidance */}
      <div className="w-full max-w-md mt-2 px-2 space-y-2">
        {!isInstallable && !isIOS && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-center text-[11px] font-medium text-gray-600 space-y-1">
            <p className="font-bold text-teal-800">📱 Install on Android</p>
            <p>
              Tap Chrome menu <span className="font-bold">⋮</span> → <span className="font-bold">"Add to Home screen"</span>
            </p>
          </div>
        )}

        {isIOS && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-center text-[11px] font-medium text-gray-600 space-y-1">
            <p className="font-bold text-teal-800">🍏 Install on iPhone / iPad</p>
            <p>
              Tap Share <span className="text-base">📤</span> → <span className="font-bold">"Add to Home Screen"</span>
            </p>
          </div>
        )}
      </div>

      {/* Modal for installation instructions (if prompt not available) */}
      {showInstallModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-black text-gray-900">Install NTrack</h3>
            <p className="text-sm text-gray-600">
              {isIOS ? (
                <>
                  On iPhone/iPad, tap the <span className="font-bold">Share</span> button{' '}
                  <span className="text-base">📤</span> and select{' '}
                  <span className="font-bold">"Add to Home Screen"</span>.
                </>
              ) : (
                <>
                  On Android/Chrome, tap the menu <span className="font-bold">⋮</span> and select{' '}
                  <span className="font-bold">"Add to Home Screen"</span> or use the install prompt if it appears.
                </>
              )}
            </p>
            <p className="text-xs text-gray-400">
              If you see a browser prompt, follow its instructions to install the app.
            </p>
            <button
              onClick={() => setShowInstallModal(false)}
              className="w-full bg-teal-800 hover:bg-teal-800/90 text-white font-bold text-sm py-2.5 rounded-xl"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}