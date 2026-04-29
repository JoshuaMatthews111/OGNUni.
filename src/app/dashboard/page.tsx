'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  BookOpen, Award, TrendingUp, MessageSquare, Play, Eye, ClipboardList,
  Download, Lock, GraduationCap, Search, Bell, Calendar, CheckCircle
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ROLE_LABELS, COURSE_CATEGORIES } from '@/lib/constants'

export default function StudentDashboard() {
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])
  const [quizAttempts, setQuizAttempts] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/'); return }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
    setUser(profile)

    const { data: enrollmentData } = await supabase
      .from('enrollments')
      .select('*, course:course_id(id, title, slug, description, thumbnail_url, category, instructor:instructor_id(full_name))')
      .eq('user_id', authUser.id)
      .order('enrolled_at', { ascending: false })

    if (enrollmentData) {
      const withProgress = await Promise.all(
        enrollmentData.map(async (e: any) => {
          const { data } = await supabase.rpc('get_course_completion', { p_user_id: authUser.id, p_course_id: e.course.id })
          return { ...e, progress: data || 0 }
        })
      )
      setEnrollments(withProgress)
    }

    const { data: certData } = await supabase
      .from('certificates')
      .select('*, course:course_id(title)')
      .eq('user_id', authUser.id)
      .order('issued_at', { ascending: false })
    setCertificates(certData || [])

    const { data: quizData } = await supabase
      .from('quiz_attempts')
      .select('*, quiz:quiz_id(title, lesson:lesson_id(title))')
      .eq('user_id', authUser.id)
      .order('completed_at', { ascending: false })
      .limit(5)
    setQuizAttempts(quizData || [])

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1628]">
        <div className="text-center">
          <Image src="/assets/ogn-logo-small.png" alt="OGN" width={100} height={80} className="mx-auto mb-4 object-contain" />
          <div className="w-12 h-12 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#c9a227]">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  const inProgress = enrollments.filter((e) => !e.completed_at && e.progress > 0)
  const completed = enrollments.filter((e) => e.completed_at)
  const continueLesson = inProgress[0]

  const sidebarLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: BookOpen, active: true },
    { href: '/courses', label: 'My Courses', icon: GraduationCap },
    { href: '/community', label: 'Discussions', icon: MessageSquare },
    { href: '/certificates', label: 'Certificates', icon: Award },
    { href: '/messages', label: 'Messages', icon: MessageSquare },
  ]

  const learningPath = COURSE_CATEGORIES.map((cat) => {
    const courseInCat = enrollments.find((e) => e.course?.category === cat)
    return { category: cat, progress: courseInCat?.progress || 0 }
  })

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <div className="flex">
        {/* Student Sidebar */}
        <aside className={`fixed lg:sticky top-0 left-0 z-50 w-[240px] h-screen overflow-y-auto bg-[#0a1628] text-white transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-4 flex flex-col items-center border-b border-[#1a3a5c]">
            <Image src="/assets/ogn-logo-small.png" alt="OGN" width={70} height={56} className="mb-2 object-contain" />
            <h2 className="text-xs font-bold text-[#c9a227] tracking-wide">OGN UNIVERSITY</h2>
            <p className="text-[9px] text-gray-400 tracking-widest">OVERCOMERS GLOBAL NETWORK</p>
          </div>

          <nav className="px-2 mt-4 space-y-1">
            {sidebarLinks.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${
                    item.active ? 'bg-[#c9a227] text-[#0a1628] font-semibold' : 'text-gray-300 hover:bg-[#1a3a5c]'
                  }`}>
                  <Icon className="w-[18px] h-[18px]" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Learning Path */}
          <div className="px-4 mt-6">
            <p className="text-[11px] text-gray-500 font-semibold tracking-wider mb-2 px-1">MY LEARNING PATH</p>
            {learningPath.slice(0, 5).map((item) => (
              <div key={item.category} className="flex items-center gap-2 px-2 py-1.5">
                <div className={`w-8 h-5 rounded text-[9px] font-bold flex items-center justify-center ${item.progress > 0 ? 'bg-[#c9a227]/20 text-[#c9a227]' : 'bg-gray-700 text-gray-500'}`}>
                  {item.progress}%
                </div>
                <span className="text-xs text-gray-400 truncate">{item.category}</span>
              </div>
            ))}
          </div>

          {/* Premium banner */}
          <div className="mx-4 mt-6 mb-20 p-3 bg-gradient-to-br from-[#c9a227]/20 to-[#c9a227]/5 border border-[#c9a227]/30 rounded-lg">
            <p className="text-xs font-bold text-[#c9a227] mb-1">OGN PREMIUM</p>
            <p className="text-[10px] text-gray-400 mb-2">Get full access to all premium courses and ministry resources.</p>
            <Link href="/courses">
              <Button className="w-full bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] text-xs h-8 font-semibold">Go Premium</Button>
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Top Bar */}
          <header className="sticky top-0 z-30 bg-white border-b px-4 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2">
                  <BookOpen className="w-5 h-5" />
                </button>
                <div className="hidden md:block relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input placeholder="Search for courses, lessons, documents..." className="w-80 pl-10 pr-4 py-2 bg-gray-50 border rounded-lg text-sm focus:ring-2 focus:ring-[#c9a227]/30" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="relative p-2 hover:bg-gray-100 rounded-lg">
                  <Bell className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#0a1628] text-[#c9a227] flex items-center justify-center text-xs font-bold">
                    {user?.full_name?.charAt(0) || 'S'}
                  </div>
                  <div className="hidden md:block">
                    <p className="text-sm font-semibold text-[#0a1628]">{user?.full_name}</p>
                    <p className="text-[10px] text-gray-500">{ROLE_LABELS[user?.role] || 'Student'}</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="p-4 lg:p-8 space-y-6">
            {/* Welcome + Quote */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[#0a1628]">Welcome back, {user?.full_name?.split(' ')[0]} 👋</h1>
                <p className="text-sm text-gray-500">Continue your spiritual and ministry training journey.</p>
              </div>
              <div className="bg-[#0a1628] text-white px-4 py-3 rounded-xl max-w-md">
                <p className="text-xs italic">&ldquo;Study to show yourself approved unto God, a workman that needeth not to be ashamed.&rdquo;</p>
                <p className="text-[10px] text-[#c9a227] mt-1">2 Timothy 2:15 (KJV)</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Courses Enrolled', value: enrollments.length, sub: 'Active Courses', icon: BookOpen, color: 'text-blue-600' },
                { label: 'Lessons Completed', value: enrollments.reduce((s, e) => s + Math.round(e.progress * 0.12), 0), sub: 'Keep going!', icon: CheckCircle, color: 'text-green-600' },
                { label: 'Certificates Earned', value: certificates.length, sub: 'View all certificates', icon: Award, color: 'text-[#c9a227]' },
                { label: 'Tests Pending', value: quizAttempts.filter((q) => !q.passed).length, sub: 'Finish your tests', icon: ClipboardList, color: 'text-purple-600' },
              ].map((stat) => {
                const Icon = stat.icon
                return (
                  <Card key={stat.label}>
                    <CardContent className="p-4 flex items-start justify-between">
                      <div>
                        <p className="text-2xl font-bold text-[#0a1628]">{stat.value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                        <p className="text-[10px] text-gray-400">{stat.sub}</p>
                      </div>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Continue Learning */}
            {continueLesson && (
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    <div className="w-full md:w-48 h-40 md:h-auto bg-gradient-to-br from-[#0a1628] to-[#1a3a5c] flex items-center justify-center p-4">
                      {continueLesson.course.thumbnail_url ? (
                        <img src={continueLesson.course.thumbnail_url} alt="" className="w-full h-full object-cover rounded" />
                      ) : (
                        <BookOpen className="w-16 h-16 text-[#c9a227]/50" />
                      )}
                    </div>
                    <div className="flex-1 p-6">
                      <h3 className="text-lg font-bold text-[#0a1628]">{continueLesson.course.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{continueLesson.course.description?.substring(0, 150)}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <div className="flex-1">
                          <Progress value={continueLesson.progress} className="h-2" />
                        </div>
                        <span className="text-sm font-semibold text-[#c9a227]">{continueLesson.progress}%</span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Link href={`/courses/${continueLesson.course.slug}/learn`}>
                          <Button className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold">
                            <Play className="w-4 h-4 mr-2" /> Resume Lesson
                          </Button>
                        </Link>
                        <Link href={`/courses/${continueLesson.course.slug}`}>
                          <Button variant="outline"><Eye className="w-4 h-4 mr-2" /> View Course</Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* My Courses */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#0a1628]">My Courses</h2>
                <Link href="/courses" className="text-xs text-[#c9a227] hover:underline">View All</Link>
              </div>
              {enrollments.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
                    <p className="text-gray-500 mb-6">Start your learning journey by enrolling in a course</p>
                    <Link href="/courses"><Button className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold">Browse Courses</Button></Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {enrollments.slice(0, 4).map((enrollment) => (
                    <Card key={enrollment.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="h-32 bg-gradient-to-br from-[#0a1628] to-[#1a3a5c] flex items-center justify-center relative">
                        {enrollment.course.thumbnail_url ? (
                          <img src={enrollment.course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <BookOpen className="w-10 h-10 text-[#c9a227]/40" />
                        )}
                        {!enrollment.course.is_free && enrollment.progress === 0 && (
                          <div className="absolute top-2 right-2"><Lock className="w-4 h-4 text-white/50" /></div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-sm text-[#0a1628] line-clamp-1">{enrollment.course.title}</h3>
                        <p className="text-xs text-gray-500">{enrollment.course.instructor?.full_name || 'Prophet Joshua Matthews'}</p>
                        <div className="mt-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-[#c9a227] rounded-full" style={{ width: `${enrollment.progress}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-[#0a1628]">{enrollment.progress}%</span>
                          </div>
                        </div>
                        <Link href={`/courses/${enrollment.course.slug}/learn`}>
                          <Button className={`w-full mt-3 text-xs h-8 ${enrollment.progress > 0 ? 'bg-[#0a1628] text-white hover:bg-[#1a3a5c]' : 'bg-[#c9a227] text-[#0a1628] hover:bg-[#b8941f]'}`}>
                            {enrollment.progress > 0 ? 'Continue' : 'Start Course'}
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Pending Tests */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-semibold text-[#0a1628]">Pending Tests</CardTitle>
                  <Link href="/courses" className="text-xs text-[#c9a227] hover:underline">View All</Link>
                </CardHeader>
                <CardContent>
                  {quizAttempts.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No pending tests</p>
                  ) : (
                    <div className="space-y-3">
                      {quizAttempts.map((attempt) => (
                        <div key={attempt.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <ClipboardList className="w-5 h-5 text-[#c9a227]" />
                            <div>
                              <p className="text-sm font-medium">{attempt.quiz?.title}</p>
                              <p className="text-xs text-gray-500">{attempt.quiz?.lesson?.title}</p>
                            </div>
                          </div>
                          <Badge className={attempt.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                            {attempt.score}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* My Certificates */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-semibold text-[#0a1628]">My Certificates</CardTitle>
                  <Link href="/certificates" className="text-xs text-[#c9a227] hover:underline">View All</Link>
                </CardHeader>
                <CardContent>
                  {certificates.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">Complete a course to earn certificates</p>
                  ) : (
                    <div className="space-y-3">
                      {certificates.map((cert) => (
                        <div key={cert.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Award className="w-5 h-5 text-[#c9a227]" />
                            <div>
                              <p className="text-sm font-medium">Certificate of Completion</p>
                              <p className="text-xs text-gray-500">{cert.course?.title} • {new Date(cert.issued_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          {cert.pdf_url && (
                            <a href={cert.pdf_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm"><Download className="w-4 h-4 text-[#c9a227]" /></Button>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>

          {/* Footer */}
          <footer className="border-t bg-white px-8 py-4 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <Image src="/assets/ogn-logo-small.png" alt="" width={20} height={16} className="object-contain" />
              <span className="font-semibold text-[#0a1628]">OGN UNIVERSITY</span>
              <span>•</span>
              <span className="text-[#c9a227]">Educate • Equip • Evolve</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">&copy; {new Date().getFullYear()} Overcomers Global Network University. All Rights Reserved.</p>
          </footer>
        </div>
      </div>
    </div>
  )
}
