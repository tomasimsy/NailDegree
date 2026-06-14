import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('Auth error:', userError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get employee id
    const { data: employeeList, error: empError } = await supabase
      .from('employees')
      .select('id')
      .eq('auth_user_id', user.id)

    if (empError) {
      console.error('Employee query error:', empError)
      return NextResponse.json({ error: empError.message }, { status: 500 })
    }
    if (!employeeList || employeeList.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }
    const employee = employeeList[0]

    const today = new Date().toISOString().slice(0, 10)

    // Today's summary
    const { data: summary, error: summaryError } = await supabase
      .from('employee_daily_summary')
      .select('total_services, total_revenue, total_tips, total_commission, total_turns_used')
      .eq('employee_id', employee.id)
      .eq('summary_date', today)
      .maybeSingle()  // Use maybeSingle to avoid error when no row

    if (summaryError) {
      console.error('Summary error:', summaryError)
      return NextResponse.json({ error: summaryError.message }, { status: 500 })
    }

    const todayStats = summary || {
      total_services: 0,
      total_revenue: 0,
      total_tips: 0,
      total_commission: 0,
      total_turns_used: 0,
    }

    // Last service for turn status
    const { data: lastService, error: lastError } = await supabase
      .from('service_transactions')
      .select('turn_consumed, actual_price')
      .eq('employee_id', employee.id)
      .order('transaction_time', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastError) {
      console.error('Last service error:', lastError)
    }

    let turnStatus = { message: 'Ready for next client (no turn used)', isPartial: false }
    if (lastService) {
      if (!lastService.turn_consumed) {
        turnStatus = {
          message: `⚠️ Partial turn ($${lastService.actual_price}) – you can take another client immediately!`,
          isPartial: true,
        }
      } else {
        turnStatus = { message: '✅ Turn consumed – wait for another employee\'s turn.', isPartial: false }
      }
    }

    return NextResponse.json({ today: todayStats, turnStatus })
  } catch (err: any) {
    console.error('Dashboard API error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}