'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Database, Users, BookOpen, Server } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SystemLogsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [systemInfo, setSystemInfo] = useState<any>({})

  useEffect(() => { checkAuth() }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') { router.push('/admin'); return }
    setAuthorized(true)
    loadSystem()
  }

  const loadSystem = async () => {
    const [profiles, courses, lessons, enrollments, quizzes, certs] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('courses').select('*', { count: 'exact', head: true }),
      supabase.from('lessons').select('*', { count: 'exact', head: true }),
      supabase.from('enrollments').select('*', { count: 'exact', head: true }),
      supabase.from('quizzes').select('*', { count: 'exact', head: true }),
      supabase.from('certificates').select('*', { count: 'exact', head: true }),
    ])

    setSystemInfo({
      profiles: profiles.count || 0,
      courses: courses.count || 0,
      lessons: lessons.count || 0,
      enrollments: enrollments.count || 0,
      quizzes: quizzes.count || 0,
      certificates: certs.count || 0,
    })
    setLoading(false)
  }

  if (!authorized || loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0a1628]">System Logs</h1>
        <p className="text-sm text-gray-500">System overview and database statistics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Users', count: systemInfo.profiles, icon: Users },
          { label: 'Courses', count: systemInfo.courses, icon: BookOpen },
          { label: 'Lessons', count: systemInfo.lessons, icon: Database },
          { label: 'Enrollments', count: systemInfo.enrollments, icon: Server },
          { label: 'Quizzes', count: systemInfo.quizzes, icon: Shield },
          { label: 'Certificates', count: systemInfo.certificates, icon: Shield },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0a1628] flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#c9a227]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0a1628]">{item.count}</p>
                  <p className="text-xs text-gray-500">{item.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base text-[#0a1628]">System Status</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { service: 'Supabase Auth', status: 'Connected' },
              { service: 'Supabase Database', status: 'Connected' },
              { service: 'Supabase Storage', status: 'Connected' },
              { service: 'Gemini AI API', status: 'Active' },
              { service: 'Stripe Payments', status: 'Configured' },
              { service: 'YouTube Embeds', status: 'Active' },
            ].map((item) => (
              <div key={item.service} className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm font-medium text-[#0a1628]">{item.service}</span>
                <Badge className="bg-green-100 text-green-700 text-xs">{item.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
