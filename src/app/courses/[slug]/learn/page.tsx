'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  ChevronRight, ChevronLeft, Lock, CheckCircle, Circle, FileText,
  HelpCircle, Send, BookOpen, Youtube, ArrowLeft, Menu, X, Music,
  Video, Download, ExternalLink, Sun, Moon, Type,
  Maximize2, Minimize2, ChevronDown, MessageSquare,
} from 'lucide-react'
import { toast } from 'sonner'
import { youtubeEmbedUrl, isDirectVideoUrl, vimeoEmbedUrl } from '@/lib/constants'
import { findOrCreateConversation, sendMessageWithMedia } from '@/lib/messaging'
import Image from 'next/image'
import Link from 'next/link'
import { useReadingPrefs, ReadingControls, ReadingContent } from '@/components/reading-experience'

export default function CoursePlayer() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [course, setCourse] = useState<any>(null)
  const [modules, setModules] = useState<any[]>([])
  const [currentLesson, setCurrentLesson] = useState<any>(null)
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [user, setUser] = useState<any>(null)
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({})
  const [quizSubmitting, setQuizSubmitting] = useState(false)
  const [quizResult, setQuizResult] = useState<any>(null)
  const [helpNote, setHelpNote] = useState('')
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [sendingHelp, setSendingHelp] = useState(false)
  const [showDiscussion, setShowDiscussion] = useState(false)

  const rp = useReadingPrefs()

  useEffect(() => {
    const sc = localStorage.getItem('ogn-sidebar-collapsed')
    if (sc === 'true') setSidebarCollapsed(true)
  }, [])
  useEffect(() => { localStorage.setItem('ogn-sidebar-collapsed', String(sidebarCollapsed)) }, [sidebarCollapsed])

  useEffect(() => { loadCourse() }, [params.slug])
  useEffect(() => {
    if (currentLesson) { loadComments(currentLesson.id); loadQuizzes(currentLesson.id) }
  }, [currentLesson?.id])

  const loadCourse = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/'); return }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
    setUser(profile)
    const { data: courseData } = await supabase.from('courses').select('*, instructor:instructor_id(id, full_name)').eq('slug', params.slug).single()
    if (!courseData) { toast.error('Course not found'); router.push('/courses'); return }
    setCourse(courseData)
    const { data: enrollmentData } = await supabase.from('enrollments').select('*').eq('user_id', authUser.id).eq('course_id', courseData.id).single()
    if (!enrollmentData) { toast.error('Not enrolled'); router.push(`/courses/${params.slug}`); return }
    setEnrollmentId(enrollmentData.id)
    const { data: modulesData } = await supabase.from('modules').select('*, lessons(*)').eq('course_id', courseData.id).order('order_index', { ascending: true })
    if (modulesData) {
      const mods = modulesData.map((mod: any) => {
        const ed = new Date(enrollmentData.enrolled_at), ud = new Date(ed)
        ud.setDate(ud.getDate() + (mod.drip_delay_days || 0))
        return { ...mod, unlock_date: ud, is_unlocked: new Date() >= ud, lessons: (mod.lessons || []).sort((a: any, b: any) => a.order_index - b.order_index) }
      })
      const { data: progressData } = await supabase.from('lesson_progress').select('lesson_id, is_completed').eq('user_id', authUser.id).eq('enrollment_id', enrollmentData.id)
      const done = new Set(progressData?.filter((p) => p.is_completed).map((p) => p.lesson_id) || [])
      const modsP = mods.map((m: any) => ({ ...m, lessons: m.lessons.map((l: any) => ({ ...l, is_completed: done.has(l.id) })) }))
      setModules(modsP)
      let picked = false
      for (const mod of modsP) { if (mod.is_unlocked) { const inc = mod.lessons.find((l: any) => !l.is_completed); if (inc) { setCurrentLesson(inc); picked = true; break } } }
      if (!picked && modsP[0]?.is_unlocked && modsP[0].lessons[0]) setCurrentLesson(modsP[0].lessons[0])
    }
    const { data: prog } = await supabase.rpc('get_course_completion', { p_user_id: authUser.id, p_course_id: courseData.id })
    setProgress(prog || 0)
    setLoading(false)
  }

  const loadComments = async (lid: string) => {
    const { data } = await supabase.from('lesson_comments').select('*, user:user_id(full_name, role)').eq('lesson_id', lid).eq('status', 'approved').order('created_at', { ascending: true })
    setComments(data || [])
  }

  const loadQuizzes = async (lid: string) => {
    const { data } = await supabase.from('quizzes').select('*, questions:quiz_questions(*)').eq('lesson_id', lid).eq('is_published', true)
    setQuizzes(data || []); setQuizResult(null); setQuizAnswers({})
  }

  const submitComment = async () => {
    if (!user || !currentLesson || !newComment.trim()) return
    const { error } = await supabase.from('lesson_comments').insert({ lesson_id: currentLesson.id, user_id: user.id, content: newComment, status: 'approved' })
    if (error) toast.error('Failed to post')
    else { toast.success('Comment posted!'); setNewComment(''); loadComments(currentLesson.id) }
  }

  const markLessonComplete = async (lessonId: string) => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser || !enrollmentId) return
    const { error } = await supabase.from('lesson_progress').upsert({ user_id: authUser.id, lesson_id: lessonId, enrollment_id: enrollmentId, is_completed: true, completed_at: new Date().toISOString() }, { onConflict: 'user_id,lesson_id' })
    if (!error) {
      toast.success('Lesson completed!')
      await loadCourse()
      if (course) {
        const { data: prog } = await supabase.rpc('get_course_completion', { p_user_id: authUser.id, p_course_id: course.id })
        if (prog === 100) { toast.success('Course completed! Generating certificate...', { duration: 5000 }); await fetch('/api/certificates/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enrollmentId }) }) }
      }
    }
  }

  const submitQuiz = async (quiz: any) => {
    if (!user) return; setQuizSubmitting(true)
    const questions = quiz.questions || []; let score = 0, total = 0
    questions.forEach((q: any) => { if (q.question_type === 'multiple_choice') { total += q.points || 1; if (quizAnswers[q.id] === q.correct_answer) score += q.points || 1 } else { total += q.points || 1 } })
    const pct = total > 0 ? Math.round((score / total) * 100) : 0, passed = pct >= (quiz.passing_score || 70)
    await supabase.from('quiz_attempts').insert({ quiz_id: quiz.id, user_id: user.id, score: pct, passed, answers: quizAnswers, completed_at: new Date().toISOString() })
    setQuizResult({ score: pct, passed, total: questions.length }); setQuizSubmitting(false)
    if (passed && currentLesson) { toast.success(`Quiz passed with ${pct}%!`); markLessonComplete(currentLesson.id) } else if (!passed) toast.error(`Score: ${pct}%. Need ${quiz.passing_score}% to pass.`)
  }

  const goToNextLesson = () => { if (!currentLesson) return; let f = false; for (const m of modules) { for (const l of m.lessons) { if (f && m.is_unlocked) { setCurrentLesson(l); return }; if (l.id === currentLesson.id) f = true } } }
  const goToPreviousLesson = () => { if (!currentLesson) return; const all: any[] = []; modules.forEach((m) => { if (m.is_unlocked) all.push(...m.lessons) }); const idx = all.findIndex((l) => l.id === currentLesson.id); if (idx > 0) setCurrentLesson(all[idx - 1]) }

  const allLessons: any[] = []; modules.forEach((m) => { if (m.is_unlocked) allLessons.push(...m.lessons) })
  const currentIdx = allLessons.findIndex((l) => l.id === currentLesson?.id)
  const totalLessons = allLessons.length

  const isVideoLesson = currentLesson?.youtube_embed_id || currentLesson?.vimeo_url
  const isAudioLesson = currentLesson?.audio_url && !isVideoLesson
  const isPdfLesson = currentLesson?.pdf_url && !isVideoLesson
  const isQuizLesson = (currentLesson?.quiz_required || currentLesson?.content_type === 'quiz') && quizzes.length > 0
  const isTextLesson = !isVideoLesson && !isAudioLesson && !isPdfLesson
  const currentModule = modules.find((m) => m.lessons.some((l: any) => l.id === currentLesson?.id))

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a1628]">
      <div className="text-center">
        <Image src="/assets/ogn-logo-small.png" alt="OGN" width={80} height={64} className="mx-auto mb-4 object-contain" />
        <div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[#c9a227] text-sm">Loading course...</p>
      </div>
    </div>
  )

  if (!course || !currentLesson) return (
    <div className="min-h-screen flex items-center justify-center">
      <Card><CardContent className="p-12 text-center">
        <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h2 className="text-xl font-semibold mb-4">No lessons available</h2>
        <Link href="/dashboard"><Button className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628]">Back to Dashboard</Button></Link>
      </CardContent></Card>
    </div>
  )

  return (
    <div className={`min-h-screen ${rp.isDark && rp.focusMode ? 'bg-[#0a1628]' : 'bg-[#f0f2f5]'}`}>
      {/* Top Bar */}
      {!rp.focusMode && (
        <div className="bg-[#0a1628] text-white sticky top-0 z-40">
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button onClick={() => { if (typeof window !== 'undefined' && window.innerWidth < 1024) setSidebarOpen(!sidebarOpen); else setSidebarCollapsed(!sidebarCollapsed) }} className="p-1.5 hover:bg-[#1a3a5c] rounded flex-shrink-0">
                <Menu className="w-5 h-5" />
              </button>
              <Link href="/dashboard" className="text-xs sm:text-sm text-gray-400 hover:text-[#c9a227] flex items-center gap-1 flex-shrink-0">
                <ArrowLeft className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <span className="text-gray-600 hidden sm:inline">|</span>
              <div className="min-w-0">
                <h1 className="text-xs sm:text-sm font-semibold truncate">{course.title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <span className="text-xs text-[#c9a227] font-semibold">{progress}%</span>
              <div className="w-16 sm:w-24 h-1.5 bg-[#1a3a5c] rounded-full overflow-hidden">
                <div className="h-full bg-[#c9a227] rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Focus Mode Minimal Bar */}
      {rp.focusMode && (
        <div className={`sticky top-0 z-40 ${rp.isDark ? 'bg-[#0a1628] border-b border-[#1a3a5c]' : 'bg-white border-b'}`}>
          <div className="flex items-center justify-between px-4 py-2">
            <button onClick={() => rp.setFocusMode(false)} className={`text-xs flex items-center gap-1 ${rp.isDark ? 'text-gray-400 hover:text-[#c9a227]' : 'text-gray-500 hover:text-[#0a1628]'}`}>
              <Minimize2 className="w-3.5 h-3.5" /> Exit Focus
            </button>
            <span className={`text-xs font-medium ${rp.isDark ? 'text-gray-400' : 'text-gray-500'}`}>{currentIdx + 1} of {totalLessons}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => rp.setReadingMode(rp.isDark ? 'standard' : 'dark')} className={`p-1.5 rounded ${rp.isDark ? 'text-[#c9a227] hover:bg-[#1a3a5c]' : 'text-gray-500 hover:bg-gray-100'}`}>
                {rp.isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={() => rp.setFontSize(rp.fontSize === 'large' ? 'small' : rp.fontSize === 'small' ? 'medium' : 'large')} className={`p-1.5 rounded ${rp.isDark ? 'text-gray-400 hover:bg-[#1a3a5c]' : 'text-gray-500 hover:bg-gray-100'}`}>
                <Type className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex relative">
        {/* Sidebar - mobile overlay */}
        {sidebarOpen && !rp.focusMode && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}
        {!rp.focusMode && (
          <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${sidebarCollapsed ? 'lg:w-0 lg:overflow-hidden' : 'lg:w-72'} fixed lg:sticky top-[45px] sm:top-[49px] left-0 w-72 h-[calc(100vh-45px)] sm:h-[calc(100vh-49px)] bg-white border-r transition-all duration-300 overflow-y-auto overflow-x-hidden shrink-0 z-40 lg:z-auto`}>
            <div className="p-4">
              <div className="mb-4 p-3 bg-[#0a1628] rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Image src="/assets/ogn-logo-small.png" alt="OGN" width={24} height={24} className="object-contain" />
                  <span className="text-[10px] text-[#c9a227] font-semibold tracking-wider">OGN UNIVERSITY</span>
                </div>
                <p className="text-white text-xs font-semibold mb-1">Course Progress</p>
                <div className="w-full h-2 bg-[#1a3a5c] rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-[#c9a227] rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-[10px] text-gray-400">{progress}% COMPLETE</p>
              </div>
              <p className="text-[10px] text-gray-400 font-semibold tracking-widest mb-3">COURSE CONTENT</p>
              {modules.map((mod) => (
                <div key={mod.id} className="mb-3">
                  <div className="flex items-center gap-2 mb-1.5 px-1">
                    {mod.is_unlocked ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" /> : <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                    <h3 className="text-xs font-semibold text-[#0a1628] truncate">{mod.title}</h3>
                  </div>
                  {mod.is_unlocked && (
                    <div className="ml-2 space-y-0.5">
                      {mod.lessons.map((lesson: any, li: number) => (
                        <button key={lesson.id} onClick={() => { setCurrentLesson(lesson); setSidebarOpen(false) }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-all ${currentLesson.id === lesson.id ? 'bg-[#0a1628] text-[#c9a227] font-semibold' : lesson.is_completed ? 'text-green-700 hover:bg-green-50' : 'text-gray-600 hover:bg-gray-100'}`}>
                          {lesson.is_completed ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <Circle className="w-3.5 h-3.5 shrink-0" />}
                          <span className="flex-1 truncate">{li + 1}. {lesson.title}</span>
                          {lesson.youtube_embed_id && <Youtube className="w-3 h-3 shrink-0 text-red-500" />}
                          {lesson.vimeo_url && !lesson.youtube_embed_id && <Video className="w-3 h-3 shrink-0 text-blue-500" />}
                          {lesson.audio_url && <Music className="w-3 h-3 shrink-0 text-green-500" />}
                          {lesson.pdf_url && <FileText className="w-3 h-3 shrink-0 text-orange-500" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="mt-6 pt-4 border-t">
                <Link href="/dashboard" className="flex items-center gap-2 text-xs text-gray-500 hover:text-[#c9a227]"><ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard</Link>
              </div>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className={`flex-1 min-w-0 w-full max-w-full overflow-x-hidden ${rp.focusMode ? '' : 'p-3 sm:p-4 lg:p-6'} space-y-4`}>

          {/* Breadcrumb + Reading Controls */}
          {!rp.focusMode && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs text-gray-500 truncate">
                {currentModule && <span>{currentModule.title}</span>}
                <span className="mx-1.5">&rsaquo;</span>
                <span className="text-[#0a1628] font-medium">{currentLesson.title}</span>
              </div>
              {isTextLesson && !isQuizLesson && (
                <ReadingControls readingMode={rp.readingMode} setReadingMode={rp.setReadingMode} fontSize={rp.fontSize} setFontSize={rp.setFontSize} isDark={rp.isDark} setFocusMode={rp.setFocusMode} />
              )}
            </div>
          )}

          {/* ═══ LESSON CONTENT ═══ */}
          <div className={`rounded-xl overflow-hidden ${rp.focusMode ? 'mx-auto max-w-3xl px-4 sm:px-6 pt-6' : ''} ${isTextLesson ? rp.getContainerStyles() : 'bg-white'} ${!rp.focusMode ? 'border shadow-sm' : ''}`}>

            {/* VIDEO LESSON */}
            {isVideoLesson && (<>
              {currentLesson.youtube_embed_id && <div className="aspect-video bg-black"><iframe src={youtubeEmbedUrl(currentLesson.youtube_embed_id)} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" title={currentLesson.title} /></div>}
              {/* An uploaded video file plays natively; only real Vimeo links go to the Vimeo player. */}
              {currentLesson.vimeo_url && !currentLesson.youtube_embed_id && isDirectVideoUrl(currentLesson.vimeo_url) && (
                <div className="aspect-video bg-black">
                  <video
                    key={currentLesson.id}
                    src={currentLesson.vimeo_url}
                    controls
                    playsInline
                    preload="metadata"
                    poster={currentLesson.thumbnail_url || undefined}
                    className="w-full h-full"
                  />
                </div>
              )}
              {currentLesson.vimeo_url && !currentLesson.youtube_embed_id && vimeoEmbedUrl(currentLesson.vimeo_url) && (
                <div className="aspect-video bg-black">
                  <iframe src={vimeoEmbedUrl(currentLesson.vimeo_url)!} className="w-full h-full" allowFullScreen title={currentLesson.title} />
                </div>
              )}
              <div className="p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-1 text-xs text-gray-400">
                  <Badge className="bg-red-100 text-red-700 text-[10px]"><Video className="w-3 h-3 mr-0.5" />Video Lesson</Badge>
                  {currentLesson.estimated_duration_minutes && <span>{currentLesson.estimated_duration_minutes} min</span>}
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[#0a1628] mb-1">{currentLesson.title}</h2>
                {currentLesson.description && <p className="text-sm text-gray-500 mb-3">{currentLesson.description}</p>}
                {currentLesson.scripture_references && <p className="text-xs text-[#c9a227] mb-3">📖 {currentLesson.scripture_references}</p>}
                {currentLesson.lesson_notes && <div className="mt-4 pt-4 border-t"><p className="text-sm font-semibold text-[#0a1628] mb-3">Lesson Overview</p><div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{currentLesson.lesson_notes}</div></div>}
                {currentLesson.pdf_url && <div className="mt-4 flex gap-2"><a href={currentLesson.pdf_url} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />Download Resources</Button></a></div>}
              </div>
            </>)}

            {/* AUDIO LESSON */}
            {isAudioLesson && (<>
              <div className="bg-gradient-to-r from-[#0a1628] to-[#1a3a5c] p-6 sm:p-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-[#c9a227]/20 flex items-center justify-center"><Music className="w-8 h-8 text-[#c9a227]" /></div>
                  <div>
                    <Badge className="bg-green-900/50 text-green-300 text-[10px] mb-1"><Music className="w-3 h-3 mr-0.5" />Audio Lesson</Badge>
                    <p className="text-white font-semibold text-lg">{currentLesson.title}</p>
                    <p className="text-gray-400 text-xs">Background playback enabled</p>
                  </div>
                </div>
                <audio key={currentLesson.id} controls className="w-full" preload="metadata" style={{ filter: 'invert(1) hue-rotate(180deg)' }} src={currentLesson.audio_url} />
              </div>
              {currentLesson.lesson_notes && <div className="p-4 sm:p-6"><p className="text-sm font-semibold text-[#0a1628] mb-3">Lesson Notes</p><div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{currentLesson.lesson_notes}</div></div>}
            </>)}

            {/* PDF LESSON */}
            {isPdfLesson && !isVideoLesson && (<>
              {currentLesson.pdf_url.endsWith('.pdf') ? (
                <div>
                  <div className="p-3 sm:p-4 bg-gray-50 flex items-center justify-between border-b">
                    <div className="flex items-center gap-2"><Badge className="bg-orange-100 text-orange-700 text-[10px]"><FileText className="w-3 h-3 mr-0.5" />PDF</Badge><span className="text-sm font-medium text-[#0a1628]">{currentLesson.title}</span></div>
                    <div className="flex gap-2">
                      <a href={currentLesson.pdf_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c9a227] hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" />New tab</a>
                      <a href={currentLesson.pdf_url} download className="text-xs text-[#0a1628] hover:underline flex items-center gap-1"><Download className="w-3 h-3" />Download</a>
                    </div>
                  </div>
                  <iframe src={`${currentLesson.pdf_url}#toolbar=1&navpanes=1`} className="w-full h-[70vh] min-h-[500px]" title={currentLesson.title} />
                </div>
              ) : (
                <div className="p-8 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm font-medium text-[#0a1628] mb-4">{currentLesson.title}</p>
                  <div className="flex gap-3 justify-center">
                    <a href={currentLesson.pdf_url} target="_blank" rel="noopener noreferrer"><Button variant="outline"><ExternalLink className="w-4 h-4 mr-1" />View</Button></a>
                    <a href={currentLesson.pdf_url} download><Button className="bg-[#0a1628] text-white"><Download className="w-4 h-4 mr-1" />Download</Button></a>
                  </div>
                </div>
              )}
            </>)}

            {/* QUIZ LESSON (direct) */}
            {isQuizLesson && !isVideoLesson && !isAudioLesson && !isPdfLesson && (
              <div className="p-4 sm:p-6 md:p-8">
                <div className="flex items-center gap-2 mb-4">
                  <Badge className="bg-purple-100 text-purple-700 text-[10px]">Quiz</Badge>
                  <h2 className="text-lg sm:text-xl font-bold text-[#0a1628]">{currentLesson.title}</h2>
                </div>
                {quizzes.map((quiz) => (
                  <div key={quiz.id} className="space-y-4">
                    <p className="text-sm text-gray-600 mb-4">{quiz.description} <span className="font-medium">(Pass: {quiz.passing_score}%)</span></p>
                    {(quiz.questions || []).sort((a: any, b: any) => a.order_index - b.order_index).map((q: any, qi: number) => (
                      <div key={q.id} className="p-4 sm:p-5 border rounded-xl bg-white/80">
                        <p className="text-sm font-medium mb-3"><span className="bg-[#0a1628] text-[#c9a227] text-xs rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">{qi + 1}</span>{q.question_text}</p>
                        {q.question_type === 'multiple_choice' && q.options?.map((opt: string, oi: number) => (
                          <label key={oi} className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer text-sm mb-2 border ${quizAnswers[q.id] === opt ? 'bg-[#c9a227]/10 border-[#c9a227]' : 'hover:bg-gray-50 border-transparent'}`}>
                            <input type="radio" name={q.id} value={opt} checked={quizAnswers[q.id] === opt} onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: opt })} className="w-4 h-4 mt-0.5 shrink-0" /><span>{opt}</span>
                          </label>
                        ))}
                        {(q.question_type === 'short_answer' || q.question_type === 'spiritual_application') && <textarea value={quizAnswers[q.id] || ''} onChange={(e) => setQuizAnswers({ ...quizAnswers, [q.id]: e.target.value })} className="w-full mt-2 px-3 py-2 border rounded-lg text-sm min-h-[80px]" placeholder="Type your answer..." />}
                      </div>
                    ))}
                    {quizResult ? (
                      <div className={`p-5 rounded-xl text-center ${quizResult.passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <p className="text-xl font-bold">{quizResult.passed ? 'Passed!' : 'Not Passed'}</p><p className="text-sm mt-1">Score: {quizResult.score}%</p>
                      </div>
                    ) : <Button onClick={() => submitQuiz(quiz)} disabled={quizSubmitting} className="w-full bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold h-12">{quizSubmitting ? 'Submitting...' : 'Submit Quiz'}</Button>}
                  </div>
                ))}
              </div>
            )}

            {/* TEXT LESSON — Premium Reading */}
            {isTextLesson && !isQuizLesson && (
              <div className={rp.getContainerStyles()}>
                <div className={`p-5 sm:p-6 md:p-8 ${rp.readingMode === 'book' ? 'border-b-2 border-[#d4c5a0]' : rp.isDark ? 'border-b border-[#1a3a5c]' : 'border-b'}`}>
                  <div className="max-w-2xl mx-auto">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={`text-[10px] ${rp.isDark ? 'bg-[#1a3a5c] text-gray-300' : 'bg-gray-100 text-gray-600'}`}><FileText className="w-3 h-3 mr-0.5" />Text Lesson</Badge>
                      {currentLesson.estimated_duration_minutes && <span className={`text-xs ${rp.isDark ? 'text-gray-500' : 'text-gray-400'}`}>{currentLesson.estimated_duration_minutes} min read</span>}
                    </div>
                    <h2 className={`text-xl sm:text-2xl md:text-3xl font-bold mb-2 ${rp.readingMode === 'book' || rp.readingMode === 'scripture' ? 'font-serif text-[#0a1628]' : rp.isDark ? 'text-white' : 'text-[#0a1628]'}`}>{currentLesson.title}</h2>
                    {currentLesson.description && <p className={`text-sm ${rp.isDark ? 'text-gray-400' : 'text-gray-500'}`}>{currentLesson.description}</p>}
                  </div>
                </div>
                <div className={`p-5 sm:p-6 md:p-8 lg:p-10 ${rp.focusMode ? 'min-h-[60vh]' : ''}`}>
                  <article className={rp.getReadingStyles()}>
                    {currentLesson.lesson_notes ? (
                      <div style={{ wordSpacing: '0.05em' }}>
                        <ReadingContent text={currentLesson.lesson_notes} readingMode={rp.readingMode} fontSizeClass={rp.fontSizeClass} lineHeightClass={rp.lineHeightClass} isDark={rp.isDark} />
                      </div>
                    ) : <p className={`text-center py-12 ${rp.isDark ? 'text-gray-500' : 'text-gray-400'}`}>No lesson content available.</p>}
                  </article>
                  {currentLesson.scripture_references && (
                    <div className="mt-8 max-w-2xl mx-auto">
                      <div className={`p-5 rounded-xl border ${rp.isDark ? 'bg-[#c9a227]/10 border-[#c9a227]/20' : rp.readingMode === 'scripture' ? 'bg-gradient-to-br from-[#0a1628]/5 to-[#c9a227]/10 border-[#c9a227]/20' : 'bg-[#0a1628]/5 border-[#0a1628]/10'}`}>
                        <p className={`text-xs font-semibold tracking-wider mb-2 ${rp.isDark ? 'text-[#c9a227]' : 'text-[#0a1628]'}`}>KEY SCRIPTURES</p>
                        <div className="space-y-1">{currentLesson.scripture_references.split(',').map((ref: string, i: number) => <p key={i} className={`text-sm flex items-center gap-2 ${rp.isDark ? 'text-gray-300' : 'text-gray-700'}`}><span className="text-[#c9a227]">•</span> {ref.trim()}</p>)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer Actions (all types except quiz-only) */}
            {!isQuizLesson && (
              <div className={`p-4 sm:p-6 ${rp.isDark && isTextLesson ? 'bg-[#0a1628] border-t border-[#1a3a5c]' : isTextLesson && rp.readingMode === 'book' ? 'bg-[#faf8f0] border-t-2 border-[#d4c5a0]' : 'bg-gray-50 border-t'}`}>
                <div className="max-w-2xl mx-auto">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
                    {currentLesson.is_completed ? (
                      <Badge className="bg-green-600 text-white px-4 py-1.5"><CheckCircle className="w-4 h-4 mr-1.5" />Completed</Badge>
                    ) : (
                      <Button onClick={() => markLessonComplete(currentLesson.id)} className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold w-full sm:w-auto h-11"><CheckCircle className="w-4 h-4 mr-2" />Mark Complete</Button>
                    )}
                    <span className={`text-xs ${rp.isDark ? 'text-gray-500' : 'text-gray-400'}`}>{currentIdx + 1} of {totalLessons} Lessons</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <Button variant="outline" onClick={goToPreviousLesson} disabled={currentIdx === 0} className={rp.isDark && isTextLesson ? 'border-[#1a3a5c] text-gray-300 hover:bg-[#1a3a5c]' : ''}>
                      <ChevronLeft className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Previous</span><span className="sm:hidden">Prev</span>
                    </Button>
                    <Button onClick={goToNextLesson} className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold">
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Discussion + Help (collapsible, replaces old tabs) */}
          {!rp.focusMode && (
            <div className="space-y-3">
              <button onClick={() => setShowDiscussion(!showDiscussion)} className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border hover:bg-gray-50">
                <div className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-[#0a1628]" /><span className="text-sm font-medium text-[#0a1628]">Discussion</span>{comments.length > 0 && <Badge variant="outline" className="text-[10px]">{comments.length}</Badge>}</div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDiscussion ? 'rotate-180' : ''}`} />
              </button>
              {showDiscussion && (
                <Card><CardContent className="p-4 sm:p-6">
                  <div className="space-y-4 mb-4 max-h-[400px] overflow-y-auto">
                    {comments.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">No comments yet.</p> : comments.map((c) => (
                      <div key={c.id} className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#0a1628] text-[#c9a227] flex items-center justify-center text-xs font-bold shrink-0">{c.user?.full_name?.charAt(0) || '?'}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-[#0a1628]">{c.user?.full_name}</span>
                            <Badge variant="outline" className="text-[9px]">{c.user?.role}</Badge>
                            <span className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
                            {(c.user_id === user?.id || ['super_admin', 'prophet', 'teacher'].includes(user?.role)) && <button onClick={async () => { if (!confirm('Delete?')) return; await supabase.from('lesson_comments').delete().eq('id', c.id); toast.success('Deleted'); loadComments(currentLesson.id) }} className="text-[10px] text-red-400 hover:text-red-600 ml-auto">Delete</button>}
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
                </CardContent></Card>
              )}

              {quizzes.length > 0 && !isQuizLesson && (
                <Card>
                  <CardHeader className="px-4 sm:px-6"><CardTitle className="text-base text-[#0a1628] flex items-center gap-2"><BookOpen className="w-4 h-4" />Lesson Quiz</CardTitle></CardHeader>
                  <CardContent className="px-3 sm:px-6">
                    {quizzes.map((quiz) => (
                      <div key={quiz.id} className="space-y-4">
                        <p className="text-sm text-gray-600">{quiz.description} (Pass: {quiz.passing_score}%)</p>
                        {(quiz.questions || []).sort((a: any, b: any) => a.order_index - b.order_index).map((q: any, qi: number) => (
                          <div key={q.id} className="p-4 border rounded-xl">
                            <p className="text-sm font-medium mb-3"><span className="bg-[#0a1628] text-[#c9a227] text-xs rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">{qi + 1}</span>{q.question_text}</p>
                            {q.question_type === 'multiple_choice' && q.options?.map((opt: string, oi: number) => (
                              <label key={oi} className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer text-sm mb-2 border ${quizAnswers[q.id] === opt ? 'bg-[#c9a227]/10 border-[#c9a227]' : 'hover:bg-gray-50 border-transparent'}`}>
                                <input type="radio" name={q.id} value={opt} checked={quizAnswers[q.id] === opt} onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: opt })} className="w-4 h-4 mt-0.5 shrink-0" /><span>{opt}</span>
                              </label>
                            ))}
                            {(q.question_type === 'short_answer' || q.question_type === 'spiritual_application') && <textarea value={quizAnswers[q.id] || ''} onChange={(e) => setQuizAnswers({ ...quizAnswers, [q.id]: e.target.value })} className="w-full mt-2 px-3 py-2 border rounded-md text-sm min-h-[80px]" placeholder="Type your answer..." />}
                          </div>
                        ))}
                        {quizResult ? (
                          <div className={`p-4 rounded-xl text-center ${quizResult.passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                            <p className="text-lg font-bold">{quizResult.passed ? 'Passed!' : 'Not Passed'}</p><p className="text-sm">Score: {quizResult.score}%</p>
                          </div>
                        ) : <Button onClick={() => submitQuiz(quiz)} disabled={quizSubmitting} className="w-full bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold h-11">{quizSubmitting ? 'Submitting...' : 'Submit Quiz'}</Button>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {course?.instructor?.id && (
                <div className="bg-white rounded-xl border p-4">
                  {!showHelpModal ? (
                    <Button variant="outline" className="w-full border-[#c9a227] text-[#c9a227] hover:bg-[#c9a227]/10" onClick={() => setShowHelpModal(true)}><HelpCircle className="w-4 h-4 mr-2" />Message Instructor for Help</Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between"><p className="text-sm font-semibold text-[#0a1628]">Ask your instructor for help</p><button onClick={() => setShowHelpModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button></div>
                      <div className="text-xs text-gray-500 bg-gray-50 rounded p-2 border"><p><strong>Course:</strong> {course.title}</p><p><strong>Lesson:</strong> {currentLesson.title}</p></div>
                      <textarea value={helpNote} onChange={(e) => setHelpNote(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm min-h-[80px]" placeholder="Describe what you need help with..." />
                      <Button disabled={sendingHelp || !helpNote.trim()} className="w-full bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold" onClick={async () => {
                        if (!user || !course?.instructor?.id) return; setSendingHelp(true)
                        const convId = await findOrCreateConversation(supabase, user.id, course.instructor.id, `Help: ${course.title}`)
                        if (convId) {
                          const content = `📚 **Help Request**\n\n**Course:** ${course.title}\n**Lesson:** ${currentLesson.title}${currentLesson.scripture_references ? `\n**Scripture:** ${currentLesson.scripture_references}` : ''}\n\n${helpNote.trim()}`
                          await sendMessageWithMedia(supabase, { conversation_id: convId, sender_id: user.id, content, message_type: 'help_request' })
                          toast.success('Message sent!'); setHelpNote(''); setShowHelpModal(false)
                        } else toast.error('Could not reach instructor')
                        setSendingHelp(false)
                      }}><Send className="w-4 h-4 mr-2" />{sendingHelp ? 'Sending...' : 'Send to Instructor'}</Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
