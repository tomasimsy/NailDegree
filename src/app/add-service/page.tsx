'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Client {
  id: number
  first_name: string
  last_name: string
}

interface Service {
  id: number
  service_name: string
}

export default function AddServicePage() {
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [form, setForm] = useState({ client_id: '', service_id: '', actual_price: '', tip: '0', notes: '' })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const [clientsRes, servicesRes] = await Promise.all([
        supabase.from('clients').select('id, first_name, last_name').order('first_name'),
        supabase.from('service_catalog').select('id, service_name').eq('is_active', true),
      ])
      if (clientsRes.data) setClients(clientsRes.data)
      if (servicesRes.data) setServices(servicesRes.data)
    }
    fetchData()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setMessage('Not authenticated')
      setLoading(false)
      return
    }

    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!employee) {
      setMessage('Employee record not found')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('service_transactions').insert({
      employee_id: employee.id,
      client_id: form.client_id || null,
      service_id: parseInt(form.service_id),
      actual_price: parseFloat(form.actual_price),
      tip_amount: parseFloat(form.tip),
      notes: form.notes || null,
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Service recorded! Redirecting...')
      setTimeout(() => router.push('/dashboard'), 1500)
    }
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Record a New Service</h1>
      {message && (
        <div className={`mb-4 p-2 rounded ${message.includes('Redirecting') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium">Client (optional)</label>
          <select
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">-- Walk-in --</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-medium">Service *</label>
          <select
            required
            value={form.service_id}
            onChange={(e) => setForm({ ...form, service_id: e.target.value })}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Select service</option>
            {services.map(s => (
              <option key={s.id} value={s.id}>{s.service_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-medium">Actual Price ($) *</label>
          <input
            type="number"
            step="0.01"
            required
            value={form.actual_price}
            onChange={(e) => setForm({ ...form, actual_price: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-medium">Tip ($)</label>
          <input
            type="number"
            step="0.01"
            value={form.tip}
            onChange={(e) => setForm({ ...form, tip: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-medium">Notes</label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
          {loading ? 'Saving...' : 'Save Service'}
        </button>
      </form>
    </div>
  )
}