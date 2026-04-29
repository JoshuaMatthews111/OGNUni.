'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  ChevronRight,
  ChevronLeft,
  Lock,
  CheckCircle,
  Circle,
  PlayCircle,
  FileText,
  HelpCircle,
  MessageSquare,
  Send,
  BookOpen,
  Youtube,
  ArrowLeft,
  Menu,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { youtubeEmbedUrl } from '@/lib/constants'
import Image from 'next/image'
import Link from 'next/link'

export default function CoursePlayer() {
  const params = useParams()
  const router = useRouter()
  const [course, setCourse] = useState<any>(null)
  const [modules, setModules] = useState<any[]>([])
  const [currentLesson, setCurrentLesson] = useState<any>(null)
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [user, setUser] = useState<any>(null)
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({})
  const [quizSubmitting, setQuizSubmitting] = useState(false)
  const [quizResult, setQuizResult] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'notes' | 'discussion' | 'quiz'>('notes')

  const supabase = createClient()

  useEffect(() => { loadCourse() }, [params.slug])
  useEffect(() => {
    if (currentLesson) {
      loadComments(currentLesson.id)
      loadQuizzes(currentLesson.id)
    }
  }, [currentLesson?.id])

  const loadCourse = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/'); return }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
    setUser(profile)

    const { data: courseData } = await supabase
      .from('courses')
      .select('*, instructor:instructor_id(id, full_name)')
      .eq('slug', params.slug)
      .single()

    if (!courseData) { toast.error('Course not found'); router.push('/courses'); return }
    setCourse(courseData)

    const { data: enrollmentData } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', authUser.id)
      .eq('course_id', courseData.id)
      .single()

    if (!enrollmentData) { toast.error('Not enrolled'); router.push(`/courses/${params.slug}`); return }
    setEnrollmentId(enrollmentData.id)

    const { data: modulesData } = await supabase
      .from('modules')
      .select('*, lessons(*)')
      .eq('course_id', courseData.id)
      .order('order_index', { ascending: true })

    if (modulesData) {
      const modulesWithUnlock = modulesData.map((mod: any) => {
        const enrollDate = new Date(enrollmentData.enrolled_at)
        const unlockDate = new Date(enrollDate)
        unlockDate.setDate(unlockDate.getDate() + (mod.drip_delay_days || 0))
        return {
          ...mod,
          unlock_date: unlockDate,
          is_unlocked: new Date() >= unlockDate,
          lessons: (mod.lessons || []).sort((a: any, b: any) => a.order_index - b.order_index),
        }
      })

      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson_id, is_completed')
        .eq('user_id', authUser.id)
        .eq('enrollment_id', enrollmentData.id)

      const done = new Set(progressData?.filter((p) => p.is_completed).map((p) => p.lesson_id) || [])

      const modulesWithProgress = modulesWithUnlock.map((mod: any) => ({
        ...mod,
        lessons: mod.lessons.map((l: any) => ({ ...l, is_completed: done.has(l.id) })),
      }))

      setModules(modulesWithProgress)

      let picked = false
      for (const mod of modulesWithProgress) {
        if (mod.is_unlocked) {
          const inc = mod.lessons.find((l: any) => !l.is_completed)
          if (inc) { setCurrentLesson(inc); picked = true; break }
        }
      }
      if (!picked && modulesWithProgress[0]?.is_unlocked && modulesWithProgress[0].lessons[0]) {
        setCurrentLesson(modulesWithProgress[0].lessons[0])
      }
    }

    const { data: prog } = await supabase.rpc('get_course_completion', { p_user_id: authUser.id, p_course_id: courseData.id })
    setProgress(prog || 0)
    setLoading(false)
  }

  const loadComments = async (lessonId: string) => {
    const { data } = await supabase
      .from('lesson_comments')
      .select('*, user:user_id(full_name, role)')
      .eq('lesson_id', lessonId)
      .eq('status', 'approved')
      .order('created_at', { ascending: true })
    setComments(data || [])
  }

  const loadQuizzes = async (lessonId: string) => {
    const { data } = await supabase
      .from('quizzes')
      .select('*, questions:quiz_questions(*)')
      .eq('lesson_id', lessonId)
      .eq('is_published', true)
    setQuizzes(data || [])
    setQuizResult(null)
    setQuizAnswers({})
  }

  const submitComment = async () => {
    if (!user || !currentLesson || !newComment.trim()) return
    const { error } = await supabase.from('lesson_comments').insert({
      lesson_id: currentLesson.id,
      user_id: user.id,
      content: newComment,
      status: 'approved',
    })
    if (error) toast.error('Failed to post')
    else { toast.success('Comment posted!'); setNewComment(''); loadComments(currentLesson.id) }
  }

  const markLessonComplete = async (lessonId: string) => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser || !enrollmentId) return

    const { error } = await supabase.from('lesson_progress').upsert({
      user_id: authUser.id,
      lesson_id: lessonId,
      enrollment_id: enrollmentId,
      is_completed: true,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,lesson_id' })

    if (!error) {
      toast.success('Lesson completed!')
      await loadCourse()
      if (course) {
        const { data: prog } = await supabase.rpc('get_course_completion', { p_user_id: authUser.id, p_course_id: course.id })
        if (prog === 100) {
          toast.success('Course completed! Generating certificate...', { duration: 5000 })
          await fetch('/api/certificates/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enrollmentId }),
          })
        }
      }
    }
  }

  const submitQuiz = async (quiz: any) => {
    if (!user) return
    setQuizSubmitting(true)

    const questions = quiz.questions || []
    let score = 0
    let total = 0

    questions.forEach((q: any) => {
      if (q.question_type === 'multiple_choice') {
        total += q.points || 1
        if (quizAnswers[q.id] === q.correct_answer) score += q.points || 1
      } else {
        total += q.points || 1
      }
    })

    const pct = total > 0 ? Math.round((score / total) * 100) : 0
    const passed = pct >= (quiz.passing_score || 70)

    const { error } = await supabase.from('quiz_attempts').insert({
      quiz_id: quiz.id,
      user_id: user.id,
      score: pct,
      passed,
      answers: quizAnswers,
      completed_at: new Date().toISOString(),
    })

    setQuizResult({ score: pct, passed, total: questions.length })
    setQuizSubmitting(false)

    if (passed && currentLesson) {
      toast.success(`Quiz passed with ${pct}%!`)
      markLessonComplete(currentLesson.id)
    } else if (!passed) {
      toast.error(`Score: ${pct}%. Need ${quiz.passing_score}% to pass.`)
    }
  }

  const goToNextLesson = () => {
    if (!currentLesson) return
    let found = false
    for (const mod of modules) {
      for (const l of mod.lessons) {
        if (found && mod.is_unlocked) { setCurrentLesson(l); return }
        if (l.id === currentLesson.id) found = true
      }
    }
  }

  const goToPreviousLesson = () => {
    if (!currentLesson) return
    const all: any[] = []
    modules.forEach((m) => { if (m.is_unlocked) all.push(...m.lessons) })
    const idx = all.findIndex((l) => l.id === currentLesson.id)
    if (idx > 0) setCurrentLesson(all[idx - 1])
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1628]">
        <div className="text-center">
          <Image src="/assets/ogn-logo-small.png" alt="OGN" width={80} height={64} className="mx-auto mb-4 object-contain" />
          <div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#c9a227] text-sm">Loading course...</p>
        </div>
      </div>
    )
  }

  if (!course || !currentLesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card><CardContent className="p-12 text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold mb-4">No lessons available</h2>
          <Link href="/dashboard"><Button className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628]">Back to Dashboard</Button></Link>
        </CardContent></Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* Top Bar */}
      <div className="bg-[#0a1628] text-white sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-[#1a3a5c] rounded">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-[#c9a227] flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Link>
            <span className="text-gray-500">|</span>
            <div>
              <h1 className="text-sm font-semibold">{course.title}</h1>
              <p className="text-[10px] text-gray-400">{course.instructor?.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#c9a227] font-semibold">{progress}%</span>
            <div className="w-24 h-1.5 bg-[#1a3a5c] rounded-full overflow-hidden">
              <div className="h-full bg-[#c9a227] rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} bg-white border-r transition-all duration-300 sticky top-[52px] h-[calc(100vh-52px)] overflow-y-auto overflow-x-hidden shrink-0`}>
          {sidebarOpen && (
            <div className="p-4">
              <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">COURSE CONTENT</p>
              {modules.map((mod) => (
                <div key={mod.id} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    {mod.is_unlocked ? <CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> : <Lock className="w-4 h-4 text-gray-400 shrink-0" />}
                    <h3 className="text-sm font-medium text-[#0a1628]">{mod.title}</h3>
                  </div>
                  {mod.is_unlocked && (
                    <div className="ml-6 space-y-0.5">
                      {mod.lessons.map((lesson: any) => (
                        <button
                          key={lesson.id}
                          onClick={() => setCurrentLesson(lesson)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-all ${
                            currentLesson.id === lesson.id ? 'bg-[#0a1628] text-[#c9a227] font-semibold' : lesson.is_completed ? 'text-green-700 hover:bg-green-50' : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {lesson.is_completed ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <Circle className="w-3.5 h-3.5 shrink-0" />}
                          <span className="flex-1 truncate">{lesson.title}</span>
                          {lesson.youtube_embed_id && <Youtube className="w-3.5 h-3.5 shrink-0 text-red-500" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-4 lg:p-8 space-y-6">
          {/* Video / Content */}
          <Card>
            <CardContent className="p-0">
              {currentLesson.youtube_embed_id && (
                <div className="aspect-video bg-black rounded-t-lg overflow-hidden">
                  <iframe
                    src={youtubeEmbedUrl(currentLesson.youtube_embed_id)}
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    title={currentLesson.title}
                  />
                </div>
              )}

              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#0a1628]">{currentLesson.title}</h2>
                    {currentLesson.description && <p className="text-sm text-gray-500 mt-1">{currentLesson.description}</p>}
                    {currentLesson.scripture_references && (
                      <p className="text-xs text-[#c9a227] mt-1">📖 {currentLesson.scripture_references}</p>
                    )}
                  </div>
                  {currentLesson.is_completed ? (
                    <Badge className="bg-green-600 text-white"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>
                  ) : (
                    <Button onClick={() => markLessonComplete(currentLesson.id)} className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold">
                      <CheckCircle className="w-4 h-4 mr-2" /> Mark Complete
                    </Button>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex justify-between pt-4 border-t">
                  <Button variant="outline" onClick={goToPreviousLesson} disabled={modules[0]?.lessons[0]?.id === currentLesson.id}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                  </Button>
                  <Button onClick={goToNextLesson} className="bg-[#0a1628] text-white hover:bg-[#1a3a5c]">
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs: Notes | Discussion | Quiz */}
          <div className="flex gap-1 bg-white rounded-lg p-1 border">
            {['notes', 'discussion', 'quiz'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === tab ? 'bg-[#0a1628] text-[#c9a227]' : 'text-gray-500 hover:bg-gray-100'}`}>
                {tab === 'notes' ? '📝 Notes' : tab === 'discussion' ? '💬 Discussion' : '📋 Quiz'}
              </button>
            ))}
          </div>

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <Card>
              <CardContent className="p-6">
                {currentLesson.lesson_notes ? (
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap">{currentLesson.lesson_notes}</div>
                ) : (
                  <p className="text-gray-400 text-center py-8">No lesson notes available.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Discussion Tab */}
          {activeTab === 'discussion' && (
            <Card>
              <CardHeader><CardTitle className="text-base text-[#0a1628]">Lesson Discussion</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4 mb-4 max-h-[400px] overflow-y-auto">
                  {comments.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No comments yet. Start the conversation!</p>
                  ) : comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#0a1628] text-[#c9a227] flex items-center justify-center text-xs font-bold shrink-0">
                        {c.user?.full_name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#0a1628]">{c.user?.full_name}</span>
                          <Badge variant="outline" className="text-[9px]">{c.user?.role}</Badge>
                          <span className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Ask a question or leave a comment..." className="flex-1" onKeyDown={(e) => e.key === 'Enter' && submitComment()} />
                  <Button className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628]" onClick={submitComment}><Send className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quiz Tab */}
          {activeTab === 'quiz' && (
            <Card>
              <CardHeader><CardTitle className="text-base text-[#0a1628]">Lesson Quiz</CardTitle></CardHeader>
              <CardContent>
                {quizzes.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No quiz for this lesson.</p>
                ) : quizzes.map((quiz) => (
                  <div key={quiz.id} className="space-y-4">
                    <p className="text-sm text-gray-600">{quiz.description} (Pass: {quiz.passing_score}%)</p>
                    {(quiz.questions || []).sort((a: any, b: any) => a.order_index - b.order_index).map((q: any, qi: number) => (
                      <div key={q.id} className="p-4 border rounded-lg">
                        <p className="text-sm font-medium mb-2">
                          <span className="bg-[#0a1628] text-[#c9a227] text-xs rounded-full w-5 h-5 inline-flex items-center justify-center mr-2">{qi + 1}</span>
                          {q.question_text}
                        </p>
                        {q.question_type === 'multiple_choice' && q.options?.map((opt: string, oi: number) => (
                          <label key={oi} className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm ${quizAnswers[q.id] === opt ? 'bg-[#c9a227]/10 border border-[#c9a227]' : 'hover:bg-gray-50'}`}>
                            <input type="radio" name={q.id} value={opt} checked={quizAnswers[q.id] === opt} onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: opt })} className="w-4 h-4" />
                            {opt}
                          </label>
                        ))}
                        {(q.question_type === 'short_answer' || q.question_type === 'spiritual_application') && (
                          <textarea value={quizAnswers[q.id] || ''} onChange={(e) => setQuizAnswers({ ...quizAnswers, [q.id]: e.target.value })} className="w-full mt-2 px-3 py-2 border rounded-md text-sm min-h-[60px]" placeholder="Type your answer..." />
                        )}
                      </div>
                    ))}

                    {quizResult ? (
                      <div className={`p-4 rounded-lg text-center ${quizResult.passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <p className="text-lg font-bold">{quizResult.passed ? '🎉 Passed!' : '❌ Not Passed'}</p>
                        <p className="text-sm">Score: {quizResult.score}%</p>
                      </div>
                    ) : (
                      <Button onClick={() => submitQuiz(quiz)} disabled={quizSubmitting} className="w-full bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold">
                        {quizSubmitting ? 'Submitting...' : 'Submit Quiz'}
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}
