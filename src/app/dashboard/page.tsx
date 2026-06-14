'use client'

export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Transaction {
  id: number
  actual_price: number
  tip_amount: number
  transaction_time: string
}

interface WeeklyData {
  actual_price: number
  tip_amount: number
}

interface MonthlyData {
  actual_price: number
  tip_amount: number
}

interface RangeData {
  actual_price: number
  tip_amount: number
}

export default function DashboardPage() {
  const [techName, setTechName] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [weeklyRaw, setWeeklyRaw] = useState<WeeklyData[]>([])
  const [monthlyRaw, setMonthlyRaw] = useState<MonthlyData[]>([])
  const [rangeRaw, setRangeRaw] = useState<RangeData[]>([])
  const [quickButtons, setQuickButtons] = useState<number[]>([35, 45, 40, 55, 65])
  const [tipAmount, setTipAmount] = useState(0)
  const [commissionPct, setCommissionPct] = useState(15)
  const [showSettings, setShowSettings] = useState(false)
  const [tempButtons, setTempButtons] = useState<number[]>([])
  const [tempCommission, setTempCommission] = useState(15)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // Date range state
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [defaultRangeStart, setDefaultRangeStart] = useState('')
  const [defaultRangeEnd, setDefaultRangeEnd] = useState('')
  const [isSavingRange, setIsSavingRange] = useState(false)

  // UI feedback states
  const [activePressBtn, setActivePressBtn] = useState<number | null>(null)
  const [updatingTipId, setUpdatingTipId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [settingsSuccess, setSettingsSuccess] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const computeTotals = (items: { actual_price: number; tip_amount: number }[]) => {
    const safeItems = Array.isArray(items) ? items : []
    const gross = safeItems.reduce((sum, i) => sum + (Number(i.actual_price) || 0), 0)
    const tips = safeItems.reduce((sum, i) => sum + (Number(i.tip_amount) || 0), 0)
    const commission = gross * (commissionPct / 100)
    const net = gross - commission + tips
    const commissionAndTips = commission + tips
    return { gross, tips, commission, net, commissionAndTips }
  }

  const dailyTotals = computeTotals(transactions)
  const weeklyTotals = computeTotals(weeklyRaw)
  const monthlyTotals = computeTotals(monthlyRaw)
  const rangeTotals = computeTotals(rangeRaw)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (weeklyRaw.length === 0 && commissionPct) fetchWeeklyTotals()
  }, [commissionPct])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: emp } = await supabase
      .from('employees')
      .select('full_name, commission_percentage, quick_buttons, default_range_start, default_range_end')
      .eq('auth_user_id', user.id)
      .single()
    if (emp) {
      setTechName(emp.full_name)
      setCommissionPct(emp.commission_percentage || 15)
      const btns = emp.quick_buttons || [35, 45, 40, 55, 65]
      setQuickButtons(btns)
      // Set default range if exists
      if (emp.default_range_start && emp.default_range_end) {
        setRangeStart(emp.default_range_start)
        setRangeEnd(emp.default_range_end)
        setDefaultRangeStart(emp.default_range_start)
        setDefaultRangeEnd(emp.default_range_end)
      } else {
        // Fallback: last 7 days
        const end = new Date()
        const start = new Date()
        start.setDate(end.getDate() - 7)
        setRangeStart(start.toISOString().slice(0,10))
        setRangeEnd(end.toISOString().slice(0,10))
      }
    }

    const res = await fetch('/api/transactions')
    const data = await res.json()
    setTransactions(data)

    await fetchWeeklyTotals()
  }

  const fetchWeeklyTotals = async () => {
    const resWeek = await fetch('/api/transactions/week')
    const dataWeek = await resWeek.json()
    setWeeklyRaw(dataWeek)

    const resMonth = await fetch('/api/transactions/month')
    if (resMonth.ok) {
      const dataMonth = await resMonth.json()
      setMonthlyRaw(dataMonth)
    }
  }

  // Fetch custom range data
  const fetchRangeData = async (start: string, end: string) => {
    const res = await fetch(`/api/transactions/range?start=${start}&end=${end}`)
    if (res.ok) {
      const data = await res.json()
      setRangeRaw(data)
    } else {
      setRangeRaw([])
    }
  }

  // Auto-load range when start/end change (debounced or manual apply)
  const applyRange = () => {
    if (rangeStart && rangeEnd) {
      fetchRangeData(rangeStart, rangeEnd)
    }
  }

  // Save current range as default
  const saveDefaultRange = async () => {
    setIsSavingRange(true)
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commission_percentage: commissionPct,
        quick_buttons: quickButtons,
        default_range_start: rangeStart,
        default_range_end: rangeEnd
      })
    })
    setIsSavingRange(false)
    if (res.ok) {
      setDefaultRangeStart(rangeStart)
      setDefaultRangeEnd(rangeEnd)
      alert('Default range saved')
    } else {
      alert('Failed to save default range')
    }
  }

  const recordService = async (price: number) => {
    setMessage('')
    setActivePressBtn(price)

    const res = await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actual_price: price, tip: tipAmount, service_id: null, client_id: null })
    })
    
    setActivePressBtn(null)

    if (res.ok) {
      setMessage(`Recorded $${price} + $${tipAmount} tip`)
      setTipAmount(0)
      await fetchData()
      await applyRange() // refresh custom range totals after new service
      setTimeout(() => setMessage(''), 3000)
    } else {
      const err = await res.json()
      setMessage(`Error: ${err.error}`)
    }
  }

  const updateTip = async (id: number, newTip: number) => {
    setUpdatingTipId(id)
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, tip_amount: newTip } : t))

    const res = await fetch(`/api/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tip_amount: newTip })
    })
    
    setUpdatingTipId(null)
    if (res.ok) {
      await fetchData()
      await applyRange()
    } else {
      alert('Failed to update tip')
      await fetchData()
    }
  }

  const deleteTransaction = async (id: number) => {
    if (!confirm('Delete this service?')) return
    setDeletingId(id)

    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        await fetchData()
        await applyRange()
      } else {
        alert(`Delete failed: ${data.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error(err)
      alert('Network error – could not delete')
    } finally {
      setDeletingId(null)
    }
  }

  const saveSettings = async () => {
    setIsSavingSettings(true)
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commission_percentage: tempCommission, quick_buttons: tempButtons })
    })
    setIsSavingSettings(false)

    if (res.ok) {
      setCommissionPct(tempCommission)
      setQuickButtons(tempButtons)
      setSettingsSuccess(true)
      setTimeout(() => {
        setSettingsSuccess(false)
        setShowSettings(false)
      }, 1000)
    }
  }

  const openSettings = () => {
    setTempButtons([...quickButtons])
    setTempCommission(commissionPct)
    setShowSettings(true)
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Load range on mount and when start/end changes (apply button)
  useEffect(() => {
    if (rangeStart && rangeEnd) {
      fetchRangeData(rangeStart, rangeEnd)
    }
  }, [rangeStart, rangeEnd])

  return (
    <div className={`min-h-screen bg-[#181920] text-neutral-100 flex flex-col font-sans selection:bg-neutral-700 transition-opacity duration-300 ${isLoggingOut ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#21232d]/90 backdrop-blur-md border-b border-neutral-700/50 px-5 py-4 flex justify-between items-center shadow-sm">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block">Operator Session</span>
          <h1 className="text-sm font-semibold text-white">{techName || 'System Tech'}</h1>
        </div>
        <div className="flex items-center gap-1 bg-[#121318]/80 p-1 rounded-full border border-neutral-700/40">
          <button onClick={openSettings} className="p-2 text-neutral-300 hover:text-white hover:bg-neutral-700/50 rounded-full transition-all active:scale-90">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button onClick={handleLogout} className="p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-700/50 rounded-full transition-all active:scale-90">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-4 pb-28">
        
        {/* Service Entry Panel */}
        <section className="bg-[#21232d] rounded-2xl border border-neutral-700/40 p-4 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold tracking-wide text-neutral-300">Staged Tip Value</span>
            <span className="text-[10px] font-mono text-neutral-400 bg-[#181920] px-2 py-0.5 rounded border border-neutral-700/40">Optional Modifier</span>
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-mono text-sm">$</span>
            <input
              type="number"
              step="0.01"
              value={tipAmount || ''}
              onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#2a2d3a] border border-neutral-700 rounded-xl pl-8 pr-4 py-3 text-sm font-mono text-white placeholder:text-neutral-500 focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 transition-all shadow-inner"
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">Execute Base Service</label>
            <div className="grid grid-cols-5 gap-2">
              {quickButtons.map((price, idx) => {
                const isLoggingThis = activePressBtn === price
                return (
                  <button
                    key={idx}
                    disabled={activePressBtn !== null}
                    onClick={() => recordService(price)}
                    className={`relative font-mono font-bold py-2.5 rounded-xl text-xs border active:scale-95 transition-all shadow-sm flex items-center justify-center ${
                      isLoggingThis 
                        ? 'bg-neutral-600 border-neutral-400 text-neutral-300 scale-95' 
                        : 'bg-[#2a2d3a] hover:bg-[#343848] text-white border-neutral-700'
                    }`}
                  >
                    {isLoggingThis ? (
                      <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : `$${price}`}
                  </button>
                )
              })}
            </div>
          </div>
          {message && (
            <div className="text-center text-xs py-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/30 font-mono transition-all">
              {message}
            </div>
          )}
        </section>

        {/* Daily Runs Log */}
        <section className="bg-[#21232d] rounded-2xl border border-neutral-700/40 p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold tracking-wide text-neutral-300">Daily Runs Log</span>
            <span className="text-[10px] font-mono bg-[#181920] text-neutral-300 px-2 py-0.5 rounded-full border border-neutral-700/40">
              {transactions.length} Active
            </span>
          </div>
          {transactions.length === 0 || !Array.isArray(transactions) ? (
            <div className="text-center py-8 bg-[#181920]/50 rounded-xl border border-dashed border-neutral-700">
              <p className="text-xs text-neutral-400 font-mono">No actions logged today</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1 custom-scrollbar">
              {transactions.map((t) => {
                const isUpdatingThisTip = updatingTipId === t.id
                const isDeletingThisRow = deletingId === t.id
                return (
                  <div key={t.id} className={`flex items-center justify-between bg-[#2a2d3a] border border-neutral-700 rounded-xl p-3 transition-all duration-200 shadow-sm ${
                    isDeletingThisRow ? 'opacity-30 scale-[0.98] border-red-500 bg-red-500/10' : 'opacity-100 scale-100'
                  }`}>
                    <div className="flex flex-col">
                      <span className="font-mono text-sm font-bold text-white">${t.actual_price.toFixed(2)}</span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {new Date(t.transaction_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex items-center">
                        <span className="text-[10px] font-mono text-neutral-400 absolute left-2">{isUpdatingThisTip ? '...' : 'Tip'}</span>
                        <input
                          type="number"
                          step="0.01"
                          disabled={isUpdatingThisTip}
                          value={t.tip_amount}
                          onChange={(e) => updateTip(t.id, parseFloat(e.target.value) || 0)}
                          className={`w-16 bg-[#181920] border rounded-lg pl-7 pr-1.5 py-1 text-xs font-mono text-right transition-colors focus:outline-none ${
                            isUpdatingThisTip ? 'text-neutral-500 border-neutral-600 bg-neutral-700/50' : 'text-emerald-400 border-neutral-700 focus:border-neutral-500'
                          }`}
                        />
                      </div>
                      <button onClick={() => deleteTransaction(t.id)} disabled={isDeletingThisRow} className={`p-1.5 rounded-lg hover:bg-[#343848] transition-colors ${isDeletingThisRow ? 'text-red-800' : 'text-neutral-400 hover:text-red-400 active:scale-75'}`}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-16v1a3 3 0 003 3h4a3 3 0 003-3V3M9 7h6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Custom Pay Period */}
        <section className="bg-[#21232d] rounded-2xl border border-neutral-700/40 p-4 space-y-3 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold tracking-wide text-neutral-300">📅 Custom Pay Period</span>
            <span className="text-[10px] font-mono text-neutral-400">Total with current rate</span>
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
              className="flex-1 bg-[#2a2d3a] border border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-neutral-500 color-scheme-dark"
            />
            <span className="text-neutral-400 text-xs self-center">→</span>
            <input
              type="date"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
              className="flex-1 bg-[#2a2d3a] border border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-neutral-500 color-scheme-dark"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={applyRange} className="flex-1 py-2 bg-[#2a2d3a] hover:bg-[#343848] text-white rounded-xl text-xs font-medium border border-neutral-700/60 transition-all active:scale-[0.98]">Apply Range</button>
            <button onClick={saveDefaultRange} disabled={isSavingRange} className="flex-1 py-2 bg-[#181920] border border-neutral-700 text-neutral-300 hover:text-white rounded-xl text-xs font-medium transition-all active:scale-[0.98] disabled:opacity-50">
              {isSavingRange ? 'Saving...' : 'Save as Default'}
            </button>
          </div>
          
          {/* Range Totals Card */}
          <div className="bg-[#181920]/60 rounded-xl p-3 space-y-2 mt-1 border border-neutral-700/30">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[9px] uppercase text-neutral-400 block">Net Take Home</span>
                <span className="text-lg font-mono font-bold text-white">${rangeTotals.net.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-amber-400/80 block">Comm + Tip</span>
                <span className="text-lg font-mono font-bold text-amber-400">${rangeTotals.commissionAndTips.toFixed(2)}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1 text-[11px] font-mono border-t border-neutral-700/40 pt-1.5">
              <div><span className="text-neutral-400 text-[9px] block">Gross</span>${rangeTotals.gross.toFixed(2)}</div>
              <div><span className="text-emerald-400 text-[9px] block">Tips</span>${rangeTotals.tips.toFixed(2)}</div>
              <div><span className="text-red-400 text-[9px] block">Comm</span>${rangeTotals.commission.toFixed(2)}</div>
            </div>
          </div>
        </section>

        {/* Existing Metrics (Daily, Weekly, Monthly) */}
        <section className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Performance Metrics</span>
            <span className="text-[10px] text-neutral-400 font-mono">Rate: {commissionPct}%</span>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {[
              { period: 'Daily Summary', data: dailyTotals },
              { period: 'Weekly Accumulation', data: weeklyTotals },
              { period: 'Monthly Outlook', data: monthlyTotals }
            ].map((metrics, idx) => (
              <div key={idx} className="bg-[#21232d] rounded-2xl border border-neutral-700/40 p-4 space-y-3 shadow-sm">
                <span className="text-[11px] font-bold text-neutral-300 block border-b border-neutral-700/40 pb-2">{metrics.period}</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#181920] p-2.5 rounded-xl border border-neutral-700/30 shadow-inner">
                    <span className="text-[9px] uppercase font-mono tracking-wider text-neutral-400 block">Net Take Home</span>
                    <span className="text-lg font-mono font-bold text-white">${metrics.data.net.toFixed(2)}</span>
                  </div>
                  <div className="bg-[#181920] p-2.5 rounded-xl border border-neutral-700/30 shadow-inner">
                    <span className="text-[9px] uppercase font-mono tracking-wider text-amber-400/80 block">Comm + Tip Combo</span>
                    <span className="text-lg font-mono font-bold text-amber-400">${metrics.data.commissionAndTips.toFixed(2)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 bg-[#181920]/40 p-2 rounded-xl border border-neutral-700/30 text-[11px] font-mono">
                  <div><span className="text-[9px] text-neutral-400 block">Gross</span><span className="text-neutral-200">${metrics.data.gross.toFixed(2)}</span></div>
                  <div><span className="text-[9px] text-emerald-400 block">Tips</span><span className="text-emerald-400 font-medium">${metrics.data.tips.toFixed(2)}</span></div>
                  <div><span className="text-[9px] text-red-400 block">Comm</span><span className="text-red-400/90">${metrics.data.commission.toFixed(2)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Settings Bottom Sheet */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-end justify-center z-50" onClick={() => !isSavingSettings && setShowSettings(false)}>
          <div className="bg-[#21232d] border-t border-neutral-700 rounded-t-3xl w-full max-w-md p-5 pb-8 space-y-5 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-neutral-600 rounded-full mx-auto" />
            <div>
              <h3 className="text-sm font-semibold text-white">Terminal Configurations</h3>
              <p className="text-[11px] text-neutral-400">Modify dynamic calculations and array layouts safely.</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono tracking-wide text-neutral-300 block">Commission Percentage</label>
                <input
                  type="number"
                  step="0.5"
                  disabled={isSavingSettings}
                  value={tempCommission}
                  onChange={(e) => setTempCommission(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#2a2d3a] border border-neutral-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-neutral-500 disabled:opacity-40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono tracking-wide text-neutral-300 block">Array Key Modifiers (Commas)</label>
                <input
                  type="text"
                  disabled={isSavingSettings}
                  value={tempButtons.join(',')}
                  onChange={(e) => setTempButtons(e.target.value.split(',').map(v => parseFloat(v.trim())).filter(n => !isNaN(n)))}
                  className="w-full bg-[#2a2d3a] border border-neutral-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-neutral-500 disabled:opacity-40"
                  placeholder="35,45,40,55,65"
                />
              </div>
            </div>
            <div className="flex gap-2 text-xs font-semibold pt-2">
              <button disabled={isSavingSettings} onClick={() => setShowSettings(false)} className="flex-1 py-3 bg-[#181920] border border-neutral-700 text-neutral-300 rounded-xl active:scale-95 transition-transform disabled:opacity-40">Dismiss</button>
              <button disabled={isSavingSettings} onClick={saveSettings} className={`flex-1 py-3 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 ${settingsSuccess ? 'bg-emerald-600 text-white' : 'bg-white text-black hover:bg-neutral-200'}`}>
                {isSavingSettings && <svg className="animate-spin h-3 w-3 text-black" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                {settingsSuccess ? (<span className="flex items-center gap-1"><svg className="w-3.5 h-3.5 stroke-white" fill="none" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>Saved</span>) : isSavingSettings ? 'Updating...' : 'Commit Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}