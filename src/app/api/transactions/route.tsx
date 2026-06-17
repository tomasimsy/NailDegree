import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  // Get date from query param, default to today
  const url = new URL(request.url)
  const dateParam = url.searchParams.get('date')
  const targetDate = dateParam || new Date().toISOString().slice(0, 10)

  // Build UTC date range for the target date
  const start = targetDate + 'T00:00:00.000Z'
  const end = targetDate + 'T23:59:59.999Z'

  const { data, error } = await supabase
    .from('service_transactions')
    .select('id, actual_price, tip_amount, transaction_time')
    .eq('employee_id', emp.id)
    .gte('transaction_time', start)
    .lt('transaction_time', end)
    .order('transaction_time', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}