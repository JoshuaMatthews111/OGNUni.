'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen, Clock, Users, Award, PlayCircle, Lock, CheckCircle,
  ArrowLeft, Youtube, FileText, DollarSign
} from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import Link from 'next/link'

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [course, setCourse] = useState<any>(null)
  const [modules, setModules] = useState<any[]>([])
  const [enrollment, setEnrollment] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)

  useEffect(() => { loadCourse() }, [params.slug])

  const loadCourse = async () => {
    const { data: courseData } = await supabase
      .from('courses')
      .select('*, instructor:instructor_id(full_name)')
      .eq('slug', params.slug)
      .eq('status', 'published')
      .single()

    if (!courseData) { router.push('/courses'); return }
    setCourse(courseData)

    const { data: modulesData } = await supabase
      .from('modules')
      .select('*, lessons(id, title, order_index, youtube_embed_id)')
      .eq('course_id', courseData.id)
      .order('order_index', { ascending: true })
    setModules(modulesData || [])

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
      setUser(profile)

      const { data: enrollData } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('course_id', courseData.id)
        .single()
      setEnrollment(enrollData)
    }

    setLoading(false)
  }

  const handleEnroll = async () => {
    if (!user) { toast.error('Please sign in to enroll'); return }
    setEnrolling(true)

    if (course.is_free) {
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Enrolled successfully!')
        router.push(`/courses/${params.slug}/learn`)
      } else {
        toast.error(data.error || 'Enrollment failed')
      }
    } else {
      const res = await fetch('/api/checkout/course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Checkout failed')
      }
    }
    setEnrolling(false)
  }

  const totalLessons = modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1628]">
        <div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!course) return null

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* Hero */}
      <div className="bg-[#0a1628] text-white">
        <div className="container mx-auto px-6 py-8">
          <Link href="/courses" className="text-sm text-gray-400 hover:text-[#c9a227] flex items-center gap-1 mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Courses
          </Link>
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              {course.category && <Badge className="bg-[#c9a227] text-[#0a1628] mb-3">{course.category}</Badge>}
              <h1 className="text-3xl lg:text-4xl font-bold mb-3">{course.title}</h1>
              {course.subtitle && <p className="text-lg text-gray-300 mb-4">{course.subtitle}</p>}
              <p className="text-gray-400 mb-6">{course.description}</p>

              <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                <span className="flex items-center gap-1"><Users className="w-4 h-4 text-[#c9a227]" /> {course.instructor?.full_name || 'Prophet Joshua Matthews'}</span>
                <span className="flex items-center gap-1"><BookOpen className="w-4 h-4 text-[#c9a227]" /> {modules.length} modules</span>
                <span className="flex items-center gap-1"><PlayCircle className="w-4 h-4 text-[#c9a227]" /> {totalLessons} lessons</span>
                {course.estimated_hours && <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-[#c9a227]" /> {course.estimated_hours}h</span>}
              </div>
            </div>

            {/* Enrollment Card */}
            <div className="w-full lg:w-80 shrink-0">
              <Card className="bg-white text-[#0a1628]">
                <CardContent className="p-6">
                  {course.thumbnail_url && (
                    <img src={course.thumbnail_url} alt="" className="w-full h-40 object-cover rounded-lg mb-4" />
                  )}
                  
                  <div className="text-center mb-4">
                    {course.is_free ? (
                      <p className="text-3xl font-bold text-green-600">FREE</p>
                    ) : (
                      <p className="text-3xl font-bold text-[#0a1628]">${parseFloat(course.price || 0).toFixed(2)}</p>
                    )}
                  </div>

                  {enrollment ? (
                    <Link href={`/courses/${params.slug}/learn`}>
                      <Button className="w-full bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold h-12">
                        <PlayCircle className="w-5 h-5 mr-2" /> Continue Learning
                      </Button>
                    </Link>
                  ) : (
                    <Button onClick={handleEnroll} disabled={enrolling} className="w-full bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold h-12">
                      {enrolling ? 'Processing...' : course.is_free ? 'Enroll Now — Free' : `Enroll — $${parseFloat(course.price || 0).toFixed(2)}`}
                    </Button>
                  )}

                  <div className="mt-4 space-y-2 text-xs text-gray-500">
                    <p className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-600" /> Full lifetime access</p>
                    <p className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-600" /> Certificate of completion</p>
                    <p className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-600" /> Discussion & community access</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-3xl">
          {/* Long Description */}
          {course.long_description && (
            <Card className="mb-6">
              <CardHeader><CardTitle className="text-lg text-[#0a1628]">About This Course</CardTitle></CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">{course.long_description}</div>
              </CardContent>
            </Card>
          )}

          {/* Curriculum */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-[#0a1628]">Course Curriculum</CardTitle>
              <p className="text-sm text-gray-500">{modules.length} modules • {totalLessons} lessons</p>
            </CardHeader>
            <CardContent>
              {modules.length === 0 ? (
                <p className="text-gray-400 text-center py-6">Curriculum coming soon...</p>
              ) : (
                <div className="space-y-4">
                  {modules.map((mod, mi) => (
                    <div key={mod.id} className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#0a1628] text-[#c9a227] text-xs flex items-center justify-center font-bold">{mi + 1}</span>
                          <h3 className="font-semibold text-sm text-[#0a1628]">{mod.title}</h3>
                        </div>
                        <span className="text-xs text-gray-500">{mod.lessons?.length || 0} lessons</span>
                      </div>
                      <div className="divide-y">
                        {(mod.lessons || []).sort((a: any, b: any) => a.order_index - b.order_index).map((lesson: any) => (
                          <div key={lesson.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                            {enrollment ? (
                              <PlayCircle className="w-4 h-4 text-[#c9a227] shrink-0" />
                            ) : (
                              <Lock className="w-4 h-4 text-gray-300 shrink-0" />
                            )}
                            <span className="text-gray-700 flex-1">{lesson.title}</span>
                            {lesson.youtube_embed_id && <Youtube className="w-4 h-4 text-red-400 shrink-0" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
