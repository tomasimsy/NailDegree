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

  const today = new Date().toISOString().slice(0,10)
  const { data, error } = await supabase
    .from('service_transactions')
    .select('id, actual_price, tip_amount, commission_amount, transaction_time, notes')
    .eq('employee_id', emp.id)
    .gte('transaction_time', today)
    .order('transaction_time', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}