'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, CreditCard, DollarSign, TrendingUp, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AdminPaymentsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [payments, setPayments] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => { checkAuth() }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'super_admin') {
      router.push('/admin')
      return
    }

    setAuthorized(true)
    loadPayments()
  }

  const loadPayments = async () => {
    const { data } = await supabase
      .from('payments')
      .select('*, user:user_id(full_name, email), course:course_id(title)')
      .order('created_at', { ascending: false })
    setPayments(data || [])
    setLoading(false)
  }

  const totalRevenue = payments.filter((p) => p.status === 'completed').reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  const monthlyRevenue = payments
    .filter((p) => p.status === 'completed' && new Date(p.created_at) > new Date(Date.now() - 30 * 86400000))
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)

  const filtered = payments.filter((p) =>
    p.user?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.course?.title?.toLowerCase().includes(search.toLowerCase())
  )

  if (!authorized || loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0a1628]">Payments</h1>
        <p className="text-sm text-gray-500">Prophet Joshua — Revenue & Payment Management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#0a1628] to-[#1a3a5c] rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-[#c9a227]" />
            <p className="text-xs text-gray-300">Total Revenue</p>
          </div>
          <p className="text-2xl font-bold text-[#c9a227]">${totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-[#0a1628] to-[#1a3a5c] rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <p className="text-xs text-gray-300">This Month</p>
          </div>
          <p className="text-2xl font-bold text-green-400">${monthlyRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-[#0a1628] to-[#1a3a5c] rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-blue-400" />
            <p className="text-xs text-gray-300">Total Payments</p>
          </div>
          <p className="text-2xl font-bold text-blue-400">{payments.length}</p>
        </div>
        <div className="bg-gradient-to-br from-[#0a1628] to-[#1a3a5c] rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <p className="text-xs text-gray-300">Pending/Failed</p>
          </div>
          <p className="text-2xl font-bold text-red-400">
            {payments.filter((p) => p.status !== 'completed').length}
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search payments..." className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CreditCard className="w-12 h-12 mx-auto mb-3" />
              <p>No payments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-gray-500">
                    <th className="p-4 font-medium">Student</th>
                    <th className="p-4 font-medium">Course</th>
                    <th className="p-4 font-medium">Amount</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Type</th>
                    <th className="p-4 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#0a1628] text-[#c9a227] flex items-center justify-center text-xs font-bold">
                            {payment.user?.full_name?.charAt(0) || '?'}
                          </div>
                          <span className="font-medium text-[#0a1628]">{payment.user?.full_name || payment.user?.email}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600">{payment.course?.title || '—'}</td>
                      <td className="p-4 font-semibold text-[#0a1628]">${parseFloat(payment.amount).toFixed(2)}</td>
                      <td className="p-4">
                        <Badge className={`text-[10px] ${
                          payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                          payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          payment.status === 'refunded' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        }`}>{payment.status}</Badge>
                      </td>
                      <td className="p-4 text-gray-500 capitalize text-xs">{payment.payment_type?.replace('_', ' ') || '—'}</td>
                      <td className="p-4 text-xs text-gray-500">{new Date(payment.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
