'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { COURSE_CATEGORIES, VISIBILITY_OPTIONS, extractYouTubeId, youtubeEmbedUrl } from '@/lib/constants'
import {
  ArrowLeft, Save, Eye, Plus, Trash2, GripVertical, Youtube, FileText,
  Sparkles, Upload, Link2, Wand2, ChevronDown, ChevronUp, Music,
  Video, FileUp, Loader2, BookOpen, PenTool, X, ArrowUp, ArrowDown
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import CoverGenerator from '@/components/cover-generator'

interface Lesson {
  id: string
  module_id: string
  title: string
  description: string
  content_type: string
  order_index: number
  youtube_url: string | null
  youtube_embed_id: string | null
  pdf_url: string | null
  audio_url: string | null
  vimeo_url: string | null
  lesson_notes: string | null
  scripture_references: string | null
  estimated_duration_minutes: number | null
  is_required: boolean
  quiz_required: boolean
}

export default function EditCoursePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [course, setCourse] = useState<any>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddLesson, setShowAddLesson] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [showContentBuilder, setShowContentBuilder] = useState(false)
  const [showAddModule, setShowAddModule] = useState(false)
  const [generatingQuiz, setGeneratingQuiz] = useState<string | null>(null)
  const [generatingTemplate, setGeneratingTemplate] = useState<string | null>(null)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [editingModule, setEditingModule] = useState<string | null>(null)
  const [editModuleTitle, setEditModuleTitle] = useState('')
  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [dragItem, setDragItem] = useState<{ type: 'module' | 'lesson'; id: string; moduleId?: string } | null>(null)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)

  // Bulk upload state
  const [bulkLinks, setBulkLinks] = useState('')
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkFiles, setBulkFiles] = useState<File[]>([])

  // Content builder state
  const [cbTranscript, setCbTranscript] = useState('')
  const [cbTitle, setCbTitle] = useState('')
  const [cbOutputType, setCbOutputType] = useState<'summary' | 'student_guide' | 'quiz' | 'discussion' | 'blog'>('summary')
  const [cbResult, setCbResult] = useState('')
  const [cbGenerating, setCbGenerating] = useState(false)
  const [cbPublishTo, setCbPublishTo] = useState<'course' | 'blog'>('course')
  const [cbTargetModule, setCbTargetModule] = useState('')
  const [cbSaving, setCbSaving] = useState(false)

  const [lessonForm, setLessonForm] = useState({
    title: '', description: '', youtube_url: '', vimeo_url: '', audio_url: '',
    pdf_url: '', lesson_notes: '', scripture_references: '',
    estimated_duration_minutes: 30, is_required: true, quiz_required: false,
    targetModule: '',
  })

  useEffect(() => { loadCourse() }, [params.id])
  useEffect(() => {
    if (modules.length > 0) setExpandedModules(new Set(modules.map((m: any) => m.id)))
  }, [modules.length])

  const loadCourse = async () => {
    const { data: courseData } = await supabase.from('courses').select('*').eq('id', params.id).single()
    if (!courseData) { router.push('/admin/courses'); return }
    setCourse(courseData)

    const { data: modulesData } = await supabase.from('modules').select('*').eq('course_id', params.id).order('order_index')
    setModules(modulesData || [])

    if (modulesData && modulesData.length > 0) {
      const moduleIds = modulesData.map((m: any) => m.id)
      const { data: lessonsData } = await supabase.from('lessons').select('*').in('module_id', moduleIds).order('order_index')
      setLessons(lessonsData || [])
    }
    setLoading(false)
  }

  const updateCourse = async () => {
    setSaving(true)
    const { error } = await supabase.from('courses').update({
      title: course.title, subtitle: course.subtitle, slug: course.slug,
      description: course.description, long_description: course.long_description,
      category: course.category, is_free: course.is_free,
      price: course.is_free ? 0 : course.price, visibility: course.visibility,
      thumbnail_url: course.thumbnail_url,
    }).eq('id', params.id)
    setSaving(false)
    if (error) toast.error('Failed to save: ' + error.message)
    else {
      toast.success('Course updated!')
      // Trigger email on publish
      try { await fetch('/api/email/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trigger: 'course_published', data: { courseName: course.title, teacherName: 'Admin' } }) }) } catch {}
    }
  }

  const publishCourse = async () => {
    const { error } = await supabase.from('courses').update({ is_published: true, status: 'published' }).eq('id', params.id)
    if (error) toast.error('Failed to publish')
    else {
      toast.success('Course published!')
      setCourse({ ...course, is_published: true, status: 'published' })
      try { await fetch('/api/email/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trigger: 'course_published', data: { courseName: course.title, teacherName: 'Admin' } }) }) } catch {}
    }
  }

  // ── MODULE MANAGEMENT ──
  const addModule = async () => {
    if (!newModuleTitle.trim()) return
    const { error } = await supabase.from('modules').insert({ course_id: params.id, title: newModuleTitle.trim(), order_index: modules.length })
    if (error) toast.error('Failed: ' + error.message)
    else { toast.success('Section added!'); setNewModuleTitle(''); setShowAddModule(false); loadCourse() }
  }

  const updateModuleTitle = async (moduleId: string) => {
    if (!editModuleTitle.trim()) return
    await supabase.from('modules').update({ title: editModuleTitle.trim() }).eq('id', moduleId)
    setEditingModule(null)
    loadCourse()
  }

  const deleteModule = async (moduleId: string) => {
    if (!confirm('Delete this section and ALL its lessons?')) return
    await supabase.from('lessons').delete().eq('module_id', moduleId)
    await supabase.from('modules').delete().eq('id', moduleId)
    toast.success('Section deleted')
    loadCourse()
  }

  const moveModule = async (moduleId: string, direction: 'up' | 'down') => {
    const idx = modules.findIndex((m: any) => m.id === moduleId)
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === modules.length - 1)) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    await supabase.from('modules').update({ order_index: swapIdx }).eq('id', modules[idx].id)
    await supabase.from('modules').update({ order_index: idx }).eq('id', modules[swapIdx].id)
    loadCourse()
  }

  // ── LESSON MANAGEMENT ──
  const addLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    let moduleId = lessonForm.targetModule || modules[0]?.id
    if (!moduleId) {
      const { data: newModule } = await supabase.from('modules').insert({ course_id: params.id, title: 'Main Module', order_index: 0 }).select().single()
      if (!newModule) { toast.error('Failed to create section'); return }
      moduleId = newModule.id; setModules([newModule])
    }
    const ytId = lessonForm.youtube_url ? extractYouTubeId(lessonForm.youtube_url) : null
    const modLessons = lessons.filter(l => l.module_id === moduleId)
    const contentType = ytId ? 'youtube' : lessonForm.vimeo_url ? 'vimeo' : lessonForm.audio_url ? 'audio' : lessonForm.pdf_url ? 'pdf' : 'text'

    const { error } = await supabase.from('lessons').insert({
      module_id: moduleId, title: lessonForm.title, description: lessonForm.description,
      content_type: contentType, order_index: modLessons.length,
      youtube_url: lessonForm.youtube_url || null, youtube_embed_id: ytId,
      vimeo_url: lessonForm.vimeo_url || null, audio_url: lessonForm.audio_url || null,
      pdf_url: lessonForm.pdf_url || null, lesson_notes: lessonForm.lesson_notes || null,
      scripture_references: lessonForm.scripture_references || null,
      estimated_duration_minutes: lessonForm.estimated_duration_minutes,
      is_required: lessonForm.is_required, quiz_required: lessonForm.quiz_required,
    })
    if (error) toast.error('Failed: ' + error.message)
    else {
      toast.success('Lesson added!')
      setLessonForm({ title: '', description: '', youtube_url: '', vimeo_url: '', audio_url: '', pdf_url: '', lesson_notes: '', scripture_references: '', estimated_duration_minutes: 30, is_required: true, quiz_required: false, targetModule: '' })
      setShowAddLesson(false); loadCourse()
    }
  }

  const deleteLesson = async (lessonId: string) => {
    if (!confirm('Delete this lesson?')) return
    await supabase.from('lessons').delete().eq('id', lessonId)
    toast.success('Lesson deleted'); loadCourse()
  }

  const moveLesson = async (lessonId: string, moduleId: string, direction: 'up' | 'down') => {
    const modLessons = lessons.filter(l => l.module_id === moduleId).sort((a, b) => a.order_index - b.order_index)
    const idx = modLessons.findIndex(l => l.id === lessonId)
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === modLessons.length - 1)) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    await supabase.from('lessons').update({ order_index: swapIdx }).eq('id', modLessons[idx].id)
    await supabase.from('lessons').update({ order_index: idx }).eq('id', modLessons[swapIdx].id)
    loadCourse()
  }

  // ── BULK UPLOAD ──
  const handleBulkLinks = async () => {
    if (!bulkLinks.trim()) return
    setBulkUploading(true)
    let moduleId = modules[0]?.id
    if (!moduleId) {
      const { data: m } = await supabase.from('modules').insert({ course_id: params.id, title: 'Main Module', order_index: 0 }).select().single()
      if (!m) { toast.error('Failed to create section'); setBulkUploading(false); return }
      moduleId = m.id
    }
    const lines = bulkLinks.trim().split('\n').filter(l => l.trim())
    let added = 0
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split('|').map(s => s.trim())
      const title = parts[0] || `Link ${i + 1}`
      const url = parts[1] || parts[0]
      const desc = parts[2] || ''
      const isYt = url.includes('youtube.com') || url.includes('youtu.be')
      const isVimeo = url.includes('vimeo.com')
      const isPdf = url.endsWith('.pdf')
      const isAudio = /\.(mp3|wav|ogg|m4a)$/i.test(url)
      const ytId = isYt ? extractYouTubeId(url) : null
      const contentType = isYt ? 'youtube' : isVimeo ? 'vimeo' : isPdf ? 'pdf' : isAudio ? 'audio' : 'text'

      const { error } = await supabase.from('lessons').insert({
        module_id: moduleId, title, description: desc, content_type: contentType,
        order_index: lessons.length + i, youtube_url: isYt ? url : null,
        youtube_embed_id: ytId, vimeo_url: isVimeo ? url : null,
        audio_url: isAudio ? url : null, pdf_url: isPdf ? url : null,
        lesson_notes: !isYt && !isVimeo && !isPdf && !isAudio ? `Resource: ${url}` : null,
        is_required: true, quiz_required: false,
      })
      if (!error) added++
    }
    toast.success(`${added} lesson(s) added from links!`)
    setBulkLinks(''); setShowBulkUpload(false); setBulkUploading(false); loadCourse()
  }

  const handleBulkFiles = async () => {
    if (bulkFiles.length === 0) return
    setBulkUploading(true)
    let moduleId = modules[0]?.id
    if (!moduleId) {
      const { data: m } = await supabase.from('modules').insert({ course_id: params.id, title: 'Main Module', order_index: 0 }).select().single()
      if (!m) { toast.error('Failed'); setBulkUploading(false); return }
      moduleId = m.id
    }
    let added = 0
    for (let i = 0; i < bulkFiles.length; i++) {
      const file = bulkFiles[i]
      const ext = file.name.split('.').pop()?.toLowerCase()
      const fileName = `lesson-${Date.now()}-${i}.${ext}`
      const { error: upErr } = await supabase.storage.from('course-thumbnails').upload(fileName, file)
      if (upErr) { toast.error(`Upload failed: ${file.name}`); continue }
      const { data: urlData } = supabase.storage.from('course-thumbnails').getPublicUrl(fileName)
      const url = urlData.publicUrl
      const isPdf = ext === 'pdf'
      const isAudio = ['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '')
      const isVideo = ['mp4', 'webm', 'mov'].includes(ext || '')
      const isDoc = ['doc', 'docx'].includes(ext || '')
      const title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')

      const { error } = await supabase.from('lessons').insert({
        module_id: moduleId, title, content_type: isPdf ? 'pdf' : isAudio ? 'audio' : isVideo ? 'video' : 'text',
        order_index: lessons.length + i, pdf_url: isPdf || isDoc ? url : null,
        audio_url: isAudio ? url : null, content_url: isVideo ? url : null,
        is_required: true, quiz_required: false,
      })
      if (!error) added++
    }
    toast.success(`${added} file(s) uploaded as lessons!`)
    setBulkFiles([]); setShowBulkUpload(false); setBulkUploading(false); loadCourse()
  }

  // ── AI CONTENT BUILDER ──
  const generateContent = async () => {
    if (!cbTranscript.trim()) { toast.error('Paste or upload a transcript first'); return }
    setCbGenerating(true); setCbResult('')
    try {
      const res = await fetch('/api/gemini/content-builder', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: cbTranscript, title: cbTitle || course?.title, outputType: cbOutputType, courseTitle: course?.title }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCbResult(data.content)
      toast.success('Content generated!')
    } catch (err: any) { toast.error(err.message || 'Generation failed') }
    setCbGenerating(false)
  }

  const saveGeneratedContent = async () => {
    if (!cbResult) return
    setCbSaving(true)
    try {
      if (cbPublishTo === 'blog') {
        // Save as community post (blog)
        const { data: user } = await supabase.auth.getUser()
        const { error } = await supabase.from('community_posts').insert({
          title: cbTitle || `${course?.title} - ${cbOutputType}`, content: cbResult,
          author_id: user.user?.id, is_public: true, category: 'blog',
        })
        if (error) throw error
        toast.success('Published to blog!')
      } else {
        // Save as guide attached to course
        const { data: user } = await supabase.auth.getUser()
        let moduleId = cbTargetModule || modules[0]?.id
        if (!moduleId) {
          const { data: m } = await supabase.from('modules').insert({ course_id: params.id, title: 'Main Module', order_index: 0 }).select().single()
          if (m) moduleId = m.id
        }
        // Save as a new lesson with the generated content as notes
        const { error } = await supabase.from('lessons').insert({
          module_id: moduleId, title: cbTitle || `${cbOutputType}: ${course?.title}`,
          lesson_notes: cbResult, content_type: 'text', order_index: lessons.length,
          is_required: false, quiz_required: false,
        })
        if (error) throw error
        // Also save to ai_generated_guides
        await supabase.from('ai_generated_guides').insert({
          lesson_id: null, course_id: params.id, title: cbTitle || course?.title,
          content: cbResult, guide_type: cbOutputType, published_to: cbPublishTo,
          created_by: user.user?.id,
        })
        toast.success('Saved as course lesson!')
        loadCourse()
      }
      setCbResult(''); setCbTranscript(''); setCbTitle(''); setShowContentBuilder(false)
    } catch (err: any) { toast.error(err.message || 'Failed to save') }
    setCbSaving(false)
  }

  // ── QUIZ GENERATION ──
  const generateQuiz = async (lesson: Lesson) => {
    setGeneratingQuiz(lesson.id)
    try {
      const res = await fetch('/api/gemini/generate-quiz', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonTitle: lesson.title, lessonNotes: lesson.lesson_notes, scriptureReferences: lesson.scripture_references }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const quiz = data.quiz
      const { data: quizRow, error: qErr } = await supabase.from('quizzes').insert({ lesson_id: lesson.id, course_id: params.id, title: quiz.title, description: quiz.description, passing_score: quiz.passing_score || 70, is_published: true }).select().single()
      if (qErr || !quizRow) throw new Error('Failed to save quiz')
      const questions = quiz.questions.map((q: any, i: number) => ({ quiz_id: quizRow.id, question_text: q.question_text, question_type: q.question_type, options: q.options, correct_answer: q.correct_answer, points: q.points || 1, order_index: i, teacher_review_required: q.teacher_review_required || false }))
      await supabase.from('quiz_questions').insert(questions)
      toast.success(`Quiz: ${questions.length} questions!`)
    } catch (err: any) { toast.error(err.message) }
    setGeneratingQuiz(null)
  }

  const generateLessonTemplate = async (lesson: Lesson) => {
    setGeneratingTemplate(lesson.id)
    try {
      const res = await fetch('/api/gemini/generate-lesson-template', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonTitle: lesson.title, courseTitle: course?.title, category: course?.category, scriptureReferences: lesson.scripture_references }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const tpl = data.template
      await supabase.from('lessons').update({ lesson_notes: tpl.lesson_notes || tpl.overview, scripture_references: tpl.key_scriptures?.map((s: any) => s.reference).join(', '), description: tpl.overview?.substring(0, 500) }).eq('id', lesson.id)
      toast.success('Template applied!'); loadCourse()
    } catch (err: any) { toast.error(err.message) }
    setGeneratingTemplate(null)
  }

  const ytPreviewId = lessonForm.youtube_url ? extractYouTubeId(lessonForm.youtube_url) : null
  const toggleModule = (id: string) => { const s = new Set(expandedModules); s.has(id) ? s.delete(id) : s.add(id); setExpandedModules(s) }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Link href="/admin/courses"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button></Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#0a1628]">{course?.title}</h1>
              {course?.is_published ? <Badge className="bg-green-600 text-white">Published</Badge> : <Badge variant="outline">Draft</Badge>}
            </div>
            <p className="text-sm text-gray-500">{modules.length} sections • {lessons.length} lessons</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={updateCourse} disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save'}</Button>
          {!course?.is_published && <Button className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold" onClick={publishCourse}><Eye className="w-4 h-4 mr-2" /> Publish</Button>}
        </div>
      </div>

      {/* Course Details */}
      <Card>
        <CardHeader><CardTitle className="text-lg text-[#0a1628]">Course Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>Title</Label><Input value={course?.title || ''} onChange={(e) => setCourse({ ...course, title: e.target.value })} /></div>
            <div><Label>Subtitle</Label><Input value={course?.subtitle || ''} onChange={(e) => setCourse({ ...course, subtitle: e.target.value })} /></div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>Category</Label>
              <select value={course?.category || ''} onChange={(e) => setCourse({ ...course, category: e.target.value })} className="w-full h-10 px-3 border rounded-md text-sm">
                <option value="">Select...</option>
                {COURSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select></div>
            <div><Label>Visibility</Label>
              <select value={course?.visibility || 'public'} onChange={(e) => setCourse({ ...course, visibility: e.target.value })} className="w-full h-10 px-3 border rounded-md text-sm">
                {VISIBILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select></div>
          </div>
          <div><Label>Description</Label><textarea value={course?.description || ''} onChange={(e) => setCourse({ ...course, description: e.target.value })} className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm" /></div>
          <div><Label>Thumbnail</Label>
            <div className="flex items-start gap-4">
              {course?.thumbnail_url && <img src={course.thumbnail_url} alt="Cover" className="w-32 h-20 object-cover rounded border" />}
              <div className="flex-1 space-y-2">
                <Input value={course?.thumbnail_url || ''} onChange={(e) => setCourse({ ...course, thumbnail_url: e.target.value })} placeholder="Paste image URL or upload" />
                <CoverGenerator courseTitle={course?.title || ''} courseCategory={course?.category} courseDescription={course?.description} currentThumbnail={course?.thumbnail_url} onSelectCover={(url) => setCourse({ ...course, thumbnail_url: url })} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tools Bar */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setShowAddModule(!showAddModule)} variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" /> Add Section</Button>
        <Button onClick={() => setShowAddLesson(!showAddLesson)} className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold" size="sm"><Plus className="w-4 h-4 mr-1" /> Add Lesson</Button>
        <Button onClick={() => setShowBulkUpload(!showBulkUpload)} variant="outline" size="sm"><Upload className="w-4 h-4 mr-1" /> Bulk Upload</Button>
        <Button onClick={() => setShowContentBuilder(!showContentBuilder)} variant="outline" size="sm" className="border-purple-300 text-purple-700 hover:bg-purple-50"><Wand2 className="w-4 h-4 mr-1" /> Content Builder</Button>
      </div>

      {/* Add Module */}
      {showAddModule && (
        <Card className="border-[#c9a227] border-2">
          <CardContent className="p-4">
            <h3 className="font-semibold text-[#0a1628] mb-3">New Section / Module</h3>
            <div className="flex gap-2">
              <Input value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} placeholder="Section title, e.g. Week 1: Foundations" className="flex-1" onKeyDown={(e) => e.key === 'Enter' && addModule()} />
              <Button onClick={addModule} className="bg-[#0a1628] text-white">Add</Button>
              <Button variant="ghost" onClick={() => setShowAddModule(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Lesson Form */}
      {showAddLesson && (
        <Card className="border-[#c9a227] border-2">
          <CardContent className="p-4">
            <form onSubmit={addLesson} className="space-y-4">
              <h3 className="font-semibold text-[#0a1628]">New Lesson</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div><Label>Title *</Label><Input value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} required /></div>
                <div><Label>Duration (min)</Label><Input type="number" value={lessonForm.estimated_duration_minutes} onChange={(e) => setLessonForm({ ...lessonForm, estimated_duration_minutes: parseInt(e.target.value) || 0 })} /></div>
                <div><Label>Add to Section</Label>
                  <select value={lessonForm.targetModule} onChange={(e) => setLessonForm({ ...lessonForm, targetModule: e.target.value })} className="w-full h-10 px-3 border rounded-md text-sm">
                    <option value="">First section</option>
                    {modules.map((m: any) => <option key={m.id} value={m.id}>{m.title}</option>)}
                  </select></div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label><Youtube className="w-3 h-3 inline mr-1" />YouTube URL</Label><Input value={lessonForm.youtube_url} onChange={(e) => setLessonForm({ ...lessonForm, youtube_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." /></div>
                <div><Label><Video className="w-3 h-3 inline mr-1" />Vimeo URL</Label><Input value={lessonForm.vimeo_url} onChange={(e) => setLessonForm({ ...lessonForm, vimeo_url: e.target.value })} placeholder="https://vimeo.com/..." /></div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label><Music className="w-3 h-3 inline mr-1" />Audio URL</Label><Input value={lessonForm.audio_url} onChange={(e) => setLessonForm({ ...lessonForm, audio_url: e.target.value })} placeholder="MP3 or audio file URL" /></div>
                <div><Label><FileText className="w-3 h-3 inline mr-1" />PDF/Doc URL</Label><Input value={lessonForm.pdf_url} onChange={(e) => setLessonForm({ ...lessonForm, pdf_url: e.target.value })} placeholder="PDF or document URL" /></div>
              </div>
              {ytPreviewId && <div className="rounded-lg overflow-hidden border"><iframe src={youtubeEmbedUrl(ytPreviewId)} className="w-full aspect-video" allowFullScreen title="Preview" /></div>}
              <div><Label>Lesson Notes</Label><textarea value={lessonForm.lesson_notes} onChange={(e) => setLessonForm({ ...lessonForm, lesson_notes: e.target.value })} className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm" placeholder="Key points, content..." /></div>
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Scripture References</Label><Input value={lessonForm.scripture_references} onChange={(e) => setLessonForm({ ...lessonForm, scripture_references: e.target.value })} placeholder="John 3:16, Romans 8:28" /></div>
                <div><Label>Description</Label><Input value={lessonForm.description} onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })} placeholder="Brief description" /></div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={lessonForm.is_required} onChange={(e) => setLessonForm({ ...lessonForm, is_required: e.target.checked })} className="w-4 h-4" /><span className="text-sm">Required</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={lessonForm.quiz_required} onChange={(e) => setLessonForm({ ...lessonForm, quiz_required: e.target.checked })} className="w-4 h-4" /><span className="text-sm">Quiz required</span></label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="bg-[#0a1628] text-white hover:bg-[#1a3a5c]">Add Lesson</Button>
                <Button type="button" variant="ghost" onClick={() => setShowAddLesson(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Bulk Upload */}
      {showBulkUpload && (
        <Card className="border-blue-300 border-2">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[#0a1628] flex items-center gap-2"><Upload className="w-5 h-5" /> Bulk Upload Content</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowBulkUpload(false)}><X className="w-4 h-4" /></Button>
            </div>

            {/* Option A: Paste Links */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Option A: Paste Links</Label>
              <p className="text-xs text-gray-500">One per line. Format: Title | URL | Description (URL required, others optional)</p>
              <textarea value={bulkLinks} onChange={(e) => setBulkLinks(e.target.value)} className="w-full min-h-[120px] px-3 py-2 border rounded-md text-sm font-mono" placeholder={"Lesson 1 | https://youtube.com/watch?v=abc123 | Introduction\nLesson 2 | https://example.com/file.pdf | Study guide\nhttps://vimeo.com/123456"} />
              <Button onClick={handleBulkLinks} disabled={bulkUploading || !bulkLinks.trim()} className="bg-[#0a1628] text-white">
                {bulkUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
                {bulkUploading ? 'Processing...' : 'Import Links'}
              </Button>
            </div>

            <div className="border-t pt-4 space-y-2">
              <Label className="text-sm font-semibold">Option B: Upload Files</Label>
              <p className="text-xs text-gray-500">Videos, PDFs, audio, documents. Max 50MB each.</p>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#0a1628] text-white rounded-lg cursor-pointer hover:bg-[#1a3a5c] text-sm">
                  <FileUp className="w-4 h-4" /> Choose Files
                  <input type="file" multiple accept="video/*,audio/*,.pdf,.doc,.docx" className="hidden" onChange={(e) => setBulkFiles(Array.from(e.target.files || []))} />
                </label>
                {bulkFiles.length > 0 && <span className="text-sm text-gray-600">{bulkFiles.length} file(s) selected</span>}
              </div>
              {bulkFiles.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {bulkFiles.map((f, i) => <div key={i} className="text-xs text-gray-600 flex items-center gap-2"><FileText className="w-3 h-3" /> {f.name} ({(f.size / 1024 / 1024).toFixed(1)} MB)</div>)}
                </div>
              )}
              {bulkFiles.length > 0 && (
                <Button onClick={handleBulkFiles} disabled={bulkUploading} className="bg-[#0a1628] text-white">
                  {bulkUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {bulkUploading ? 'Uploading...' : `Upload ${bulkFiles.length} file(s)`}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Builder */}
      {showContentBuilder && (
        <Card className="border-purple-300 border-2">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[#0a1628] flex items-center gap-2"><Wand2 className="w-5 h-5 text-purple-600" /> AI Content Builder</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowContentBuilder(false)}><X className="w-4 h-4" /></Button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>Content Title</Label><Input value={cbTitle} onChange={(e) => setCbTitle(e.target.value)} placeholder="Title for generated content" /></div>
              <div><Label>Generate As</Label>
                <select value={cbOutputType} onChange={(e) => setCbOutputType(e.target.value as any)} className="w-full h-10 px-3 border rounded-md text-sm">
                  <option value="summary">Lesson Summary</option>
                  <option value="student_guide">Student Study Guide</option>
                  <option value="quiz">Quiz Questions</option>
                  <option value="discussion">Discussion Questions</option>
                  <option value="blog">Blog Article</option>
                </select></div>
            </div>

            <div>
              <Label>Paste Transcript or Upload</Label>
              <div className="flex gap-2 mb-2">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 text-xs">
                  <FileUp className="w-3 h-3" /> Upload .txt
                  <input type="file" accept=".txt,.srt,.vtt" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return
                    const text = await file.text(); setCbTranscript(text); toast.success('Transcript loaded!')
                  }} />
                </label>
              </div>
              <textarea value={cbTranscript} onChange={(e) => setCbTranscript(e.target.value)} className="w-full min-h-[150px] px-3 py-2 border rounded-md text-sm" placeholder="Paste your transcript, sermon notes, or teaching content here..." />
            </div>

            <Button onClick={generateContent} disabled={cbGenerating || !cbTranscript.trim()} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
              {cbGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {cbGenerating ? 'Generating...' : `Generate ${cbOutputType.replace('_', ' ')}`}
            </Button>

            {cbResult && (
              <div className="space-y-3 pt-3 border-t">
                <Label>Generated Content</Label>
                <div className="max-h-[400px] overflow-y-auto p-4 bg-gray-50 rounded-lg border text-sm whitespace-pre-wrap">{cbResult}</div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div><Label>Publish To</Label>
                    <select value={cbPublishTo} onChange={(e) => setCbPublishTo(e.target.value as any)} className="w-full h-10 px-3 border rounded-md text-sm">
                      <option value="course">Course Lesson</option>
                      <option value="blog">Community Blog</option>
                    </select></div>
                  {cbPublishTo === 'course' && (
                    <div><Label>Target Section</Label>
                      <select value={cbTargetModule} onChange={(e) => setCbTargetModule(e.target.value)} className="w-full h-10 px-3 border rounded-md text-sm">
                        <option value="">First section</option>
                        {modules.map((m: any) => <option key={m.id} value={m.id}>{m.title}</option>)}
                      </select></div>
                  )}
                </div>
                <Button onClick={saveGeneratedContent} disabled={cbSaving} className="w-full bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold">
                  {cbSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {cbSaving ? 'Saving...' : `Save as ${cbPublishTo === 'blog' ? 'Blog Post' : 'Course Lesson'}`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sections & Lessons */}
      {modules.length === 0 && lessons.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-gray-400"><FileText className="w-12 h-12 mx-auto mb-3" /><p>No content yet. Add a section or lesson above.</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {modules.map((mod, modIdx) => {
            const modLessons = lessons.filter(l => l.module_id === mod.id).sort((a, b) => a.order_index - b.order_index)
            const isExpanded = expandedModules.has(mod.id)
            return (
              <Card key={mod.id} className="border-l-4 border-l-[#0a1628]">
                <div className="flex items-center gap-3 p-4 bg-gray-50 border-b cursor-pointer" onClick={() => toggleModule(mod.id)}>
                  <div className="flex flex-col gap-0.5">
                    <button onClick={(e) => { e.stopPropagation(); moveModule(mod.id, 'up') }} className="text-gray-400 hover:text-[#0a1628] p-0.5"><ArrowUp className="w-3 h-3" /></button>
                    <button onClick={(e) => { e.stopPropagation(); moveModule(mod.id, 'down') }} className="text-gray-400 hover:text-[#0a1628] p-0.5"><ArrowDown className="w-3 h-3" /></button>
                  </div>
                  <div className="w-8 h-8 rounded bg-[#0a1628] text-[#c9a227] flex items-center justify-center text-sm font-bold">{modIdx + 1}</div>
                  <div className="flex-1 min-w-0">
                    {editingModule === mod.id ? (
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Input value={editModuleTitle} onChange={(e) => setEditModuleTitle(e.target.value)} className="h-8 text-sm" autoFocus onKeyDown={(e) => e.key === 'Enter' && updateModuleTitle(mod.id)} />
                        <Button size="sm" onClick={() => updateModuleTitle(mod.id)} className="h-8">Save</Button>
                      </div>
                    ) : (
                      <p className="font-semibold text-[#0a1628]">{mod.title}</p>
                    )}
                    <p className="text-xs text-gray-500">{modLessons.length} lesson{modLessons.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => { setEditingModule(mod.id); setEditModuleTitle(mod.title) }} title="Rename"><PenTool className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteModule(mod.id)} title="Delete section"><Trash2 className="w-3 h-3 text-red-500" /></Button>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>
                {isExpanded && (
                  <CardContent className="p-0">
                    {modLessons.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-sm">No lessons in this section</div>
                    ) : modLessons.map((lesson, lesIdx) => (
                      <div key={lesson.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-gray-50/50 transition-colors">
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => moveLesson(lesson.id, mod.id, 'up')} className="text-gray-300 hover:text-[#0a1628] p-0.5"><ArrowUp className="w-3 h-3" /></button>
                          <button onClick={() => moveLesson(lesson.id, mod.id, 'down')} className="text-gray-300 hover:text-[#0a1628] p-0.5"><ArrowDown className="w-3 h-3" /></button>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-[#0a1628]/10 text-[#0a1628] flex items-center justify-center text-xs font-bold">{lesIdx + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-[#0a1628] text-sm truncate">{lesson.title}</p>
                            {lesson.youtube_embed_id && <Youtube className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />}
                            {lesson.vimeo_url && <Video className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                            {lesson.audio_url && <Music className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />}
                            {lesson.pdf_url && <FileText className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />}
                            {lesson.quiz_required && <Badge className="text-[9px] bg-purple-100 text-purple-700">Quiz</Badge>}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{lesson.description || lesson.scripture_references || 'No description'}</p>
                        </div>
                        <div className="text-xs text-gray-400 whitespace-nowrap">{lesson.estimated_duration_minutes || '—'} min</div>
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="sm" onClick={() => generateLessonTemplate(lesson)} disabled={generatingTemplate === lesson.id} title="Generate Template">
                            <Sparkles className={`w-3.5 h-3.5 ${generatingTemplate === lesson.id ? 'animate-spin text-[#c9a227]' : 'text-blue-600'}`} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => generateQuiz(lesson)} disabled={generatingQuiz === lesson.id} title="Generate Quiz">
                            <BookOpen className={`w-3.5 h-3.5 ${generatingQuiz === lesson.id ? 'animate-spin text-[#c9a227]' : 'text-purple-600'}`} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteLesson(lesson.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
