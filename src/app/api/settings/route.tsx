import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: emp } = await supabase
    .from('employees')
    .select('commission_percentage, quick_buttons, default_range_start, default_range_end, cash_split, check_split')
    .eq('auth_user_id', user.id)
    .single()

  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  
  // Provide defaults if any column is null
  return NextResponse.json({
    commission_percentage: emp.commission_percentage ?? 15,
    quick_buttons: emp.quick_buttons ?? [35, 45, 40, 55, 65],
    default_range_start: emp.default_range_start ?? null,
    default_range_end: emp.default_range_end ?? null,
    cash_split: emp.cash_split ?? 70,
    check_split: emp.check_split ?? 30,
  })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const updateData: any = {}
  
  // Only include fields that are provided
  if (body.commission_percentage !== undefined) updateData.commission_percentage = body.commission_percentage
  if (body.quick_buttons !== undefined) updateData.quick_buttons = body.quick_buttons
  if (body.default_range_start !== undefined) updateData.default_range_start = body.default_range_start
  if (body.default_range_end !== undefined) updateData.default_range_end = body.default_range_end
  if (body.cash_split !== undefined) updateData.cash_split = body.cash_split
  if (body.check_split !== undefined) updateData.check_split = body.check_split

  const { error } = await supabase
    .from('employees')
    .update(updateData)
    .eq('auth_user_id', user.id)

  if (error) {
    console.error('Settings update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}