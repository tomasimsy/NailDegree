'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

interface Transaction {
  date: string
  actual_price: number
  tip_amount: number
  commission_amount: number
  turn_consumed: boolean
}

export default function CommissionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState({ total_rev: 0, total_tips: 0, total_commission: 0, rate: 0 })
  const supabase = createClient()

  useEffect(() => {
    const fetchCommissions = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      if (!employee) return

      const { data } = await supabase
        .from('service_transactions')
        .select('transaction_time, actual_price, tip_amount, commission_amount, turn_consumed')
        .eq('employee_id', employee.id)
        .order('transaction_time', { ascending: false })
        .limit(50)

      if (!data) return

      const formatted = data.map(t => ({
        date: t.transaction_time.slice(0,10),
        actual_price: t.actual_price,
        tip_amount: t.tip_amount,
        commission_amount: t.commission_amount,
        turn_consumed: t.turn_consumed,
      }))

      setTransactions(formatted)

      const total_rev = formatted.reduce((s, t) => s + t.actual_price, 0)
      const total_tips = formatted.reduce((s, t) => s + t.tip_amount, 0)
      const total_commission = formatted.reduce((s, t) => s + t.commission_amount, 0)
      const rate = total_rev > 0 ? (total_commission / total_rev) * 100 : 0

      setSummary({ total_rev, total_tips, total_commission, rate })
    }
    fetchCommissions()
  }, [supabase])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Commissions & Tips History</h1>

      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="font-semibold">Summary (last 50 transactions)</h2>
        <p>Total Revenue: ${summary.total_rev.toFixed(2)}</p>
        <p>Total Tips: ${summary.total_tips.toFixed(2)}</p>
        <p>Total Commission: ${summary.total_commission.toFixed(2)}</p>
        <p>Effective Rate: {summary.rate.toFixed(2)}% of revenue</p>
      </div>

      {transactions.length === 0 && <p>No transactions yet.</p>}
      {transactions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Date</th>
                <th className="border p-2">Price</th>
                <th className="border p-2">Tip</th>
                <th className="border p-2">Commission</th>
                <th className="border p-2">Turn Consumed?</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, i) => (
                <tr key={i}>
                  <td className="border p-2">{t.date}</td>
                  <td className="border p-2 text-right">${t.actual_price.toFixed(2)}</td>
                  <td className="border p-2 text-right">${t.tip_amount.toFixed(2)}</td>
                  <td className="border p-2 text-right">${t.commission_amount.toFixed(2)}</td>
                  <td className="border p-2 text-center">{t.turn_consumed ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}