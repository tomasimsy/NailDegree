'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Transaction {
  id: number;
  actual_price: number;
  tip_amount: number;
  transaction_time: string;
}

interface WeeklyData {
  actual_price: number;
  tip_amount: number;
}

interface MonthlyData {
  actual_price: number;
  tip_amount: number;
}

interface RangeData {
  actual_price: number;
  tip_amount: number;
}

export default function DashboardPage() {
  const supabaseRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);

  const [techName, setTechName] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [weeklyRaw, setWeeklyRaw] = useState<WeeklyData[]>([]);
  const [monthlyRaw, setMonthlyRaw] = useState<MonthlyData[]>([]);
  const [rangeRaw, setRangeRaw] = useState<RangeData[]>([]);
  const [quickButtons, setQuickButtons] = useState<number[]>([35, 45, 40, 55, 65]);
  const [tipAmount, setTipAmount] = useState(0);
  const [commissionPct, setCommissionPct] = useState(15);
  const [showSettings, setShowSettings] = useState(false);
  const [tempButtons, setTempButtons] = useState<number[]>([]);
  const [tempCommission, setTempCommission] = useState(15);
  const [message, setMessage] = useState('');
  const router = useRouter();

  // Date range state
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [defaultRangeStart, setDefaultRangeStart] = useState('');
  const [defaultRangeEnd, setDefaultRangeEnd] = useState('');
  const [isSavingRange, setIsSavingRange] = useState(false);

  // UI feedback states
  const [activePressBtn, setActivePressBtn] = useState<number | null>(null);
  const [updatingTipId, setUpdatingTipId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const computeTotals = (items: { actual_price: number; tip_amount: number }[]) => {
    const safeItems = Array.isArray(items) ? items : [];
    const gross = safeItems.reduce((sum, i) => sum + (Number(i.actual_price) || 0), 0);
    const tips = safeItems.reduce((sum, i) => sum + (Number(i.tip_amount) || 0), 0);
    const commission = gross * (commissionPct / 100);
    const net = gross - commission + tips;
    const commissionAndTips = commission + tips;
    return { gross, tips, commission, net, commissionAndTips };
  };

  const dailyTotals = computeTotals(transactions);
  const weeklyTotals = computeTotals(weeklyRaw);
  const monthlyTotals = computeTotals(monthlyRaw);
  const rangeTotals = computeTotals(rangeRaw);

  // Lazy load Supabase client only after mount
  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      supabaseRef.current = createClient();
      setIsClient(true);
    });
  }, []);

  // Fetch data once client is ready
  useEffect(() => {
    if (isClient) fetchData();
  }, [isClient]);

  useEffect(() => {
    if (weeklyRaw.length === 0 && commissionPct && isClient) fetchWeeklyTotals();
  }, [commissionPct, isClient]);

  const fetchData = async () => {
    if (!supabaseRef.current) return;
    const { data: { user } } = await supabaseRef.current.auth.getUser();
    if (!user) return;

    const { data: emp } = await supabaseRef.current
      .from('employees')
      .select('full_name, commission_percentage, quick_buttons, default_range_start, default_range_end')
      .eq('auth_user_id', user.id)
      .single();
    if (emp) {
      setTechName(emp.full_name);
      setCommissionPct(emp.commission_percentage || 15);
      const btns = emp.quick_buttons || [35, 45, 40, 55, 65];
      setQuickButtons(btns);
      if (emp.default_range_start && emp.default_range_end) {
        setRangeStart(emp.default_range_start);
        setRangeEnd(emp.default_range_end);
        setDefaultRangeStart(emp.default_range_start);
        setDefaultRangeEnd(emp.default_range_end);
      } else {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 7);
        setRangeStart(start.toISOString().slice(0, 10));
        setRangeEnd(end.toISOString().slice(0, 10));
      }
    }

    const res = await fetch('/api/transactions');
    const data = await res.json();
    setTransactions(data);

    await fetchWeeklyTotals();
  };

  const fetchWeeklyTotals = async () => {
    const resWeek = await fetch('/api/transactions/week');
    const dataWeek = await resWeek.json();
    setWeeklyRaw(dataWeek);

    const resMonth = await fetch('/api/transactions/month');
    if (resMonth.ok) {
      const dataMonth = await resMonth.json();
      setMonthlyRaw(dataMonth);
    }
  };

  const fetchRangeData = async (start: string, end: string) => {
    const res = await fetch(`/api/transactions/range?start=${start}&end=${end}`);
    if (res.ok) {
      const data = await res.json();
      setRangeRaw(data);
    } else {
      setRangeRaw([]);
    }
  };

  const applyRange = () => {
    if (rangeStart && rangeEnd) fetchRangeData(rangeStart, rangeEnd);
  };

  const saveDefaultRange = async () => {
    setIsSavingRange(true);
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commission_percentage: commissionPct,
        quick_buttons: quickButtons,
        default_range_start: rangeStart,
        default_range_end: rangeEnd,
      }),
    });
    setIsSavingRange(false);
    if (res.ok) {
      setDefaultRangeStart(rangeStart);
      setDefaultRangeEnd(rangeEnd);
      alert('Default range saved');
    } else {
      alert('Failed to save default range');
    }
  };

  const recordService = async (price: number) => {
    setMessage('');
    setActivePressBtn(price);

    const res = await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actual_price: price, tip: tipAmount, service_id: null, client_id: null }),
    });

    setActivePressBtn(null);

    if (res.ok) {
      setMessage(`Successfully logged $${price} with a $${tipAmount} tip!`);
      setTipAmount(0);
      await fetchData();
      await applyRange();
      setTimeout(() => setMessage(''), 4000);
    } else {
      const err = await res.json();
      setMessage(`Error: ${err.error}`);
    }
  };

  const updateTip = async (id: number, newTip: number) => {
    setUpdatingTipId(id);
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, tip_amount: newTip } : t))
    );

    const res = await fetch(`/api/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tip_amount: newTip }),
    });

    setUpdatingTipId(null);
    if (res.ok) {
      await fetchData();
      await applyRange();
    } else {
      alert('Failed to update tip');
      await fetchData();
    }
  };

  const deleteTransaction = async (id: number) => {
    if (!confirm('Are you sure you want to remove this transaction?')) return;
    setDeletingId(id);

    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        await fetchData();
        await applyRange();
      } else {
        alert(`Delete failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error – could not delete');
    } finally {
      setDeletingId(null);
    }
  };

  const saveSettings = async () => {
    setIsSavingSettings(true);
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commission_percentage: tempCommission, quick_buttons: tempButtons }),
    });
    setIsSavingSettings(false);

    if (res.ok) {
      setCommissionPct(tempCommission);
      setQuickButtons(tempButtons);
      setSettingsSuccess(true);
      setTimeout(() => {
        setSettingsSuccess(false);
        setShowSettings(false);
      }, 1000);
    }
  };

  const openSettings = () => {
    setTempButtons([...quickButtons]);
    setTempCommission(commissionPct);
    setShowSettings(true);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    if (supabaseRef.current) await supabaseRef.current.auth.signOut();
    router.push('/login');
  };

  useEffect(() => {
    if (rangeStart && rangeEnd && isClient) {
      fetchRangeData(rangeStart, rangeEnd);
    }
  }, [rangeStart, rangeEnd, isClient]);

  if (!isClient) {
    return <div className="min-h-screen bg-[#111217] flex items-center justify-center"><div className="text-slate-400">Initializing...</div></div>;
  }

  return (
    <div
      className={`min-h-screen bg-[#111217] text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500/30 transition-opacity duration-300 ${
        isLoggingOut ? 'opacity-30 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Premium Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#161920]/90 backdrop-blur-md border-b border-slate-800/60 px-5 py-4 flex justify-between items-center shadow-md shadow-black/10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-600/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">Active Portal</span>
            <h1 className="text-sm font-bold text-white tracking-tight">{techName || 'System Operator'}</h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#1b1e26] p-1 rounded-xl border border-slate-800">
          <button
            onClick={openSettings}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <div className="w-[1px] h-4 bg-slate-800 self-center mx-0.5" />
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Primary Layout Engine */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-5 pb-28">
        {/* Module 1: Transaction Entry Panel */}
        <section className="bg-[#1a1d26] rounded-2xl border border-slate-800/80 p-5 space-y-4 shadow-lg shadow-black/10 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-80" />

          <div className="flex justify-between items-center">
            <span className="text-xs font-bold tracking-wider text-indigo-400 uppercase">Staged Modifier</span>
            <span className="text-[10px] font-mono text-slate-400 bg-[#12141a] px-2.5 py-1 rounded-md border border-slate-800">
              Tip Allocation
            </span>
          </div>

          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold font-mono text-base transition-colors group-focus-within:text-indigo-400">
              $
            </span>
            <input
              type="number"
              step="0.01"
              value={tipAmount || ''}
              onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#12141a] border border-slate-800 rounded-xl pl-9 pr-4 py-3 text-base font-mono font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-inner"
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2.5">
            <label className="text-[11px] uppercase font-extrabold tracking-wider text-slate-400 block">Execute Quick Run</label>
            <div className="grid grid-cols-5 gap-2">
              {quickButtons.map((price, idx) => {
                const isLoggingThis = activePressBtn === price;
                return (
                  <button
                    key={idx}
                    disabled={activePressBtn !== null}
                    onClick={() => recordService(price)}
                    className={`relative font-mono font-extrabold py-3 rounded-xl text-xs border shadow-md transition-all flex items-center justify-center transform active:scale-95 ${
                      isLoggingThis
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-none scale-95'
                        : 'bg-[#222733] hover:bg-[#2a303f] text-white border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {isLoggingThis ? (
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    ) : (
                      `$${price}`
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {message && (
            <div className="text-center text-xs py-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20 font-mono transition-all animate-pulse">
              🎉 {message}
            </div>
          )}
        </section>

        {/* Module 2: Live Session Ledger */}
        <section className="bg-[#1a1d26] rounded-2xl border border-slate-800/80 p-5 shadow-lg shadow-black/10">
          <div className="flex justify-between items-center mb-3.5">
            <span className="text-xs font-bold tracking-wider text-purple-400 uppercase">Daily Session Runs</span>
            <span className="text-[10px] font-mono font-bold bg-[#12141a] text-slate-300 px-2.5 py-1 rounded-md border border-slate-800">
              {transactions.length} Recorded
            </span>
          </div>

          {transactions.length === 0 || !Array.isArray(transactions) ? (
            <div className="text-center py-10 bg-[#12141a]/50 rounded-xl border border-dashed border-slate-800">
              <p className="text-xs text-slate-500 font-mono">No actions recorded in current shift</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
              {transactions.map((t) => {
                const isUpdatingThisTip = updatingTipId === t.id;
                const isDeletingThisRow = deletingId === t.id;
                return (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between bg-[#222733] border border-slate-800/60 rounded-xl p-3.5 transition-all duration-200 shadow-sm ${
                      isDeletingThisRow
                        ? 'opacity-20 scale-[0.95] border-rose-500 bg-rose-500/10'
                        : 'opacity-100 scale-100 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-base font-extrabold text-white">${t.actual_price.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-400 font-semibold tracking-wide flex items-center gap-1">
                        <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {new Date(t.transaction_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex items-center">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 absolute left-2.5 pointer-events-none">
                          {isUpdatingThisTip ? '...' : 'Tip'}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          disabled={isUpdatingThisTip}
                          value={t.tip_amount}
                          onChange={(e) => updateTip(t.id, parseFloat(e.target.value) || 0)}
                          className={`w-20 bg-[#12141a] border rounded-lg pl-8 pr-2 py-1.5 text-xs font-mono font-bold text-right transition-all focus:outline-none ${
                            isUpdatingThisTip
                              ? 'text-slate-500 border-slate-700 bg-slate-800/50'
                              : 'text-emerald-400 border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20'
                          }`}
                        />
                      </div>
                      <button
                        onClick={() => deleteTransaction(t.id)}
                        disabled={isDeletingThisRow}
                        className={`p-2 rounded-lg hover:bg-rose-500/10 transition-colors group ${
                          isDeletingThisRow ? 'text-rose-800' : 'text-slate-500 hover:text-rose-400 active:scale-75'
                        }`}
                      >
                        <svg className="w-4 h-4 transition-transform group-hover:scale-105" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-16v1a3 3 0 003 3h4a3 3 0 003-3V3M9 7h6"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Module 3: Custom Date Range Framework */}
        <section className="bg-[#1a1d26] rounded-2xl border border-slate-800/80 p-5 space-y-4 shadow-lg shadow-black/10">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold tracking-wider text-amber-400 uppercase">📅 Target Pay Window</span>
            <span className="text-[10px] font-mono text-slate-400">Live Rate Matching</span>
          </div>

          <div className="flex gap-2 bg-[#12141a] p-2 rounded-xl border border-slate-800/60">
            <input
              type="date"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
              className="flex-1 bg-[#1c1f26] border border-slate-700/60 rounded-lg px-2.5 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
              style={{ colorScheme: 'dark' }}
            />
            <span className="text-slate-600 text-xs self-center font-bold">→</span>
            <input
              type="date"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
              className="flex-1 bg-[#1c1f26] border border-slate-700/60 rounded-lg px-2.5 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={applyRange}
              className="flex-1 py-2.5 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 border border-slate-700 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] shadow-sm"
            >
              Calculate Window
            </button>
            <button
              onClick={saveDefaultRange}
              disabled={isSavingRange}
              className="flex-1 py-2.5 bg-[#12141a] border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSavingRange ? 'Locking...' : 'Pin as Default'}
            </button>
          </div>

          {/* Custom Range Results Card */}
          <div className="bg-[#12141a] rounded-xl p-4 space-y-3.5 border border-slate-800 shadow-inner">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#1c1f26] p-3 rounded-lg border border-slate-800">
                <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-400 block mb-0.5">Net Payout</span>
                <span className="text-xl font-mono font-black text-white">${rangeTotals.net.toFixed(2)}</span>
              </div>
              <div className="bg-[#1c1f26] p-3 rounded-lg border border-slate-800">
                <span className="text-[9px] uppercase font-bold tracking-wider text-amber-500 block mb-0.5">Bonus & Comm</span>
                <span className="text-xl font-mono font-black text-amber-400">${rangeTotals.commissionAndTips.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1 text-center bg-[#161920] p-2 rounded-lg border border-slate-800 text-xs font-mono">
              <div>
                <span className="text-slate-500 text-[9px] font-bold block uppercase mb-0.5">Gross</span>
                <span className="text-slate-200 font-bold">${rangeTotals.gross.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-emerald-500 text-[9px] font-bold block uppercase mb-0.5">Tips</span>
                <span className="text-emerald-400 font-bold">${rangeTotals.tips.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-rose-400 text-[9px] font-bold block uppercase mb-0.5">Split</span>
                <span className="text-rose-400/90 font-bold">${rangeTotals.commission.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Module 4: High-Fidelity Analytics Sheets */}
        <section className="space-y-3.5">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Macro Run Insights</span>
            <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md font-mono font-bold border border-indigo-500/20">
              Base Rate: {commissionPct}%
            </span>
          </div>

          <div className="space-y-4">
            {[
              { period: 'Daily Shift Analytics', data: dailyTotals, gradient: 'from-blue-500 to-indigo-600' },
              { period: 'Weekly Dynamic Accumulation', data: weeklyTotals, gradient: 'from-purple-500 to-pink-600' },
              { period: 'Monthly Outlook Performance', data: monthlyTotals, gradient: 'from-amber-500 to-orange-600' },
            ].map((metrics, idx) => (
              <div
                key={idx}
                className="bg-[#1a1d26] rounded-2xl border border-slate-800/80 p-5 space-y-4 shadow-lg shadow-black/10 relative overflow-hidden group"
              >
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                  <div className={`h-2.5 w-2.5 rounded-full bg-gradient-to-r ${metrics.gradient}`} />
                  <span className="text-xs font-black text-white uppercase tracking-wider">{metrics.period}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#12141a] p-3.5 rounded-xl border border-slate-800 shadow-inner">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">Net Take-Home</span>
                    <span className="text-xl font-mono font-black text-white tracking-tight">${metrics.data.net.toFixed(2)}</span>
                  </div>
                  <div className="bg-[#12141a] p-3.5 rounded-xl border border-slate-800 shadow-inner">
                    <span className="text-[9px] uppercase font-mono font-bold tracking-wider text-amber-500 block mb-0.5">Combo Yield</span>
                    <span className="text-xl font-mono font-black text-amber-400 tracking-tight">
                      ${metrics.data.commissionAndTips.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1 bg-[#12141a]/60 p-2.5 rounded-xl border border-slate-800 text-xs font-mono text-center">
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold block uppercase mb-0.5">Gross Revenue</span>
                    <span className="text-slate-300 font-bold">${metrics.data.gross.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-emerald-500 font-bold block uppercase mb-0.5">Shift Tips</span>
                    <span className="text-emerald-400 font-extrabold">${metrics.data.tips.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-rose-400 font-bold block uppercase mb-0.5">Rate Cut</span>
                    <span className="text-rose-400/90 font-bold">${metrics.data.commission.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Modern High-End Configurations Sheet */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-end justify-center z-50 transition-all duration-300"
          onClick={() => !isSavingSettings && setShowSettings(false)}
        >
          <div
            className="bg-[#1a1d26] border-t-2 border-indigo-500/80 rounded-t-[2.5rem] w-full max-w-md p-6 pb-10 space-y-5 shadow-2xl shadow-black/50 transform translate-y-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-1" />
            <div>
              <h3 className="text-base font-black text-white tracking-tight">System Configurations</h3>
              <p className="text-xs text-slate-400">Safely override matrix logic limits and calculation offsets.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-300 block">Commission Percentage</label>
                <input
                  type="number"
                  step="0.5"
                  disabled={isSavingSettings}
                  value={tempCommission}
                  onChange={(e) => setTempCommission(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#12141a] border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono font-bold text-white focus:outline-none focus:border-indigo-500 disabled:opacity-40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-300 block">Quick Action Array Matrix</label>
                <input
                  type="text"
                  disabled={isSavingSettings}
                  value={tempButtons.join(', ')}
                  onChange={(e) =>
                    setTempButtons(
                      e.target.value.split(',').map((v) => parseFloat(v.trim())).filter((n) => !isNaN(n))
                    )
                  }
                  className="w-full bg-[#12141a] border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono font-bold text-white focus:outline-none focus:border-indigo-500 disabled:opacity-40"
                  placeholder="35, 45, 40, 55, 65"
                />
              </div>
            </div>

            <div className="flex gap-2.5 text-xs font-bold pt-3">
              <button
                disabled={isSavingSettings}
                onClick={() => setShowSettings(false)}
                className="flex-1 py-3.5 bg-[#12141a] border border-slate-800 text-slate-400 rounded-xl active:scale-95 transition-all font-bold disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                disabled={isSavingSettings}
                onClick={saveSettings}
                className={`flex-1 py-3.5 rounded-xl active:scale-95 transition-all font-bold flex items-center justify-center gap-2 ${
                  settingsSuccess
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500'
                }`}
              >
                {isSavingSettings && <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                {settingsSuccess ? (
                  <span className="flex items-center gap-1.5 font-bold">
                    <svg className="w-4 h-4 stroke-white" fill="none" viewBox="0 0 24 24" strokeWidth="3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Saved Successfully
                  </span>
                ) : isSavingSettings ? (
                  'Commiting...'
                ) : (
                  'Save Settings'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}