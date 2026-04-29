'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Users,
  BookOpen,
  GraduationCap,
  DollarSign,
  TrendingUp,
  Calendar,
  FileCheck,
  MessageSquare,
  Award,
  Settings,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  ClipboardList,
  FileText,
  Megaphone,
} from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCourses: 0,
    totalLessons: 0,
    activeEnrollments: 0,
    certificates: 0,
    pendingReviews: 0,
  })
  const [recentStudents, setRecentStudents] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    const [students, courses, lessons, enrollments, certs] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('courses').select('*', { count: 'exact', head: true }),
      supabase.from('lessons').select('*', { count: 'exact', head: true }),
      supabase.from('enrollments').select('*', { count: 'exact', head: true }),
      supabase.from('certificates').select('*', { count: 'exact', head: true }),
    ])

    setStats({
      totalStudents: students.count || 0,
      totalCourses: courses.count || 0,
      totalLessons: lessons.count || 0,
      activeEnrollments: enrollments.count || 0,
      certificates: certs.count || 0,
      pendingReviews: 0,
    })

    const { data: recentProfiles } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    setRecentStudents(recentProfiles || [])

    const { data: recentEnrollments } = await supabase
      .from('enrollments')
      .select('*, user:user_id(full_name, email), course:course_id(title)')
      .order('enrolled_at', { ascending: false })
      .limit(5)
    setRecentActivity(recentEnrollments || [])

    setLoading(false)
  }

  const statCards = [
    { title: 'Total Students', value: stats.totalStudents, icon: Users, gradient: 'from-[#0a1628] to-[#1a3a5c]', iconBg: 'bg-blue-500/20' },
    { title: 'Active Courses', value: stats.totalCourses, icon: BookOpen, gradient: 'from-[#0a1628] to-[#1a3a5c]', iconBg: 'bg-green-500/20' },
    { title: 'Lessons Published', value: stats.totalLessons, icon: FileText, gradient: 'from-[#0a1628] to-[#1a3a5c]', iconBg: 'bg-purple-500/20' },
    { title: 'Enrollments', value: stats.activeEnrollments, icon: TrendingUp, gradient: 'from-[#0a1628] to-[#1a3a5c]', iconBg: 'bg-orange-500/20' },
    { title: 'Certificates Issued', value: stats.certificates, icon: Award, gradient: 'from-[#0a1628] to-[#1a3a5c]', iconBg: 'bg-yellow-500/20' },
    { title: 'Pending Reviews', value: stats.pendingReviews, icon: ClipboardList, gradient: 'from-[#0a1628] to-[#1a3a5c]', iconBg: 'bg-red-500/20' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.title} className={`bg-gradient-to-br ${stat.gradient} rounded-xl p-4 text-white relative overflow-hidden`}>
              <div className="absolute top-2 right-2">
                <div className={`${stat.iconBg} rounded-full p-2`}>
                  <Icon className="w-4 h-4 text-white/80" />
                </div>
              </div>
              <p className="text-xs text-gray-300 mb-1">{stat.title}</p>
              <p className="text-2xl font-bold text-[#c9a227]">{stat.value.toLocaleString()}</p>
            </div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Student Activity - 2 col span */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-[#0a1628]">Recent Student Activity</CardTitle>
            <Link href="/admin/enrollments" className="text-xs text-[#c9a227] hover:underline">View All</Link>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No recent activity</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 font-medium">Student</th>
                      <th className="pb-2 font-medium">Course</th>
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recentActivity.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#0a1628] flex items-center justify-center text-[#c9a227] text-xs font-bold">
                              {item.user?.full_name?.charAt(0) || '?'}
                            </div>
                            <span className="font-medium text-[#0a1628]">{item.user?.full_name || item.user?.email}</span>
                          </div>
                        </td>
                        <td className="py-3 text-gray-600">{item.course?.title}</td>
                        <td className="py-3 text-gray-500 text-xs">{new Date(item.enrolled_at).toLocaleDateString()}</td>
                        <td className="py-3">
                          {item.completed_at ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              <CheckCircle className="w-3 h-3" /> Completed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" /> Active
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Registrations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-[#0a1628]">Recent Registrations</CardTitle>
            <Link href="/admin/users" className="text-xs text-[#c9a227] hover:underline">View All</Link>
          </CardHeader>
          <CardContent>
            {recentStudents.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No registrations yet</p>
            ) : (
              <div className="space-y-3">
                {recentStudents.map((student: any) => (
                  <div key={student.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0a1628] flex items-center justify-center text-[#c9a227] font-bold text-xs">
                      {student.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0a1628] truncate">{student.full_name || 'New User'}</p>
                      <p className="text-xs text-gray-400">{new Date(student.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-[#0a1628]">Pending Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Tests Awaiting Review', count: 0, icon: ClipboardList, href: '/admin/quizzes' },
                { label: 'Questions Awaiting Reply', count: 0, icon: MessageSquare, href: '/admin/comments' },
                { label: 'Certificate Approvals', count: 0, icon: Award, href: '/admin/certificates' },
                { label: 'Course Submissions', count: 0, icon: BookOpen, href: '/admin/courses' },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <Link key={item.label} href={item.href} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{item.label}</span>
                    </div>
                    <span className="bg-[#0a1628] text-[#c9a227] text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center">
                      {item.count}
                    </span>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* System Announcements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-[#0a1628]">System Announcements</CardTitle>
            <Link href="/admin/community/new" className="text-xs text-[#c9a227] hover:underline">View All</Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-start gap-2">
                  <Megaphone className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Welcome to OGN University Admin</p>
                    <p className="text-xs text-blue-700 mt-0.5">Create your first course to get started.</p>
                    <p className="text-[10px] text-blue-500 mt-1">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              <div className="text-center py-4">
                <Link href="/admin/courses/new">
                  <Button className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold">
                    Create Your First Course
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
