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
  Music,
  Video,
  Download,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { youtubeEmbedUrl } from '@/lib/constants'
import { findOrCreateConversation, sendMessageWithMedia } from '@/lib/messaging'
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
  const [helpNote, setHelpNote] = useState('')
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [sendingHelp, setSendingHelp] = useState(false)

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

      <div className="flex relative">
        {/* Sidebar - mobile overlay */}
        {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}
        <aside className={`${sidebarOpen ? 'w-72 translate-x-0' : '-translate-x-full lg:translate-x-0'} fixed lg:sticky top-[52px] left-0 w-72 h-[calc(100vh-52px)] bg-white border-r transition-transform duration-300 overflow-y-auto overflow-x-hidden shrink-0 z-40 lg:z-auto`}>
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
                          {lesson.vimeo_url && <Video className="w-3.5 h-3.5 shrink-0 text-blue-500" />}
                          {lesson.audio_url && <Music className="w-3.5 h-3.5 shrink-0 text-green-500" />}
                          {lesson.pdf_url && <FileText className="w-3.5 h-3.5 shrink-0 text-orange-500" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 w-full max-w-full overflow-x-hidden p-3 sm:p-4 lg:p-8 space-y-4 sm:space-y-6">
          {/* Video / Content */}
          <Card>
            <CardContent className="p-0">
              {/* YouTube */}
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

              {/* Vimeo */}
              {currentLesson.vimeo_url && !currentLesson.youtube_embed_id && (
                <div className="aspect-video bg-black rounded-t-lg overflow-hidden">
                  <iframe
                    src={`https://player.vimeo.com/video/${currentLesson.vimeo_url.split('/').pop()}`}
                    className="w-full h-full"
                    allowFullScreen
                    allow="autoplay; fullscreen; picture-in-picture"
                    title={currentLesson.title}
                  />
                </div>
              )}

              {/* Audio Player - supports background playback on mobile */}
              {currentLesson.audio_url && (
                <div className="bg-gradient-to-r from-[#0a1628] to-[#1a3a5c] p-6 rounded-t-lg">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-[#c9a227]/20 flex items-center justify-center">
                      <Music className="w-8 h-8 text-[#c9a227]" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">{currentLesson.title}</p>
                      <p className="text-gray-400 text-xs">Audio lesson • Background playback enabled</p>
                    </div>
                  </div>
                  <audio
                    controls
                    className="w-full"
                    preload="metadata"
                    controlsList="nodownload"
                    style={{ filter: 'invert(1) hue-rotate(180deg)' }}
                  >
                    <source src={currentLesson.audio_url} />
                    Your browser does not support audio playback.
                  </audio>
                </div>
              )}

              {/* PDF Viewer */}
              {currentLesson.pdf_url && (
                <div className="border-b">
                  {currentLesson.pdf_url.endsWith('.pdf') ? (
                    <div>
                      <iframe
                        src={`${currentLesson.pdf_url}#toolbar=1&navpanes=1&scrollbar=1`}
                        className="w-full h-[70vh] min-h-[500px]"
                        title={`${currentLesson.title} - PDF`}
                      />
                      <div className="p-3 bg-gray-50 flex items-center justify-between">
                        <span className="text-xs text-gray-500 flex items-center gap-1"><FileText className="w-3 h-3" /> PDF Document</span>
                        <div className="flex gap-2">
                          <a href={currentLesson.pdf_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c9a227] hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Open in new tab</a>
                          <a href={currentLesson.pdf_url} download className="text-xs text-[#0a1628] hover:underline flex items-center gap-1"><Download className="w-3 h-3" /> Download</a>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-sm font-medium text-[#0a1628] mb-2">{currentLesson.title}</p>
                      <div className="flex gap-3 justify-center">
                        <a href={currentLesson.pdf_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm"><ExternalLink className="w-4 h-4 mr-1" /> View Document</Button>
                        </a>
                        <a href={currentLesson.pdf_url} download>
                          <Button size="sm" className="bg-[#0a1628] text-white"><Download className="w-4 h-4 mr-1" /> Download</Button>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-[#0a1628]">{currentLesson.title}</h2>
                    {currentLesson.description && <p className="text-sm text-gray-500 mt-1">{currentLesson.description}</p>}
                    {currentLesson.scripture_references && (
                      <p className="text-xs text-[#c9a227] mt-1">📖 {currentLesson.scripture_references}</p>
                    )}
                  </div>
                  {currentLesson.is_completed ? (
                    <Badge className="bg-green-600 text-white self-start"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>
                  ) : (
                    <Button onClick={() => markLessonComplete(currentLesson.id)} className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold w-full sm:w-auto" size="sm">
                      <CheckCircle className="w-4 h-4 mr-2" /> Mark Complete
                    </Button>
                  )}
                </div>

                {/* Message Instructor Button */}
                {course?.instructor?.id && (
                  <div className="mt-4 pt-4 border-t border-dashed">
                    {!showHelpModal ? (
                      <Button variant="outline" className="w-full border-[#c9a227] text-[#c9a227] hover:bg-[#c9a227]/10" onClick={() => setShowHelpModal(true)}>
                        <HelpCircle className="w-4 h-4 mr-2" /> Message Instructor for Help
                      </Button>
                    ) : (
                      <div className="bg-[#0a1628]/5 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-[#0a1628]">Ask your instructor for help</p>
                          <button onClick={() => setShowHelpModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="text-xs text-gray-500 bg-white rounded p-2 border">
                          <p><strong>Course:</strong> {course.title}</p>
                          <p><strong>Lesson:</strong> {currentLesson.title}</p>
                        </div>
                        <textarea
                          value={helpNote}
                          onChange={(e) => setHelpNote(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md text-sm min-h-[80px]"
                          placeholder="Describe what you need help with..."
                        />
                        <Button
                          disabled={sendingHelp || !helpNote.trim()}
                          className="w-full bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold"
                          onClick={async () => {
                            if (!user || !course?.instructor?.id) return
                            setSendingHelp(true)
                            const convId = await findOrCreateConversation(supabase, user.id, course.instructor.id, `Help: ${course.title}`)
                            if (convId) {
                              const content = `📚 **Help Request**\n\n**Course:** ${course.title}\n**Lesson:** ${currentLesson.title}${currentLesson.scripture_references ? `\n**Scripture:** ${currentLesson.scripture_references}` : ''}\n\n${helpNote.trim()}`
                              await sendMessageWithMedia(supabase, {
                                conversation_id: convId, sender_id: user.id,
                                content, message_type: 'help_request',
                              })
                              toast.success('Message sent to your instructor!')
                              setHelpNote('')
                              setShowHelpModal(false)
                            } else {
                              toast.error('Could not reach instructor')
                            }
                            setSendingHelp(false)
                          }}
                        >
                          <Send className="w-4 h-4 mr-2" /> {sendingHelp ? 'Sending...' : 'Send to Instructor'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

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
              <CardContent className="p-4 sm:p-6 md:p-8 lg:p-10">
                {currentLesson.lesson_notes ? (
                  <article className="max-w-2xl mx-auto">
                    <div className="prose prose-sm sm:prose-base max-w-none
                      prose-headings:text-[#0a1628] prose-headings:font-serif
                      prose-p:text-gray-700 prose-p:leading-relaxed prose-p:text-[15px] sm:prose-p:text-base
                      prose-li:text-gray-700 prose-li:leading-relaxed
                      prose-strong:text-[#0a1628]
                      whitespace-pre-wrap break-words
                      leading-[1.8] sm:leading-[1.9] tracking-[0.01em]
                      text-[15px] sm:text-base text-gray-700 font-[system-ui]"
                      style={{ wordSpacing: '0.05em' }}
                    >
                      {currentLesson.lesson_notes}
                    </div>
                  </article>
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-[#0a1628]">{c.user?.full_name}</span>
                          <Badge variant="outline" className="text-[9px]">{c.user?.role}</Badge>
                          <span className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
                          {/* Delete: own comment or admin/teacher */}
                          {(c.user_id === user?.id || ['super_admin', 'prophet', 'teacher'].includes(user?.role)) && (
                            <button onClick={async () => {
                              if (!confirm('Delete this comment?')) return
                              await supabase.from('lesson_comments').delete().eq('id', c.id)
                              toast.success('Comment deleted')
                              loadComments(currentLesson.id)
                            }} className="text-[10px] text-red-400 hover:text-red-600 ml-auto">Delete</button>
                          )}
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
              <CardHeader className="px-4 sm:px-6"><CardTitle className="text-base text-[#0a1628]">Lesson Quiz</CardTitle></CardHeader>
              <CardContent className="px-3 sm:px-6">
                {quizzes.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No quiz for this lesson.</p>
                ) : quizzes.map((quiz) => (
                  <div key={quiz.id} className="space-y-3 sm:space-y-4">
                    <p className="text-sm text-gray-600">{quiz.description} (Pass: {quiz.passing_score}%)</p>
                    {(quiz.questions || []).sort((a: any, b: any) => a.order_index - b.order_index).map((q: any, qi: number) => (
                      <div key={q.id} className="p-3 sm:p-4 border rounded-lg">
                        <p className="text-sm font-medium mb-3 leading-relaxed">
                          <span className="bg-[#0a1628] text-[#c9a227] text-xs rounded-full w-5 h-5 inline-flex items-center justify-center mr-2 shrink-0">{qi + 1}</span>
                          {q.question_text}
                        </p>
                        {q.question_type === 'multiple_choice' && q.options?.map((opt: string, oi: number) => (
                          <label key={oi} className={`flex items-start gap-3 p-2.5 sm:p-3 rounded-lg cursor-pointer text-sm mb-1.5 transition-all ${quizAnswers[q.id] === opt ? 'bg-[#c9a227]/10 border border-[#c9a227]' : 'hover:bg-gray-50 border border-transparent'}`}>
                            <input type="radio" name={q.id} value={opt} checked={quizAnswers[q.id] === opt} onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: opt })} className="w-4 h-4 mt-0.5 shrink-0" />
                            <span className="leading-relaxed">{opt}</span>
                          </label>
                        ))}
                        {(q.question_type === 'short_answer' || q.question_type === 'spiritual_application') && (
                          <textarea value={quizAnswers[q.id] || ''} onChange={(e) => setQuizAnswers({ ...quizAnswers, [q.id]: e.target.value })} className="w-full mt-2 px-3 py-2 border rounded-md text-sm min-h-[80px]" placeholder="Type your answer..." />
                        )}
                      </div>
                    ))}

                    {quizResult ? (
                      <div className={`p-4 rounded-lg text-center ${quizResult.passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <p className="text-lg font-bold">{quizResult.passed ? 'Passed!' : 'Not Passed'}</p>
                        <p className="text-sm">Score: {quizResult.score}%</p>
                      </div>
                    ) : (
                      <Button onClick={() => submitQuiz(quiz)} disabled={quizSubmitting} className="w-full bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold h-11">
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
