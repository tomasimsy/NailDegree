import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params // ✅ await the Promise
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const transactionId = parseInt(id)
  if (isNaN(transactionId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  // Verify employee
  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!emp) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('service_transactions')
    .delete()
    .eq('id', transactionId)
    .eq('employee_id', emp.id)

  if (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// Also fix PUT for updating tip
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const transactionId = parseInt(id)
  if (isNaN(transactionId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const { tip_amount } = await request.json()

  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!emp) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('service_transactions')
    .update({ tip_amount })
    .eq('id', transactionId)
    .eq('employee_id', emp.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}