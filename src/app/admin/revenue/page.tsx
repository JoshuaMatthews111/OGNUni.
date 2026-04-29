'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, CreditCard, Users } from 'lucide-react'
import { toast } from 'sonner'

interface RevenueData {
  totalRevenue: number
  courseRevenue: number
  membershipRevenue: number
  mentoringRevenue: number
  recentTransactions: Transaction[]
}

interface Transaction {
  id: string
  amount: number
  type: string
  created_at: string
  user: {
    full_name: string | null
    email: string
  }
  course?: {
    title: string
  }
}

export default function AdminRevenuePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [revenueData, setRevenueData] = useState<RevenueData>({
    totalRevenue: 0,
    courseRevenue: 0,
    membershipRevenue: 0,
    mentoringRevenue: 0,
    recentTransactions: []
  })

  useEffect(() => {
    loadRevenueData()
  }, [])

  const loadRevenueData = async () => {
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`
        *,
        user:user_id(full_name, email),
        course:course_id(title, price)
      `)
      .in('enrollment_type', ['purchase', 'membership'])
      .order('enrolled_at', { ascending: false })

    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')

    let courseRevenue = 0
    let membershipRevenue = 0
    let mentoringRevenue = 0

    const transactions: Transaction[] = []

    if (enrollments) {
      enrollments.forEach((enrollment) => {
        const price = enrollment.course?.price || 0
        if (enrollment.enrollment_type === 'purchase') {
          courseRevenue += Number(price)
          transactions.push({
            id: enrollment.id,
            amount: Number(price),
            type: 'Course Purchase',
            created_at: enrollment.enrolled_at,
            user: enrollment.user,
            course: enrollment.course
          })
        } else if (enrollment.enrollment_type === 'membership') {
          membershipRevenue += Number(price)
        }
      })
    }

    if (subscriptions) {
      subscriptions.forEach((sub) => {
        if (sub.type === 'membership') {
          membershipRevenue += 29.99
        } else if (sub.type === 'mentoring') {
          mentoringRevenue += 99.99
        }
      })
    }

    const totalRevenue = courseRevenue + membershipRevenue + mentoringRevenue

    setRevenueData({
      totalRevenue,
      courseRevenue,
      membershipRevenue,
      mentoringRevenue,
      recentTransactions: transactions.slice(0, 10)
    })
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">Loading revenue data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-[#2a2e35]">Revenue Analytics</h1>
        <p className="text-gray-600 mt-1">Track platform revenue and transactions</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-[#003d82]">
                  ${revenueData.totalRevenue.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Course Sales</p>
                <p className="text-3xl font-bold text-green-600">
                  ${revenueData.courseRevenue.toFixed(2)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Membership</p>
                <p className="text-3xl font-bold text-blue-600">
                  ${revenueData.membershipRevenue.toFixed(2)}
                </p>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Mentoring</p>
                <p className="text-3xl font-bold text-purple-600">
                  ${revenueData.mentoringRevenue.toFixed(2)}
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueData.recentTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              No transactions yet
            </div>
          ) : (
            <div className="space-y-3">
              {revenueData.recentTransactions.map((transaction) => (
                <Card key={transaction.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">
                            {transaction.course?.title || 'Subscription'}
                          </h3>
                          <Badge className="bg-green-100 text-green-700">
                            {transaction.type}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">
                            {transaction.user.full_name || transaction.user.email}
                          </span>
                          {' • '}
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-[#003d82]">
                        ${transaction.amount.toFixed(2)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Course Sales</span>
                <span className="text-sm text-gray-600">
                  {revenueData.totalRevenue > 0
                    ? ((revenueData.courseRevenue / revenueData.totalRevenue) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${revenueData.totalRevenue > 0
                      ? (revenueData.courseRevenue / revenueData.totalRevenue) * 100
                      : 0}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Membership</span>
                <span className="text-sm text-gray-600">
                  {revenueData.totalRevenue > 0
                    ? ((revenueData.membershipRevenue / revenueData.totalRevenue) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${revenueData.totalRevenue > 0
                      ? (revenueData.membershipRevenue / revenueData.totalRevenue) * 100
                      : 0}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Mentoring</span>
                <span className="text-sm text-gray-600">
                  {revenueData.totalRevenue > 0
                    ? ((revenueData.mentoringRevenue / revenueData.totalRevenue) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{
                    width: `${revenueData.totalRevenue > 0
                      ? (revenueData.mentoringRevenue / revenueData.totalRevenue) * 100
                      : 0}%`
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
