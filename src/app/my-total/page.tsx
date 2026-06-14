'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

interface TotalsRow {
  period_label: string
  services: number
  revenue: number
  tips: number
  commission: number
  turns_used: number
}

export default function MyTotalsPage() {
  const [period, setPeriod] = useState('today')
  const [rows, setRows] = useState<TotalsRow[]>([])
  const supabase = createClient()

  useEffect(() => {
    const fetchTotals = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      if (!employee) return

      let query = supabase
        .from('service_transactions')
        .select('transaction_time, actual_price, tip_amount, commission_amount, turn_consumed')
        .eq('employee_id', employee.id)

      const now = new Date()
      if (period === 'today') {
        const todayStr = now.toISOString().slice(0,10)
        query = query.gte('transaction_time', todayStr)
      } else if (period === 'week') {
        const start = new Date(now)
        start.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)) // Monday
        query = query.gte('transaction_time', start.toISOString().slice(0,10))
      } else if (period === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        query = query.gte('transaction_time', start.toISOString().slice(0,10))
      } else {
        const start = new Date(now.getFullYear(), 0, 1)
        query = query.gte('transaction_time', start.toISOString().slice(0,10))
      }

      const { data } = await query
      if (!data) return

      // Aggregate by date
      const agg: Record<string, TotalsRow> = {}
      data.forEach(t => {
        const date = t.transaction_time.slice(0,10)
        if (!agg[date]) {
          agg[date] = { period_label: date, services: 0, revenue: 0, tips: 0, commission: 0, turns_used: 0 }
        }
        agg[date].services++
        agg[date].revenue += t.actual_price
        agg[date].tips += t.tip_amount
        agg[date].commission += t.commission_amount
        agg[date].turns_used += t.turn_consumed ? 1 : 0
      })

      setRows(Object.values(agg).sort((a,b) => a.period_label.localeCompare(b.period_label)))
    }
    fetchTotals()
  }, [period, supabase])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">My Totals</h1>
      <div className="flex gap-2 mb-6">
        {['today', 'week', 'month', 'year'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded ${period === p ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>
      {rows.length === 0 && <p>No services in this period.</p>}
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Date</th>
                <th className="border p-2">Services</th>
                <th className="border p-2">Revenue</th>
                <th className="border p-2">Tips</th>
                <th className="border p-2">Commission</th>
                <th className="border p-2">Turns Used</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.period_label}>
                  <td className="border p-2">{row.period_label}</td>
                  <td className="border p-2 text-center">{row.services}</td>
                  <td className="border p-2 text-right">${row.revenue.toFixed(2)}</td>
                  <td className="border p-2 text-right">${row.tips.toFixed(2)}</td>
                  <td className="border p-2 text-right">${row.commission.toFixed(2)}</td>
                  <td className="border p-2 text-center">{row.turns_used}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}