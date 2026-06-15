import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  // 1. Calculate the exact start of the current month
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  
  // 2. Format to YYYY-MM-DD safely for the Supabase date/timestamp filter
  const monthStart = startOfMonth.toISOString().slice(0, 10)

  // 3. Query records greater than or equal to the 1st of the month
  const { data, error } = await supabase
    .from('service_transactions')
    .select('id, actual_price, tip_amount, transaction_time')
    .eq('employee_id', emp.id)
    .gte('transaction_time', monthStart)
    .order('transaction_time', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}