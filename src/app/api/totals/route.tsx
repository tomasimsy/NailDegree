import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: emp } = await supabase
    .from('employees')
    .select('id, commission_percentage')
    .eq('auth_user_id', user.id)
    .single()
  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  const today = new Date().toISOString().slice(0,10)
  const startOfWeek = new Date()
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + (startOfWeek.getDay() === 0 ? -6 : 1))
  const weekStart = startOfWeek.toISOString().slice(0,10)

  // Daily totals
  const { data: daily } = await supabase
    .from('service_transactions')
    .select('actual_price, tip_amount, commission_amount')
    .eq('employee_id', emp.id)
    .eq('transaction_time::date', today)

  // Weekly totals
  const { data: weekly } = await supabase
    .from('service_transactions')
    .select('actual_price, tip_amount, commission_amount')
    .eq('employee_id', emp.id)
    .gte('transaction_time', weekStart)

  const compute = (rows: any[]) => {
    const gross = rows.reduce((s, r) => s + r.actual_price, 0)
    const tips = rows.reduce((s, r) => s + r.tip_amount, 0)
    const commission = rows.reduce((s, r) => s + r.commission_amount, 0)
    const net = gross - commission + tips
    return { gross, tips, commission, net }
  }

  return NextResponse.json({
    daily: compute(daily || []),
    weekly: compute(weekly || [])
  })
}