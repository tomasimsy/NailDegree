'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
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
  const supabaseRef = useRef<any>(null)
  const [isClient, setIsClient] = useState(false)

  // State Management
  const [techName, setTechName] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [weeklyRaw, setWeeklyRaw] = useState<WeeklyData[]>([])
  const [monthlyRaw, setMonthlyRaw] = useState<MonthlyData[]>([])
  const [rangeRaw, setRangeRaw] = useState<RangeData[]>([])
  const [quickButtons, setQuickButtons] = useState<number[]>([35, 45, 40, 55, 65])

  const [tipAmount, setTipAmount] = useState<string>('')
  const [commissionPct, setCommissionPct] = useState(15)
  const [cashSplitPct, setCashSplitPct] = useState(70)
  const [checkSplitPct, setCheckSplitPct] = useState(30)

  // Modals & UI States
  const [showSettings, setShowSettings] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [tempButtons, setTempButtons] = useState<number[]>([])
  const [tempButtonsString, setTempButtonsString] = useState('')
  const [tempCommission, setTempCommission] = useState(15)
  const [tempCashSplit, setTempCashSplit] = useState(70)
  const [tempCheckSplit, setTempCheckSplit] = useState(30)

  // Editing state for inline tip updates
  const [editingTip, setEditingTip] = useState<{ id: number; value: string } | null>(null)

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const router = useRouter()

  // Date Range Selection
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [isSavingRange, setIsSavingRange] = useState(false)
  const [activeRangePreset, setActiveRangePreset] = useState<'7days' | 'thisWeek' | 'custom'>('custom')

  // Loading States
  const [activePressBtn, setActivePressBtn] = useState<number | string | null>(null)
  const [updatingTipId, setUpdatingTipId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [settingsSuccess, setSettingsSuccess] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Custom amount
  const [customAmount, setCustomAmount] = useState('')

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const computeTotals = (items: { actual_price: number; tip_amount: number }[]) => {
    const safeItems = Array.isArray(items) ? items : []
    const gross = safeItems.reduce((sum, i) => sum + (Number(i.actual_price) || 0), 0)
    const tips = safeItems.reduce((sum, i) => sum + (Number(i.tip_amount) || 0), 0)
    const commission = gross * (commissionPct / 100)
    const total = commission + tips
    const cashAmount = total * (cashSplitPct / 100)
    const checkAmount = total * (checkSplitPct / 100)
    return { gross, tips, commission, total, cashAmount, checkAmount }
  }

  const dailyTotals = computeTotals(transactions)
  const weeklyTotals = computeTotals(weeklyRaw)
  const monthlyTotals = computeTotals(monthlyRaw)
  const rangeTotals = computeTotals(rangeRaw)

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      supabaseRef.current = createClient()
      setIsClient(true)
    })
  }, [])

  useEffect(() => {
    if (isClient) fetchData()
  }, [isClient])

  useEffect(() => {
    if (!isClient) return
    const interval = setInterval(() => {
      const now = new Date()
      const nextMidnight = new Date(now)
      nextMidnight.setHours(24, 0, 0, 0)
      const msUntilMidnight = nextMidnight.getTime() - now.getTime()
      setTimeout(() => {
        fetchData()
      }, msUntilMidnight)
    }, 24 * 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [isClient])

  useEffect(() => {
    if (rangeStart && rangeEnd && isClient) {
      fetchRangeData(rangeStart, rangeEnd)
    }
  }, [rangeStart, rangeEnd, isClient])

  const fetchAllTransactions = async () => {
    setLoadingAnalytics(true)
    try {
      const res = await fetch('/api/transactions/all')
      if (res.ok) {
        const data = await res.json()
        setAllTransactions(data)
      } else {
        showNotification('Failed to load transaction history', 'error')
      }
    } catch (err) {
      showNotification('Network error', 'error')
    } finally {
      setLoadingAnalytics(false)
    }
  }

  const fetchData = async () => {
    if (!supabaseRef.current) return
    try {
      const { data: { user } } = await supabaseRef.current.auth.getUser()
      if (!user) return

      const { data: emp } = await supabaseRef.current
        .from('employees')
        .select('full_name, commission_percentage, quick_buttons, default_range_start, default_range_end, cash_split, check_split')
        .eq('auth_user_id', user.id)
        .single()

      if (emp) {
        setTechName(emp.full_name)
        setCommissionPct(emp.commission_percentage ?? 15)
        setCashSplitPct(emp.cash_split ?? 70)
        setCheckSplitPct(emp.check_split ?? 30)
        setQuickButtons(emp.quick_buttons || [35, 45, 40, 55, 65])

        if (emp.default_range_start && emp.default_range_end) {
          setRangeStart(emp.default_range_start)
          setRangeEnd(emp.default_range_end)
        } else {
          setPreset7Days()
        }
      }

      const res = await fetch('/api/transactions')
      if (res.ok) {
        const data = await res.json()
        setTransactions(data)
      }

      await fetchWeeklyTotals()
    } catch (error) {
      console.error(error)
      showNotification('Error loading database', 'error')
    }
  }

  const fetchWeeklyTotals = async () => {
    try {
      const resWeek = await fetch('/api/transactions/week')
      if (resWeek.ok) {
        const dataWeek = await resWeek.json()
        setWeeklyRaw(dataWeek)
      }

      const resMonth = await fetch('/api/transactions/month')
      if (resMonth.ok) {
        const dataMonth = await resMonth.json()
        setMonthlyRaw(dataMonth)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchRangeData = async (start: string, end: string) => {
    try {
      const res = await fetch(`/api/transactions/range?start=${start}&end=${end}`)
      if (res.ok) {
        const data = await res.json()
        setRangeRaw(data)
      } else {
        setRangeRaw([])
      }
    } catch (err) {
      setRangeRaw([])
    }
  }

  const setPreset7Days = () => {
    setActiveRangePreset('7days')
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 7)
    setRangeStart(start.toISOString().slice(0, 10))
    setRangeEnd(end.toISOString().slice(0, 10))
    showNotification('Set to last 7 days', 'info')
  }

  const setPresetMondayToSunday = () => {
    setActiveRangePreset('thisWeek')
    const today = new Date()
    const day = today.getDay()
    const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diffToMonday))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    setRangeStart(monday.toISOString().slice(0, 10))
    setRangeEnd(sunday.toISOString().slice(0, 10))
    showNotification('Set range from Monday to Sunday', 'info')
  }

  const applyRange = () => {
    if (rangeStart && rangeEnd) {
      fetchRangeData(rangeStart, rangeEnd)
      showNotification('Date range updated', 'info')
    } else {
      showNotification('Please select a start and end date', 'info')
    }
  }

  const saveDefaultRange = async () => {
    if (!rangeStart || !rangeEnd) return
    setIsSavingRange(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commission_percentage: commissionPct,
          quick_buttons: quickButtons,
          default_range_start: rangeStart,
          default_range_end: rangeEnd,
          cash_split: cashSplitPct,
          check_split: checkSplitPct,
        }),
      })
      if (res.ok) {
        showNotification('Saved as your default view')
      } else {
        showNotification('Could not save settings', 'error')
      }
    } catch (err) {
      showNotification('Save error', 'error')
    } finally {
      setIsSavingRange(false)
    }
  }

  const updateTip = async (id: number, newTip: number) => {
    setUpdatingTipId(id)
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, tip_amount: newTip } : t))
    )
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tip_amount: newTip }),
      })
      if (res.ok) {
        await fetchData()
        if (rangeStart && rangeEnd) await fetchRangeData(rangeStart, rangeEnd)
      } else {
        showNotification('Failed to update tip in database', 'error')
        await fetchData()
      }
    } catch (err) {
      console.error(err)
      await fetchData()
    } finally {
      setUpdatingTipId(null)
    }
  }

  const recordService = async (price: number) => {
    setActivePressBtn(price)
    const currentTip = parseFloat(tipAmount) || 0
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actual_price: price, tip: currentTip, service_id: null, client_id: null }),
      })
      if (res.ok) {
        showNotification(`Saved $${price} with a $${currentTip} tip!`, 'success')
        setTipAmount('')
        await fetchData()
        if (rangeStart && rangeEnd) await fetchRangeData(rangeStart, rangeEnd)
      } else {
        const err = await res.json()
        showNotification(`Error: ${err.error || 'Failed to save'}`, 'error')
      }
    } catch (err) {
      showNotification('Network transaction error', 'error')
    } finally {
      setActivePressBtn(null)
    }
  }

  const recordCustomService = async () => {
    const amount = parseFloat(customAmount)
    if (isNaN(amount) || amount <= 0) {
      showNotification('Please enter a valid dollar amount', 'info')
      return
    }
    setCustomAmount('')
    setActivePressBtn('custom')
    const currentTip = parseFloat(tipAmount) || 0
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actual_price: amount, tip: currentTip, service_id: null, client_id: null }),
      })
      if (res.ok) {
        showNotification('Settings Synced with Database!', 'success')
        setTipAmount('')
        await fetchData()
        if (rangeStart && rangeEnd) await fetchRangeData(rangeStart, rangeEnd)
      } else {
        const err = await res.json()
        showNotification(`Database Update Failed: ${err.error || 'Unknown error'}`, 'error')
      }
    } catch (err) {
      showNotification('Error communicating with database', 'error')
    } finally {
      setActivePressBtn(null)
    }
  }

  const deleteTransaction = async (id: number) => {
    if (!confirm('Are you sure you want to delete this?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      if (res.ok) {
        showNotification('Deleted successfully', 'info')
        await fetchData()
        if (rangeStart && rangeEnd) await fetchRangeData(rangeStart, rangeEnd)
      } else {
        const data = await res.json()
        showNotification(`Error: ${data.error || 'Could not delete'}`, 'error')
      }
    } catch (err) {
      showNotification('Network disruption – deletion failed', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const saveSettings = async () => {
    setIsSavingSettings(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commission_percentage: tempCommission,
          quick_buttons: tempButtons,
          cash_split: tempCashSplit,
          check_split: tempCheckSplit,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setCommissionPct(tempCommission)
        setQuickButtons(tempButtons)
        setCashSplitPct(tempCashSplit)
        setCheckSplitPct(tempCheckSplit)
        setSettingsSuccess(true)
        showNotification('Settings saved!', 'success')
        await fetchData()
        setTimeout(() => {
          setSettingsSuccess(false)
          setShowSettings(false)
        }, 1000)
      } else {
        showNotification(`Save failed: ${data.error || 'Unknown error'}`, 'error')
      }
    } catch (err) {
      showNotification('Network error – settings not saved', 'error')
    } finally {
      setIsSavingSettings(false)
    }
  }

  const openSettings = () => {
    setTempButtons([...quickButtons])
    setTempButtonsString(quickButtons.join(', '))
    setTempCommission(commissionPct)
    setTempCashSplit(cashSplitPct)
    setTempCheckSplit(checkSplitPct)
    setShowSettings(true)
  }

  const applyQuickButtonsString = () => {
    const buttons = tempButtonsString
      .split(',')
      .map(v => parseFloat(v.trim()))
      .filter(n => !isNaN(n))
    if (buttons.length) setTempButtons(buttons)
    else setTempButtons([])
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    if (supabaseRef.current) await supabaseRef.current.auth.signOut()
    router.push('/login')
  }

  if (!isClient) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFFFFF]">
        <div className="w-10 h-10 border-4 border-[#1A434E] border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-[#1A434E] font-medium tracking-wide animate-pulse">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs px-4">
          <div className={`shadow-lg rounded-2xl px-4 py-3 text-sm text-center font-bold border animate-slide-in ${
            toast.type === 'error' ? 'bg-red-500 text-white border-red-600' :
            toast.type === 'info' ? 'bg-[#1A434E] text-white border-[#1A434E]' :
            'bg-[#E29A49] text-white border-[#E29A49]'
          }`}>
            {toast.message}
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className={`min-h-screen bg-[#FFFFFF] text-[#0B1E23] pb-36 font-sans antialiased transition-all duration-500 ${
        isLoggingOut ? 'opacity-10 pointer-events-none filter blur-md' : 'opacity-100'
      }`}>
        <div className="max-w-md mx-auto px-5 pt-6 space-y-6">

          {/* Top Title Bar */}
          <div className="flex justify-between items-center py-2 bg-[#1A434E] text-[#FFF0E2] rounded-3xl px-4 shadow-sm border border-[#E29A49]/20">
            <div>
              <p className="text-[0.7rem] font-bold uppercase tracking-widest text-[#E29A49]">Nail Track</p>
              <h1 className="text-2xl font-black tracking-tight">{techName || 'Independent Builder'}</h1>
            </div>
            <button onClick={openSettings} className="w-11 h-11 rounded-xl bg-[#FFF0E2] border border-[#E29A49]/20 flex items-center justify-center hover:bg-[#E29A49]/20 text-lg transition-all active:scale-95 shadow-sm">
              ⚙️
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5">

            {/* Quick buttons */}
            <div className="bg-[#1A434E] rounded-3xl shadow-md p-4 text-white relative overflow-hidden">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#FFF0E2]/80">Quick Select Amount</h2>
                <span className="text-[10px] font-bold bg-[#E29A49] text-white px-2.5 py-0.5 rounded-full shadow-sm">
                  Your Cut: {commissionPct}%
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {quickButtons.map((price, idx) => {
                  const isThisLoading = activePressBtn === price
                  return (
                    <button key={idx} onClick={() => recordService(price)} disabled={activePressBtn !== null}
                      className={`relative py-2 rounded-lg font-mono font-extrabold text-xs shadow-sm transition-all border border-white/10 flex flex-col items-center justify-center overflow-hidden active:scale-95 ${
                        isThisLoading ? 'bg-[#E29A49] text-white animate-pulse' : 'bg-[#FFFFFF]/10 hover:bg-[#FFFFFF]/20 text-white'
                      }`}>
                      {isThisLoading ? (
                        <span className="text-[10px] uppercase font-sans tracking-wider font-black">Saving...</span>
                      ) : (
                        <>
                          <span className="text-[7px] opacity-60 uppercase font-sans font-semibold tracking-wider mb-0.5">Select</span>
                          <span>${price}</span>
                        </>
                      )}
                    </button>
                  )
                })}
                <div className="col-span-5 grid grid-cols-12 gap-2 mt-2">
                  <div className="col-span-8 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FFF0E2]/60 font-mono text-xs font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="Custom"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      disabled={activePressBtn !== null}
                      className="w-full bg-white/10 border border-white/10 rounded-xl pl-6 pr-2 py-2.5 font-mono font-bold text-xs text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[#E29A49] focus:border-[#E29A49] transition-all disabled:opacity-50"
                    />
                  </div>
                  <button onClick={recordCustomService} disabled={activePressBtn !== null || !customAmount}
                    className="py-2.5 rounded-xl bg-[#E29A49] hover:bg-[#E29A49]/90 text-white font-sans font-bold text-xs shadow-sm transition-all flex flex-col items-center justify-center col-span-4 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none truncate px-1">
                    {activePressBtn === 'custom' ? '...' : 'Enter'}
                  </button>
                </div>
              </div>
            </div>

            {/* Today's services list */}
            <div className="bg-[#1A434E] rounded-3xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-3 px-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#FFF0E2]">Today's Services Logged</h2>
                <span className="text-[10px] font-mono font-bold bg-[#FFF0E2] text-[#1A434E] rounded-full px-2.5 py-0.5 shadow-inner">
                  {transactions.length} Items Listed
                </span>
              </div>
              {transactions.length === 0 ? (
                <div className="text-center py-10 text-[#FFF0E2]/60 text-xs italic">No items logged yet today.</div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {transactions.map((t) => {
                    const isDeleting = deletingId === t.id
                    const isEditing = editingTip?.id === t.id
                    return (
                      <div key={t.id} className={`flex items-center justify-between bg-[#FFF0E2]/90 rounded-xl p-3 border border-[#FFF0E2] transition-all hover:bg-[#FFF0E2] shadow-sm ${isDeleting ? 'opacity-30 translate-x-4' : ''}`}>
                        <div>
                          <div className="font-mono font-bold text-[#0B1E23] text-sm">${t.actual_price.toFixed(2)}</div>
                          <div className="text-[9px] text-[#1A434E]/70 font-mono mt-0.5">
                            {new Date(t.transaction_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="relative flex items-center">
                            <span className="absolute left-2 text-[9px] font-bold text-[#1A434E]/70 uppercase">Tip</span>
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.01"
                                inputMode="decimal"
                                value={editingTip.value}
                                onChange={(e) => setEditingTip({ id: t.id, value: e.target.value })}
                                onBlur={() => {
                                  if (editingTip) {
                                    const newTip = parseFloat(editingTip.value) || 0
                                    updateTip(t.id, newTip)
                                    setEditingTip(null)
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const newTip = parseFloat(editingTip?.value || '0') || 0
                                    updateTip(t.id, newTip)
                                    setEditingTip(null)
                                  }
                                }}
                                autoFocus
                                className="w-20 pl-7 pr-2 py-1 text-right text-xs bg-white font-mono font-bold text-[#0B1E23] rounded-lg border border-[#1A434E] focus:outline-none focus:ring-1 focus:ring-[#1A434E]"
                              />
                            ) : (
                              <button
                                onClick={() => setEditingTip({ id: t.id, value: t.tip_amount.toString() })}
                                className="w-20 pl-7 pr-2 py-1 text-right text-xs bg-white/80 hover:bg-white font-mono font-bold text-[#0B1E23] rounded-lg border border-[#E29A49]/30 transition-all cursor-text"
                              >
                                ${t.tip_amount.toFixed(2)}
                              </button>
                            )}
                          </div>
                          <button onClick={() => deleteTransaction(t.id)} className="text-red-500 hover:text-red-700 p-1.5 rounded-lg transition-all active:scale-90">
                            🗑️
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            
            {/* ==================== NEW: Daily Totals Card ==================== */}
            <div className="bg-[#1A434E] rounded-3xl p-5 shadow-sm text-white">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#FFF0E2]">Daily Totals</h2>
                <span className="text-[10px] font-mono font-bold bg-[#E29A49] text-white px-2.5 py-0.5 rounded-full shadow-inner">Today</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[9px] text-[#FFF0E2]/60 uppercase">Gross</p>
                  <p className="text-lg font-mono font-bold">${dailyTotals.gross.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-[#FFF0E2]/60 uppercase">Tips</p>
                  <p className="text-lg font-mono font-bold">${dailyTotals.tips.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-[#FFF0E2]/60 uppercase">Commission</p>
                  <p className="text-lg font-mono font-bold">${dailyTotals.commission.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-[#FFF0E2]/60 uppercase">Total (Comm+Tips)</p>
                  <p className="text-lg font-mono font-bold text-[#E29A49]">${dailyTotals.total.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-[#FFF0E2]/60 uppercase">Cash ({cashSplitPct}%)</p>
                  <p className="text-lg font-mono font-bold">${dailyTotals.cashAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-[#FFF0E2]/60 uppercase">Check ({checkSplitPct}%)</p>
                  <p className="text-lg font-mono font-bold">${dailyTotals.checkAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Daily totals – existing two‑column cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1A434E] rounded-3xl p-5 text-white flex flex-col justify-between shadow-sm min-h-[160px] transition-transform active:scale-95 border border-[#E29A49]/10">
                <div className="flex justify-between items-start">
                  <span className="text-xl"></span>
                  <span className="text-[9px] font-extrabold tracking-wider uppercase bg-[#FFFFFF]/10 text-[#FFF0E2] px-2 py-0.5 rounded-md border border-[#E29A49]/10">Today</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#FFF0E2]/70 block font-bold uppercase tracking-wider">Today's Earnings</span>
                  <h3 className="text-2xl font-black font-mono tracking-tight text-white">${dailyTotals.total.toFixed(2)}</h3>
                  <div className="flex justify-between text-[9px] text-[#FFF0E2]/60 mt-2 pt-2 border-t border-white/10 font-mono">
                    <span>Base: ${dailyTotals.gross.toFixed(0)}</span>
                    <span>Tips: ${dailyTotals.tips.toFixed(0)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-[#FFF0E2] rounded-3xl p-5 flex flex-col justify-between shadow-sm min-h-[160px] border border-[#E29A49]/10 transition-transform active:scale-95">
                <div className="flex justify-between items-start">
                  <span className="text-xl text-[#1A434E]"></span>
                  <span className="text-[9px] font-bold tracking-wider uppercase bg-[#FFFFFF] text-[#1A434E] px-2 py-0.5 rounded-md border border-[#E29A49]/10">Payouts</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#1A434E] font-bold">Cash ({cashSplitPct}%)</span>
                    <span className="font-mono font-extrabold text-[#0B1E23]">${dailyTotals.cashAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#1A434E] font-bold">Check ({checkSplitPct}%)</span>
                    <span className="font-mono font-extrabold text-[#0B1E23]">${dailyTotals.checkAmount.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-[#FFFFFF] h-2 rounded-full mt-2 overflow-hidden border border-[#E29A49]/20 shadow-inner">
                    <div className="bg-[#E29A49] h-full transition-all duration-700 ease-out rounded-full" style={{ width: `${cashSplitPct}%` }} />
                  </div>
                </div>
              </div>
            </div>



            {/* Date Range Selector */}
            <div className="bg-[#FFF0E2]/60 rounded-3xl border border-[#1A434E] shadow-sm p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A434E]">Select Custom Dates</h3>
                <span className="text-[9px] font-mono font-bold text-[#E29A49] shadow-inner px-2 py-0.5 rounded-md bg-[#FFF0E2]">Date Picker</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={setPreset7Days} className={`py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border ${
                  activeRangePreset === '7days' ? 'bg-[#1A434E] text-white border-[#1A434E] shadow-inner' : 'bg-[#FFFFFF] text-[#1A434E] border-[#E29A49]/20 hover:bg-[#FFF0E2]'
                }`}>🗓️ Last 7 Days</button>
                <button onClick={setPresetMondayToSunday} className={`py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border ${
                  activeRangePreset === 'thisWeek' ? 'bg-[#1A434E] text-white border-[#1A434E] shadow-inner' : 'bg-[#FFFFFF] text-[#1A434E] border-[#E29A49]/20 hover:bg-[#FFF0E2]'
                }`}>🔒 Mon - Sun Frame</button>
              </div>
              <div className="grid grid-cols-2 gap-3 bg-[#FFFFFF] p-3 rounded-2xl border border-[#E29A49]/10 shadow-inner">
                <div className="space-y-1">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-[#1A434E]/60 pl-1 block">Start Date</span>
                  <input type="date" value={rangeStart} onChange={(e) => { setRangeStart(e.target.value); setActiveRangePreset('custom') }}
                    className="w-full bg-[#FFF0E2]/40 rounded-xl p-2 text-xs font-mono font-bold border border-[#E29A49]/20 outline-none text-[#0B1E23] focus:border-[#1A434E] transition-colors" />
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-[#1A434E]/60 pl-1 block">End Date</span>
                  <input type="date" value={rangeEnd} onChange={(e) => { setRangeEnd(e.target.value); setActiveRangePreset('custom') }}
                    className="w-full bg-[#FFF0E2]/40 rounded-xl p-2 text-xs font-mono font-bold border border-[#E29A49]/20 outline-none text-[#0B1E23] focus:border-[#1A434E] transition-colors" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={applyRange} className="flex-1 bg-[#1A434E] hover:bg-[#1A434E]/90 text-white rounded-xl py-2.5 text-xs font-bold transition-all active:scale-[0.98] shadow-sm">
                  Show Data for Range
                </button>
                <button onClick={saveDefaultRange} disabled={isSavingRange} className="px-4 bg-[#FFFFFF] hover:bg-[#FFF0E2] text-[#1A434E] border border-[#E29A49]/20 rounded-xl text-xs font-bold transition-all active:scale-[0.98] shadow-inner">
                  {isSavingRange ? 'Saving...' : 'Pin as Default'}
                </button>
              </div>
              <div className="bg-[#1A434E] rounded-2xl p-4 text-white flex flex-col justify-between shadow-md border border-[#E29A49]/10">
                <div className="text-center mb-2.5">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-[#FFF0E2]/60 block">Total for Selected Dates</span>
                  <div className="text-2xl font-mono font-black text-white">${rangeTotals.total.toFixed(2)}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs border-t border-white/10 pt-2.5 text-center font-mono font-bold text-[#FFF0E2]/80">
                  <div><span className="text-[8px] text-[#FFF0E2]/60 uppercase font-bold block">Cash Portion</span><div className="text-white mt-0.5">${rangeTotals.cashAmount.toFixed(2)}</div></div>
                  <div><span className="text-[8px] text-[#FFF0E2]/60 uppercase font-bold block">Check Portion</span><div className="text-white mt-0.5">${rangeTotals.checkAmount.toFixed(2)}</div></div>
                </div>
              </div>
            </div>

            {/* Weekly & Monthly Cards */}
            <div className="bg-[#FFFFFF] border-2 border-[#1A434E] rounded-3xl shadow-sm p-5">
              <div className="flex justify-between items-center border-b border-[#FFF0E2] pb-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1A434E]">Weekly Totals</span>
                <span className="text-[10px] text-white font-mono font-bold bg-[#E29A49] px-2.5 py-0.5 rounded-full shadow-inner">+${weeklyTotals.tips.toFixed(2)} Tips</span>
              </div>
              <div className="text-center mb-2"><span className="text-[9px] text-[#1A434E]/60 uppercase tracking-wide">Total This Week</span><div className="text-2xl font-mono font-black text-[#0B1E23]">${weeklyTotals.total.toFixed(2)}</div></div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs bg-[#FFF0E2]/50 p-2 rounded-xl">
                <div><p className="text-[8px] text-[#1A434E]/60 uppercase font-bold">Cash</p><p className="font-semibold">${weeklyTotals.cashAmount.toFixed(2)}</p></div>
                <div><p className="text-[8px] text-[#1A434E]/60 uppercase font-bold">Check</p><p className="font-semibold">${weeklyTotals.checkAmount.toFixed(2)}</p></div>
              </div>
            </div>

            <div className="bg-[#FFFFFF] border-2 border-[#1A434E] rounded-3xl shadow-sm p-5">
              <div className="flex justify-between items-center border-b border-[#FFF0E2] pb-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1A434E]">Monthly Totals</span>
                <span className="text-[10px] text-white font-mono font-bold bg-[#1A434E] px-2.5 py-0.5 rounded-full shadow-inner">Split: {commissionPct}%</span>
              </div>
              <div className="text-center mb-2"><span className="text-[9px] text-[#1A434E]/60 uppercase tracking-wide">Total This Month</span><div className="text-2xl font-mono font-black text-[#0B1E23]">${monthlyTotals.total.toFixed(2)}</div></div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs bg-[#FFF0E2]/50 p-2 rounded-xl">
                <div><p className="text-[8px] text-[#1A434E]/60 uppercase font-bold">Cash</p><p className="font-semibold">${monthlyTotals.cashAmount.toFixed(2)}</p></div>
                <div><p className="text-[8px] text-[#1A434E]/60 uppercase font-bold">Check</p><p className="font-semibold">${monthlyTotals.checkAmount.toFixed(2)}</p></div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation Menu Bar Row */}
        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4 pb-6">
          <div className="w-full max-w-md bg-[#1A434E] rounded-2xl shadow-xl px-6 py-3.5 flex justify-between items-center relative text-white border border-[#E29A49]/20">
            <button onClick={() => fetchData()} className="flex flex-col items-center gap-1 text-[#E29A49] transition-transform active:scale-90">
              <span className="text-xl">🏡</span>
              <span className="text-[8px] font-bold uppercase tracking-widest">Dashboard</span>
            </button>
            <button
              onClick={() => {
                setShowAnalytics(true)
                fetchAllTransactions()
              }}
              className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-transform active:scale-90"
            >
              <span className="text-xl">📊</span>
              <span className="text-[8px] font-bold uppercase tracking-widest">Analytics</span>
            </button>
            <div className="absolute -top-6 left-1/2 -translate-x-1/2">
              <button onClick={applyRange} className="h-14 w-14 rounded-full bg-[#E29A49] text-white flex items-center justify-center shadow-lg border-[4px] border-[#FFFFFF] transition-all active:scale-90 duration-500" title="Refresh Dates">
                <svg className="w-5 h-5 text-white stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.214 15M11 7h2v4h3v2h-5V7z" />
                </svg>
              </button>
            </div>
            <div className="w-10" />
            <button onClick={openSettings} className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-transform active:scale-90">
              <span className="text-xl">⚙️</span>
              <span className="text-[8px] font-bold uppercase tracking-widest">Settings</span>
            </button>
            <button onClick={handleLogout} className="flex flex-col items-center gap-1 opacity-60 hover:text-red-400 transition-transform active:scale-90">
              <span className="text-xl">🚪</span>
              <span className="text-[8px] font-bold uppercase tracking-widest">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Modal */}
      {showAnalytics && (
        <div
          className="fixed inset-0 bg-[#0B1E23]/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowAnalytics(false)}
        >
          <div
            className="bg-[#FFFFFF] rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl border border-[#FFF0E2] animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-[#FFF0E2] flex justify-between items-center">
              <div>
                <h3 className="text-lg font-extrabold text-[#0B1E23]">Transaction History</h3>
                <p className="text-xs text-slate-400">All recorded services</p>
              </div>
              <button onClick={() => setShowAnalytics(false)} className="w-8 h-8 rounded-full bg-[#FFF0E2] flex items-center justify-center text-[#1A434E]">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loadingAnalytics ? (
                <div className="text-center py-10">
                  <div className="w-8 h-8 border-4 border-[#1A434E] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Loading...</p>
                </div>
              ) : allTransactions.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm italic">No transactions found.</div>
              ) : (
                allTransactions.map((t) => (
                  <div key={t.id} className="bg-[#FFF0E2]/40 rounded-xl p-3 border border-[#FFF0E2]">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-mono font-bold text-[#0B1E23]">${t.actual_price.toFixed(2)}</div>
                        <div className="text-[10px] text-[#1A434E]/60">
                          {new Date(t.transaction_time).toLocaleDateString()} at{' '}
                          {new Date(t.transaction_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-[#1A434E]/60">Tip</div>
                        <div className="font-mono font-bold text-emerald-600">${t.tip_amount.toFixed(2)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-[#1A434E]/60">Commission</div>
                        <div className="font-mono font-bold text-amber-600">${(t as any).commission_amount?.toFixed(2) || '0.00'}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {!loadingAnalytics && allTransactions.length > 0 && (
              <div className="p-4 border-t border-[#FFF0E2] bg-[#FFF0E2]/30">
                <div className="flex justify-between text-sm font-bold">
                  <span>Total Services:</span>
                  <span>{allTransactions.length}</span>
                </div>
                <div className="flex justify-between text-sm font-bold mt-1">
                  <span>Total Gross:</span>
                  <span>${allTransactions.reduce((sum, t) => sum + t.actual_price, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold mt-1">
                  <span>Total Tips:</span>
                  <span>${allTransactions.reduce((sum, t) => sum + t.tip_amount, 0).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-[#0B1E23]/50 backdrop-blur-xs flex items-end justify-center z-50" onClick={() => !isSavingSettings && setShowSettings(false)}>
          <div className="bg-[#FFFFFF] rounded-t-[2rem] w-full max-w-md p-6 pb-10 space-y-5 shadow-2xl border-t border-[#FFF0E2] text-[#0B1E23] animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto" />
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-extrabold text-[#0B1E23] uppercase tracking-wide">App Settings</h3>
                <p className="text-xs text-slate-400">Change database values and baseline choices below.</p>
              </div>
              {settingsSuccess && <div className="text-emerald-500 text-sm font-bold flex items-center gap-1.5 animate-pulse"><span>✨</span> Synced</div>}
            </div>
            <div className="space-y-4 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#1A434E] block">Your Commission % (Saves to DB)</label>
                <input type="number" step="0.5" value={tempCommission} onChange={(e) => setTempCommission(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#FFF0E2]/30 border border-[#E29A49]/20 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-[#0B1E23] focus:border-[#1A434E] outline-none shadow-inner" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#1A434E] block">Cash Split %</label>
                  <input type="number" step="1" value={tempCashSplit} onChange={(e) => { const val = parseFloat(e.target.value) || 0; setTempCashSplit(val); setTempCheckSplit(100 - val) }}
                    className="w-full bg-[#FFF0E2]/30 border border-[#E29A49]/20 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-[#0B1E23]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#1A434E] block">Check Split %</label>
                  <input type="number" step="1" value={tempCheckSplit} onChange={(e) => { const val = parseFloat(e.target.value) || 0; setTempCheckSplit(val); setTempCashSplit(100 - val) }}
                    className="w-full bg-[#FFF0E2]/30 border border-[#E29A49]/20 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-[#0B1E23]" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#1A434E] block">Quick Array Buttons (Separate with commas)</label>
                <div className="flex gap-2">
                  <input type="text" value={tempButtonsString} onChange={(e) => setTempButtonsString(e.target.value)} onBlur={applyQuickButtonsString}
                    className="flex-1 bg-[#FFF0E2]/30 border border-[#E29A49]/20 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-[#0B1E23] focus:border-[#1A434E] outline-none shadow-inner"
                    placeholder="35, 45, 40, 55, 65" />
                  <button onClick={applyQuickButtonsString} className="px-3 py-2 bg-[#1A434E] text-white rounded-xl text-xs font-bold">Apply</button>
                </div>
                <p className="text-[9px] text-slate-400 mt-1">Edit numbers, then click Apply to update the list.</p>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setShowSettings(false)} disabled={isSavingSettings} className="flex-1 py-3 bg-slate-100 rounded-xl text-slate-500 font-bold text-xs hover:bg-slate-200 transition-all active:scale-95">Discard Changes</button>
              <button onClick={saveSettings} disabled={isSavingSettings} className="flex-1 py-3 bg-[#1A434E] text-white font-bold text-xs rounded-xl shadow-sm hover:bg-[#1A434E]/90 transition-all active:scale-95">
                {isSavingSettings ? 'Processing Logic...' : 'Commit Settings Array'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}