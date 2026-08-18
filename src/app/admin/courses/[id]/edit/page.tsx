'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { COURSE_CATEGORIES, VISIBILITY_OPTIONS, extractYouTubeId, youtubeEmbedUrl, STORAGE_FILE_LIMIT } from '@/lib/constants'
import {
  ArrowLeft, Save, Eye, Plus, Trash2, GripVertical, Youtube, FileText,
  Sparkles, Upload, Link2, Wand2, ChevronDown, ChevronUp, Music,
  Video, FileUp, Loader2, BookOpen, PenTool, X, ArrowUp, ArrowDown,
  Pencil, Play, File, Copy, Camera
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
  const [instructors, setInstructors] = useState<any[]>([])
  const [allTeachers, setAllTeachers] = useState<any[]>([])
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

  // Preview & Edit modals
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null)
  const [editLesson, setEditLesson] = useState<Lesson | null>(null)
  const [editLessonForm, setEditLessonForm] = useState<any>({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [previewQuiz, setPreviewQuiz] = useState<any[]>([])

  // Drag-and-drop for lessons
  const [dragLessonId, setDragLessonId] = useState<string | null>(null)
  const [dragOverLessonId, setDragOverLessonId] = useState<string | null>(null)

  // Bulk upload state
  const [bulkLinks, setBulkLinks] = useState('')
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkFiles, setBulkFiles] = useState<File[]>([])
  const [uploadQueue, setUploadQueue] = useState<{ file: File; status: 'pending' | 'uploading' | 'done' | 'failed'; progress: number; error?: string }[]>([])
  const [dragActive, setDragActive] = useState(false)

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

    // Load instructors (the main instructor + any co-instructors)
    const instructorIds = [courseData.instructor_id, ...(courseData.co_instructor_ids || [])].filter(Boolean)
    if (instructorIds.length > 0) {
      const { data: instrData } = await supabase.from('profiles').select('id, full_name, avatar_url, role').in('id', instructorIds)
      setInstructors(instrData || [])
    }

    // Load all available teachers/admins for the instructor selector
    const { data: teacherData } = await supabase.from('profiles').select('id, full_name, avatar_url, role').in('role', ['super_admin', 'prophet', 'teacher', 'minister']).order('full_name')
    setAllTeachers(teacherData || [])

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
      instructor_id: course.instructor_id,
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

  const handleBulkFiles = async (filesToUpload?: File[]) => {
    const files = filesToUpload || bulkFiles
    if (files.length === 0) return
    setBulkUploading(true)

    // Init queue
    const queue = files.map(f => ({ file: f, status: 'pending' as const, progress: 0 }))
    setUploadQueue(queue)

    let moduleId = modules[0]?.id
    if (!moduleId) {
      const { data: m } = await supabase.from('modules').insert({ course_id: params.id, title: 'Main Module', order_index: 0 }).select().single()
      if (!m) { toast.error('Failed to create section'); setBulkUploading(false); return }
      moduleId = m.id
    }

    let added = 0
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setUploadQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'uploading', progress: 10 } : q))

      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      const fileName = `lesson-${params.id}-${Date.now()}-${i}.${ext}`

      // Supabase enforces a hard per-file cap (50MB on the current plan). Fail
      // fast with a useful instruction instead of letting storage reject it
      // after the whole file has been pushed up.
      if (file.size > STORAGE_FILE_LIMIT) {
        const mb = (file.size / 1048576).toFixed(0)
        setUploadQueue(prev => prev.map((q, idx) => idx === i ? {
          ...q, status: 'failed',
          error: `${mb}MB — over the ${STORAGE_FILE_LIMIT / 1048576}MB limit. Upload to YouTube and paste the link instead.`,
        } : q))
        toast.error(`${file.name} is too big (${mb}MB)`, {
          description: 'Put long videos on YouTube and paste the link into the lesson — there is no size limit that way.',
        })
        continue
      }

      // Upload via signed URL (client → Supabase directly, so the file never
      // passes through the Vercel function and its request-body limit).
      let uploadSuccess = false
      let uploadError = ''
      let url = ''

      // Get auth token for API call
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          setUploadQueue(prev => prev.map((q, idx) => idx === i ? { ...q, progress: 10 + attempt * 10 } : q))

          // Step 1: Get signed upload URL from our API
          const signedRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName, bucket: 'lesson-media' }),
          })
          const signedData = await signedRes.json()
          if (!signedRes.ok) {
            uploadError = signedData.error || `Failed to get upload URL (${signedRes.status})`
            if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
            continue
          }

          setUploadQueue(prev => prev.map((q, idx) => idx === i ? { ...q, progress: 30 + attempt * 10 } : q))

          // Step 2: Upload file directly to Supabase using signed URL
          const uploadRes = await fetch(signedData.signedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
          })

          if (!uploadRes.ok) {
            const errText = await uploadRes.text().catch(() => '')
            uploadError = `Upload to storage failed (${uploadRes.status}): ${errText.slice(0, 100)}`
            if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
            continue
          }

          setUploadQueue(prev => prev.map((q, idx) => idx === i ? { ...q, progress: 80 } : q))
          url = signedData.publicUrl
          uploadSuccess = true
          break
        } catch (err: any) {
          uploadError = err.message || 'Network error'
          if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
        }
      }

      if (!uploadSuccess) {
        setUploadQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'failed', error: uploadError } : q))
        toast.error(`Upload failed: ${file.name} - ${uploadError}`)
        continue
      }

      setUploadQueue(prev => prev.map((q, idx) => idx === i ? { ...q, progress: 85 } : q))
      const isPdf = ext === 'pdf'
      const isAudio = ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)
      const isVideo = ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)
      const isDoc = ['doc', 'docx'].includes(ext)
      const title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')

      const lessonData: any = {
        module_id: moduleId, title,
        content_type: isPdf ? 'pdf' : isAudio ? 'audio' : isVideo ? 'video' : isDoc ? 'document' : 'text',
        order_index: lessons.length + i,
        is_required: true, quiz_required: false,
      }
      if (isPdf || isDoc) lessonData.pdf_url = url
      if (isAudio) lessonData.audio_url = url
      if (isVideo) lessonData.vimeo_url = url // store video URL in vimeo_url field for playback

      const { error } = await supabase.from('lessons').insert(lessonData)
      if (error) {
        setUploadQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'failed', error: error.message } : q))
        toast.error(`Lesson creation failed: ${file.name} - ${error.message}`)
      } else {
        setUploadQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'done', progress: 100 } : q))
        added++
      }
    }

    if (added > 0) toast.success(`${added} of ${files.length} file(s) uploaded as lessons!`)
    setBulkUploading(false)
    if (added > 0) { setBulkFiles([]); loadCourse() }
  }

  const retryUpload = async (index: number) => {
    const item = uploadQueue[index]
    if (!item) return
    handleBulkFiles([item.file])
  }

  const handleFileDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(true) }
  const handleFileDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false) }
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false)
    const files = Array.from(e.dataTransfer.files).filter(f => /\.(mp4|webm|mov|avi|mkv|mp3|wav|ogg|m4a|pdf|doc|docx)$/i.test(f.name))
    if (files.length > 0) { setBulkFiles(prev => [...prev, ...files]); setShowBulkUpload(true) }
    else toast.error('No supported files detected. Use video, audio, PDF, or document files.')
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

  // ── EDIT LESSON ──
  const openEditLesson = (lesson: Lesson) => {
    setEditLesson(lesson)
    setEditLessonForm({
      title: lesson.title,
      description: lesson.description || '',
      youtube_url: lesson.youtube_url || '',
      vimeo_url: lesson.vimeo_url || '',
      audio_url: lesson.audio_url || '',
      pdf_url: lesson.pdf_url || '',
      lesson_notes: lesson.lesson_notes || '',
      scripture_references: lesson.scripture_references || '',
      estimated_duration_minutes: lesson.estimated_duration_minutes || 30,
      is_required: lesson.is_required,
      quiz_required: lesson.quiz_required,
      module_id: lesson.module_id,
      content_type: lesson.content_type || 'text',
    })
  }

  const saveEditLesson = async () => {
    if (!editLesson) return
    setSavingEdit(true)
    const ytId = editLessonForm.youtube_url ? extractYouTubeId(editLessonForm.youtube_url) : null
    const contentType = ytId ? 'youtube' : editLessonForm.vimeo_url ? 'vimeo' : editLessonForm.audio_url ? 'audio' : editLessonForm.pdf_url ? 'pdf' : editLessonForm.content_type || 'text'
    const { error } = await supabase.from('lessons').update({
      title: editLessonForm.title,
      description: editLessonForm.description || null,
      youtube_url: editLessonForm.youtube_url || null,
      youtube_embed_id: ytId,
      vimeo_url: editLessonForm.vimeo_url || null,
      audio_url: editLessonForm.audio_url || null,
      pdf_url: editLessonForm.pdf_url || null,
      lesson_notes: editLessonForm.lesson_notes || null,
      scripture_references: editLessonForm.scripture_references || null,
      estimated_duration_minutes: editLessonForm.estimated_duration_minutes,
      is_required: editLessonForm.is_required,
      quiz_required: editLessonForm.quiz_required,
      content_type: contentType,
      module_id: editLessonForm.module_id,
    }).eq('id', editLesson.id)
    setSavingEdit(false)
    if (error) toast.error('Failed: ' + error.message)
    else { toast.success('Lesson updated!'); setEditLesson(null); loadCourse() }
  }

  // ── PREVIEW LESSON ──
  const openPreview = async (lesson: Lesson) => {
    setPreviewLesson(lesson)
    setPreviewQuiz([])
    // Load quiz questions if any
    const { data: quizData } = await supabase.from('quizzes').select('id').eq('lesson_id', lesson.id).limit(1)
    if (quizData && quizData.length > 0) {
      const { data: questions } = await supabase.from('quiz_questions').select('*').eq('quiz_id', quizData[0].id).order('order_index')
      setPreviewQuiz(questions || [])
    }
  }

  // ── DRAG & DROP LESSONS (cross-section support) ──
  const handleDragStart = (lessonId: string) => {
    setDragLessonId(lessonId)
  }

  const handleDragOver = (e: React.DragEvent, lessonId: string) => {
    e.preventDefault()
    if (lessonId !== dragLessonId) setDragOverLessonId(lessonId)
  }

  const handleDrop = async (targetModuleId: string) => {
    if (!dragLessonId) { setDragLessonId(null); setDragOverLessonId(null); return }

    const draggedLesson = lessons.find(l => l.id === dragLessonId)
    if (!draggedLesson) { setDragLessonId(null); setDragOverLessonId(null); return }

    const sourceModuleId = draggedLesson.module_id
    const targetLessons = lessons.filter(l => l.module_id === targetModuleId).sort((a, b) => a.order_index - b.order_index)

    // If dropping on a specific lesson, insert at that position
    let insertIdx = targetLessons.length
    if (dragOverLessonId) {
      const overIdx = targetLessons.findIndex(l => l.id === dragOverLessonId)
      if (overIdx !== -1) insertIdx = overIdx
    }

    // Same module reorder
    if (sourceModuleId === targetModuleId) {
      const fromIdx = targetLessons.findIndex(l => l.id === dragLessonId)
      if (fromIdx === -1 || fromIdx === insertIdx) { setDragLessonId(null); setDragOverLessonId(null); return }
      const reordered = [...targetLessons]
      const [moved] = reordered.splice(fromIdx, 1)
      reordered.splice(insertIdx > fromIdx ? insertIdx - 1 : insertIdx, 0, moved)
      for (let i = 0; i < reordered.length; i++) {
        if (reordered[i].order_index !== i) {
          await supabase.from('lessons').update({ order_index: i }).eq('id', reordered[i].id)
        }
      }
    } else {
      // Cross-section move: update module_id and reorder both
      await supabase.from('lessons').update({ module_id: targetModuleId, order_index: insertIdx }).eq('id', dragLessonId)
      // Reorder source module
      const sourceLessons = lessons.filter(l => l.module_id === sourceModuleId && l.id !== dragLessonId).sort((a, b) => a.order_index - b.order_index)
      for (let i = 0; i < sourceLessons.length; i++) {
        if (sourceLessons[i].order_index !== i) {
          await supabase.from('lessons').update({ order_index: i }).eq('id', sourceLessons[i].id)
        }
      }
      // Reorder target module (push existing items after insert point)
      const newTargetLessons = [...targetLessons]
      newTargetLessons.splice(insertIdx, 0, { ...draggedLesson, module_id: targetModuleId } as any)
      for (let i = 0; i < newTargetLessons.length; i++) {
        if (newTargetLessons[i].id !== dragLessonId && newTargetLessons[i].order_index !== i) {
          await supabase.from('lessons').update({ order_index: i }).eq('id', newTargetLessons[i].id)
        }
      }
    }

    setDragLessonId(null)
    setDragOverLessonId(null)
    toast.success(sourceModuleId !== targetModuleId ? 'Lesson moved to new section!' : 'Order saved!')
    loadCourse()
  }

  const duplicateLesson = async (lesson: Lesson) => {
    const modLessons = lessons.filter(l => l.module_id === lesson.module_id)
    const { error } = await supabase.from('lessons').insert({
      module_id: lesson.module_id, title: `${lesson.title} (Copy)`, description: lesson.description,
      content_type: lesson.content_type, order_index: modLessons.length,
      youtube_url: lesson.youtube_url, youtube_embed_id: lesson.youtube_embed_id,
      vimeo_url: lesson.vimeo_url, audio_url: lesson.audio_url, pdf_url: lesson.pdf_url,
      lesson_notes: lesson.lesson_notes, scripture_references: lesson.scripture_references,
      estimated_duration_minutes: lesson.estimated_duration_minutes,
      is_required: lesson.is_required, quiz_required: lesson.quiz_required,
    })
    if (error) toast.error('Failed to duplicate')
    else { toast.success('Lesson duplicated!'); loadCourse() }
  }

  const getContentTypeBadge = (lesson: Lesson) => {
    if (lesson.youtube_embed_id || lesson.vimeo_url) return { label: 'VIDEO', color: 'bg-red-100 text-red-700', icon: Video }
    if (lesson.audio_url) return { label: 'AUDIO', color: 'bg-green-100 text-green-700', icon: Music }
    if (lesson.pdf_url && lesson.pdf_url.endsWith('.pdf')) return { label: 'PDF', color: 'bg-orange-100 text-orange-700', icon: FileText }
    if (lesson.pdf_url) return { label: 'DOC', color: 'bg-amber-100 text-amber-700', icon: File }
    if (lesson.quiz_required) return { label: 'QUIZ/TEST', color: 'bg-purple-100 text-purple-700', icon: BookOpen }
    if (lesson.content_type === 'blog' || lesson.description?.toLowerCase().includes('blog')) return { label: 'BLOG', color: 'bg-sky-100 text-sky-700', icon: FileText }
    if (lesson.content_type === 'guide' || lesson.description?.toLowerCase().includes('guide')) return { label: 'COURSE GUIDE', color: 'bg-teal-100 text-teal-700', icon: BookOpen }
    if (lesson.lesson_notes) return { label: 'TEXT', color: 'bg-gray-100 text-gray-700', icon: FileText }
    return { label: 'EMPTY', color: 'bg-gray-100 text-gray-400', icon: File }
  }

  const ytPreviewId = lessonForm.youtube_url ? extractYouTubeId(lessonForm.youtube_url) : null
  const toggleModule = (id: string) => { const s = new Set(expandedModules); s.has(id) ? s.delete(id) : s.add(id); setExpandedModules(s) }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/admin/courses"><Button variant="ghost" size="sm" className="flex-shrink-0 px-2"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-bold text-[#0a1628] truncate">{course?.title}</h1>
              {course?.is_published ? <Badge className="bg-green-600 text-white text-[10px]">Live</Badge> : <Badge variant="outline" className="text-[10px]">Draft</Badge>}
            </div>
            <p className="text-xs sm:text-sm text-gray-500">{modules.length} sections • {lessons.length} lessons</p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={updateCourse} disabled={saving}><Save className="w-4 h-4 mr-1" />{saving ? 'Saving...' : 'Save'}</Button>
          {course?.is_published ? (
            <Link href={`/courses/${course?.slug}`} target="_blank"><Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-1" /> Preview</Button></Link>
          ) : (
            <Button size="sm" className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold" onClick={publishCourse}>Publish</Button>
          )}
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
              <div className="flex gap-2">
                <select value={COURSE_CATEGORIES.includes(course?.category) ? course?.category : '_custom'} onChange={(e) => { if (e.target.value !== '_custom') setCourse({ ...course, category: e.target.value }) }} className="w-full h-10 px-3 border rounded-md text-sm">
                  <option value="">Select...</option>
                  {COURSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  {course?.category && !COURSE_CATEGORIES.includes(course.category) && <option value="_custom">{course.category} (Custom)</option>}
                  <option value="_custom">+ Add Custom Category</option>
                </select>
              </div>
              {(!COURSE_CATEGORIES.includes(course?.category || '') || course?.category === '') && (
                <Input value={course?.category || ''} onChange={(e) => setCourse({ ...course, category: e.target.value })} placeholder="Type custom category name..." className="mt-2" />
              )}
            </div>
            <div><Label>Visibility</Label>
              <select value={course?.visibility || 'public'} onChange={(e) => setCourse({ ...course, visibility: e.target.value })} className="w-full h-10 px-3 border rounded-md text-sm">
                {VISIBILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select></div>
          </div>
          <div><Label>Description</Label><textarea value={course?.description || ''} onChange={(e) => setCourse({ ...course, description: e.target.value })} className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm" /></div>
          <div><Label>Course Cover Photo</Label>
            <div className="flex items-start gap-4">
              {course?.thumbnail_url && <img src={course.thumbnail_url} alt="Cover" className="w-32 h-20 object-cover rounded border" />}
              <div className="flex-1 space-y-2">
                <Input value={course?.thumbnail_url || ''} onChange={(e) => setCourse({ ...course, thumbnail_url: e.target.value })} placeholder="Paste image URL or upload from device" />
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-2 px-3 py-2 bg-[#0a1628] text-white rounded-lg cursor-pointer hover:bg-[#1a3a5c] text-xs font-medium">
                    <Camera className="w-3.5 h-3.5" /> Upload from Device
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const ext = file.name.split('.').pop()?.toLowerCase()
                      const fileName = `cover-${params.id}-${Date.now()}.${ext}`
                      const { data: sessionData } = await supabase.auth.getSession()
                      const token = sessionData?.session?.access_token
                      try {
                        const signedRes = await fetch('/api/upload', {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                          body: JSON.stringify({ fileName, bucket: 'course-thumbnails' }),
                        })
                        const signedData = await signedRes.json()
                        if (!signedRes.ok) { toast.error(signedData.error || 'Failed to get upload URL'); return }
                        const uploadRes = await fetch(signedData.signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
                        if (!uploadRes.ok) { toast.error('Upload failed'); return }
                        setCourse({ ...course, thumbnail_url: signedData.publicUrl })
                        toast.success('Cover photo uploaded!')
                      } catch (err: any) { toast.error(err.message || 'Upload failed') }
                    }} />
                  </label>
                  <CoverGenerator courseTitle={course?.title || ''} courseCategory={course?.category} courseDescription={course?.description} currentThumbnail={course?.thumbnail_url} onSelectCover={(url) => setCourse({ ...course, thumbnail_url: url })} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructor Management */}
      <Card>
        <CardHeader><CardTitle className="text-lg text-[#0a1628]">Course Instructor(s)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Primary Instructor</Label>
            <select value={course?.instructor_id || ''} onChange={(e) => setCourse({ ...course, instructor_id: e.target.value })} className="w-full h-10 px-3 border rounded-md text-sm">
              <option value="">Select instructor...</option>
              {allTeachers.map((t) => <option key={t.id} value={t.id}>{t.full_name} ({t.role})</option>)}
            </select>
          </div>
          {instructors.length > 0 && (
            <div>
              <Label className="text-xs text-gray-500 mb-2 block">Current Instructor(s)</Label>
              <div className="flex flex-wrap gap-3">
                {instructors.map((instr) => (
                  <div key={instr.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border">
                    {instr.avatar_url ? (
                      <img src={instr.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#0a1628] text-[#c9a227] flex items-center justify-center text-xs font-bold">{instr.full_name?.charAt(0) || '?'}</div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-[#0a1628]">{instr.full_name}</p>
                      <p className="text-[10px] text-gray-500">{instr.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Guide */}
      {modules.length === 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-blue-800 mb-1">Getting Started</p>
            <p className="text-xs text-blue-700">1. Add a Section (e.g. "Week 1") → 2. Add Lessons to it → 3. Save & Publish when ready</p>
          </CardContent>
        </Card>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <button onClick={() => setShowAddModule(!showAddModule)} className={`text-left p-3 sm:p-4 rounded-xl border-2 transition-all hover:shadow-md ${showAddModule ? 'border-[#0a1628] bg-[#0a1628]/5' : 'border-gray-200 hover:border-[#0a1628]/30'}`}>
          <div className="flex items-center gap-2 mb-1"><div className="w-8 h-8 rounded-lg bg-[#0a1628] text-white flex items-center justify-center"><Plus className="w-4 h-4" /></div></div>
          <p className="text-sm font-semibold text-[#0a1628]">Add Section</p>
          <p className="text-[10px] text-gray-500 hidden sm:block">Organize your content into sections</p>
        </button>
        <button onClick={() => setShowAddLesson(!showAddLesson)} className={`text-left p-3 sm:p-4 rounded-xl border-2 transition-all hover:shadow-md ${showAddLesson ? 'border-[#c9a227] bg-[#c9a227]/5' : 'border-gray-200 hover:border-[#c9a227]/30'}`}>
          <div className="flex items-center gap-2 mb-1"><div className="w-8 h-8 rounded-lg bg-[#c9a227] text-[#0a1628] flex items-center justify-center"><Plus className="w-4 h-4" /></div></div>
          <p className="text-sm font-semibold text-[#0a1628]">Add Lesson</p>
          <p className="text-[10px] text-gray-500 hidden sm:block">Create a new lesson with content</p>
        </button>
        <button onClick={() => setShowContentBuilder(!showContentBuilder)} className={`text-left p-3 sm:p-4 rounded-xl border-2 transition-all hover:shadow-md ${showContentBuilder ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
          <div className="flex items-center gap-2 mb-1"><div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center"><Wand2 className="w-4 h-4" /></div></div>
          <p className="text-sm font-semibold text-[#0a1628]">Content Creator</p>
          <p className="text-[10px] text-gray-500 hidden sm:block">AI-powered content generation</p>
        </button>
        <button onClick={() => setShowBulkUpload(!showBulkUpload)} className={`text-left p-3 sm:p-4 rounded-xl border-2 transition-all hover:shadow-md ${showBulkUpload ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
          <div className="flex items-center gap-2 mb-1"><div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center"><Upload className="w-4 h-4" /></div></div>
          <p className="text-sm font-semibold text-[#0a1628]">Bulk Upload</p>
          <p className="text-[10px] text-gray-500 hidden sm:block">Import multiple files or links</p>
        </button>
        <button onClick={() => { setExpandedModules(new Set(modules.map((m: any) => m.id))) }} className="text-left p-3 sm:p-4 rounded-xl border-2 border-gray-200 hover:border-gray-400 transition-all hover:shadow-md">
          <div className="flex items-center gap-2 mb-1"><div className="w-8 h-8 rounded-lg bg-gray-600 text-white flex items-center justify-center"><GripVertical className="w-4 h-4" /></div></div>
          <p className="text-sm font-semibold text-[#0a1628]">Reorder</p>
          <p className="text-[10px] text-gray-500 hidden sm:block">Expand all &amp; drag to reorder</p>
        </button>
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
              <div>
                <h3 className="font-semibold text-[#0a1628]">New Lesson</h3>
                <p className="text-xs text-gray-500">Fill in the title and add content (video, audio, PDF, or text notes). Only the title is required.</p>
              </div>
              <div><Label>Title *</Label><Input value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} required placeholder="e.g. Introduction to Faith" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Duration (min)</Label><Input type="number" value={lessonForm.estimated_duration_minutes} onChange={(e) => setLessonForm({ ...lessonForm, estimated_duration_minutes: parseInt(e.target.value) || 0 })} /></div>
                <div><Label>Add to Section</Label>
                  <select value={lessonForm.targetModule} onChange={(e) => setLessonForm({ ...lessonForm, targetModule: e.target.value })} className="w-full h-10 px-3 border rounded-md text-sm">
                    <option value="">First section</option>
                    {modules.map((m: any) => <option key={m.id} value={m.id}>{m.title}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label><Youtube className="w-3 h-3 inline mr-1" />YouTube URL</Label><Input value={lessonForm.youtube_url} onChange={(e) => setLessonForm({ ...lessonForm, youtube_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." /></div>
                <div><Label><Video className="w-3 h-3 inline mr-1" />Vimeo URL</Label><Input value={lessonForm.vimeo_url} onChange={(e) => setLessonForm({ ...lessonForm, vimeo_url: e.target.value })} placeholder="https://vimeo.com/..." /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <Button variant="ghost" size="sm" onClick={() => { setShowBulkUpload(false); setUploadQueue([]) }}><X className="w-4 h-4" /></Button>
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

            <div className="border-t pt-4 space-y-3">
              <Label className="text-sm font-semibold">Option B: Upload Files</Label>

              {/* Drag-and-Drop Zone */}
              <div
                onDragOver={handleFileDragOver}
                onDragLeave={handleFileDragLeave}
                onDrop={handleFileDrop}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${dragActive ? 'border-[#c9a227] bg-[#c9a227]/5' : 'border-gray-300 hover:border-[#0a1628]/30'}`}
              >
                <Upload className={`w-10 h-10 mx-auto mb-3 ${dragActive ? 'text-[#c9a227]' : 'text-gray-400'}`} />
                <p className="text-sm font-medium text-[#0a1628] mb-1">{dragActive ? 'Drop files here' : 'Drag & drop files here'}</p>
                <p className="text-xs text-gray-400 mb-3">Videos (MP4, MOV, WebM), Audio (MP3, WAV), PDFs, Documents</p>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#0a1628] text-white rounded-lg cursor-pointer hover:bg-[#1a3a5c] text-sm">
                  <FileUp className="w-4 h-4" /> Browse Files
                  <input type="file" multiple accept="video/*,audio/*,.pdf,.doc,.docx" className="hidden" onChange={(e) => { const newFiles = Array.from(e.target.files || []); setBulkFiles(prev => [...prev, ...newFiles]) }} />
                </label>
              </div>

              {/* File Queue with Progress */}
              {(bulkFiles.length > 0 || uploadQueue.length > 0) && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(uploadQueue.length > 0 ? uploadQueue : bulkFiles.map(f => ({ file: f, status: 'pending' as const, progress: 0 }))).map((item, i) => {
                    const ext = item.file.name.split('.').pop()?.toLowerCase() || ''
                    const isVideo = ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)
                    const isAudio = ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)
                    const isPdf = ext === 'pdf'
                    return (
                      <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${item.status === 'failed' ? 'bg-red-50 border-red-200' : item.status === 'done' ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isVideo ? 'bg-red-100' : isAudio ? 'bg-green-100' : isPdf ? 'bg-orange-100' : 'bg-gray-100'}`}>
                          {isVideo ? <Video className="w-4 h-4 text-red-600" /> : isAudio ? <Music className="w-4 h-4 text-green-600" /> : <FileText className="w-4 h-4 text-orange-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{item.file.name}</p>
                          <p className="text-[10px] text-gray-400">{(item.file.size / 1024 / 1024).toFixed(1)} MB</p>
                          {item.status === 'uploading' && (
                            <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                              <div className="h-full bg-[#c9a227] rounded-full transition-all" style={{ width: `${item.progress}%` }} />
                            </div>
                          )}
                          {item.status === 'failed' && item.error && <p className="text-[10px] text-red-600 mt-0.5">{item.error}</p>}
                        </div>
                        <div className="flex-shrink-0">
                          {item.status === 'pending' && <span className="text-[10px] text-gray-400 font-medium">Queued</span>}
                          {item.status === 'uploading' && <Loader2 className="w-4 h-4 text-[#c9a227] animate-spin" />}
                          {item.status === 'done' && <span className="text-[10px] text-green-600 font-bold">Done</span>}
                          {item.status === 'failed' && <button onClick={() => retryUpload(i)} className="text-[10px] text-red-600 font-bold hover:underline">Retry</button>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {bulkFiles.length > 0 && !bulkUploading && (
                <div className="flex gap-2">
                  <Button onClick={() => handleBulkFiles()} className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold flex-1">
                    <Upload className="w-4 h-4 mr-2" /> Upload {bulkFiles.length} file(s)
                  </Button>
                  <Button variant="outline" onClick={() => { setBulkFiles([]); setUploadQueue([]) }}>Clear</Button>
                </div>
              )}
              {bulkUploading && (
                <div className="flex items-center gap-2 text-sm text-[#c9a227] font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" /> Uploading... do not close this page
                </div>
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

      {/* Course Structure */}
      <div className="flex items-center gap-2 mt-2">
        <BookOpen className="w-5 h-5 text-[#0a1628]" />
        <h2 className="text-lg font-bold text-[#0a1628]">Course Structure</h2>
        <span className="text-xs text-gray-400 ml-1">Drag lessons to reorder or move between sections</span>
      </div>
      {modules.length === 0 && lessons.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-gray-400"><FileText className="w-12 h-12 mx-auto mb-3" /><p>No content yet. Add a section or lesson above.</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {modules.map((mod, modIdx) => {
            const modLessons = lessons.filter(l => l.module_id === mod.id).sort((a, b) => a.order_index - b.order_index)
            const isExpanded = expandedModules.has(mod.id)
            return (
              <Card key={mod.id} className="border-l-4 border-l-[#0a1628]">
                <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 border-b cursor-pointer" onClick={() => toggleModule(mod.id)}>
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); moveModule(mod.id, 'up') }} className="text-gray-400 hover:text-[#0a1628] p-0.5" title="Move Up"><ArrowUp className="w-3 h-3" /></button>
                    <button onClick={(e) => { e.stopPropagation(); moveModule(mod.id, 'down') }} className="text-gray-400 hover:text-[#0a1628] p-0.5" title="Move Down"><ArrowDown className="w-3 h-3" /></button>
                  </div>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-[#0a1628] text-[#c9a227] flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">{modIdx + 1}</div>
                  <div className="flex-1 min-w-0">
                    {editingModule === mod.id ? (
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Input value={editModuleTitle} onChange={(e) => setEditModuleTitle(e.target.value)} className="h-8 text-sm" autoFocus onKeyDown={(e) => e.key === 'Enter' && updateModuleTitle(mod.id)} />
                        <Button size="sm" onClick={() => updateModuleTitle(mod.id)} className="h-8">Save</Button>
                      </div>
                    ) : (
                      <p className="font-semibold text-[#0a1628] text-sm sm:text-base truncate">{mod.title}</p>
                    )}
                    <p className="text-[10px] sm:text-xs text-gray-500">{modLessons.length} lesson{modLessons.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setEditingModule(mod.id); setEditModuleTitle(mod.title) }} className="p-1.5 rounded hover:bg-gray-200 text-gray-500" title="Edit"><PenTool className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteModule(mod.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>
                {isExpanded && (
                  <CardContent className="p-0" onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }} onDrop={() => handleDrop(mod.id)}>
                    {modLessons.length === 0 ? (
                      <div className={`text-center py-6 text-sm transition-colors ${dragLessonId ? 'bg-[#c9a227]/10 border-2 border-dashed border-[#c9a227] text-[#c9a227] font-medium' : 'text-gray-400'}`}>{dragLessonId ? 'Drop lesson here' : 'No lessons in this section'}</div>
                    ) : modLessons.map((lesson, lesIdx) => {
                      const badge = getContentTypeBadge(lesson); const BadgeIcon = badge.icon
                      return (
                        <div key={lesson.id} draggable onDragStart={() => handleDragStart(lesson.id)} onDragOver={(e) => handleDragOver(e, lesson.id)} onDragEnd={() => { setDragLessonId(null); setDragOverLessonId(null) }}
                          className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 border-b last:border-b-0 hover:bg-gray-50/50 transition-all ${dragOverLessonId === lesson.id ? 'bg-[#c9a227]/10 border-t-2 border-t-[#c9a227]' : ''} ${dragLessonId === lesson.id ? 'opacity-50' : ''}`}>
                          <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-[#0a1628] flex-shrink-0" title="Drag to reorder"><GripVertical className="w-4 h-4" /></div>
                          <div className="w-7 h-7 rounded-full bg-[#0a1628]/10 text-[#0a1628] flex items-center justify-center text-xs font-bold flex-shrink-0">{lesIdx + 1}</div>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-[#0a1628] text-xs sm:text-sm truncate">{lesson.title}</p>
                              <Badge className={`text-[8px] sm:text-[9px] ${badge.color} flex items-center gap-0.5 flex-shrink-0 whitespace-nowrap`}><BadgeIcon className="w-2.5 h-2.5" />{badge.label}</Badge>
                              {lesson.quiz_required && <Badge className="text-[8px] sm:text-[9px] bg-purple-100 text-purple-700 flex-shrink-0">Quiz</Badge>}
                            </div>
                            <p className="text-[10px] sm:text-xs text-gray-500 truncate">{lesson.description || lesson.scripture_references || 'No description'}</p>
                          </div>
                          <div className="text-xs text-gray-400 whitespace-nowrap hidden sm:block">{lesson.estimated_duration_minutes || '\u2014'} min</div>
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <Button variant="ghost" size="sm" onClick={() => openPreview(lesson)} title="Preview lesson" className="text-blue-600 hover:bg-blue-50 px-1.5"><Eye className="w-3.5 h-3.5" /><span className="hidden md:inline ml-1 text-[10px]">Preview</span></Button>
                            <Button variant="ghost" size="sm" onClick={() => openEditLesson(lesson)} title="Edit lesson" className="text-[#c9a227] hover:bg-yellow-50 px-1.5"><Pencil className="w-3.5 h-3.5" /><span className="hidden md:inline ml-1 text-[10px]">Edit</span></Button>
                            <Button variant="ghost" size="sm" onClick={() => duplicateLesson(lesson)} title="Duplicate lesson" className="text-gray-500 hover:bg-gray-100 px-1.5 hidden sm:flex"><Copy className="w-3.5 h-3.5" /><span className="hidden md:inline ml-1 text-[10px]">Duplicate</span></Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteLesson(lesson.id)} title="Delete lesson" className="text-red-500 hover:bg-red-50 px-1.5"><Trash2 className="w-3.5 h-3.5" /><span className="hidden md:inline ml-1 text-[10px]">Delete</span></Button>
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* ═══ PREVIEW MODAL ═══ */}
      {previewLesson && (<>
        <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setPreviewLesson(null)} />
        <div className="fixed inset-0 sm:inset-4 md:inset-8 lg:inset-y-8 lg:inset-x-[12%] bg-white sm:rounded-2xl z-50 flex flex-col overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b bg-gray-50 flex-shrink-0">
            <div className="flex-1 min-w-0 mr-2">
              <h3 className="text-base sm:text-lg font-bold text-[#0a1628] truncate">{previewLesson.title}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {(() => { const b = getContentTypeBadge(previewLesson); const I = b.icon; return <Badge className={`text-[10px] ${b.color}`}><I className="w-3 h-3 mr-0.5" />{b.label}</Badge> })()}
                {previewLesson.estimated_duration_minutes && <span className="text-xs text-gray-500">{previewLesson.estimated_duration_minutes} min</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={() => { const l = previewLesson; setPreviewLesson(null); openEditLesson(l) }}><Pencil className="w-3.5 h-3.5 mr-1" />Edit</Button>
              <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => { deleteLesson(previewLesson.id); setPreviewLesson(null) }}><Trash2 className="w-3.5 h-3.5 mr-1" />Delete</Button>
              <button onClick={() => setPreviewLesson(null)} className="p-2 hover:bg-gray-200 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
            {previewLesson.youtube_embed_id && <div className="mb-6 rounded-xl overflow-hidden border bg-black"><iframe src={youtubeEmbedUrl(previewLesson.youtube_embed_id)} className="w-full aspect-video" allowFullScreen title="Preview" /></div>}
            {previewLesson.vimeo_url && <div className="mb-6 rounded-xl overflow-hidden border bg-black"><iframe src={previewLesson.vimeo_url.replace('vimeo.com/', 'player.vimeo.com/video/')} className="w-full aspect-video" allowFullScreen title="Preview" /></div>}
            {previewLesson.audio_url && <div className="mb-6 p-4 bg-gray-50 rounded-xl border"><p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><Music className="w-4 h-4" />Audio</p><audio controls className="w-full" src={previewLesson.audio_url} /></div>}
            {previewLesson.pdf_url && <div className="mb-6"><div className="flex items-center justify-between mb-2"><p className="text-sm font-medium text-gray-700">{previewLesson.pdf_url.endsWith('.pdf') ? 'PDF Document' : 'Document'}</p><a href={previewLesson.pdf_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Open in new tab</a></div>{previewLesson.pdf_url.endsWith('.pdf') ? <iframe src={previewLesson.pdf_url} className="w-full h-[500px] rounded-xl border" title="PDF" /> : <div className="p-6 border rounded-xl text-center bg-gray-50"><File className="w-12 h-12 mx-auto mb-3 text-gray-400" /><p className="text-sm text-gray-600">Document preview not available. Click &ldquo;Open in new tab&rdquo; to view.</p></div>}</div>}
            {previewLesson.lesson_notes && <div className="mb-6"><p className="text-sm font-semibold text-[#0a1628] mb-3">{previewLesson.content_type === 'blog' ? 'Blog Content' : previewLesson.content_type === 'guide' ? 'Course Guide' : 'Lesson Notes'}</p><article className="max-w-2xl mx-auto"><div className="bg-white rounded-xl border p-6 sm:p-8 text-gray-800 whitespace-pre-wrap" style={{ fontFamily: 'Georgia, serif', lineHeight: '1.8' }}>{previewLesson.lesson_notes}</div></article></div>}
            {previewLesson.scripture_references && <div className="mb-6 p-4 bg-[#0a1628]/5 rounded-xl"><p className="text-sm font-semibold text-[#0a1628] mb-1">Scripture References</p><p className="text-sm text-gray-700">{previewLesson.scripture_references}</p></div>}
            {previewQuiz.length > 0 && <div className="mb-6"><p className="text-sm font-semibold text-[#0a1628] mb-3">Quiz Preview ({previewQuiz.length} questions)</p><div className="space-y-4">{previewQuiz.map((q: any, qi: number) => (<div key={q.id} className="p-4 border rounded-xl bg-gray-50"><p className="text-sm font-medium text-[#0a1628]">{qi + 1}. {q.question_text}</p>{q.options && <div className="mt-2 space-y-1">{(Array.isArray(q.options) ? q.options : []).map((opt: string, oi: number) => (<div key={oi} className="flex items-center gap-2 text-sm text-gray-600"><div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center text-[10px]">{String.fromCharCode(65 + oi)}</div>{opt}</div>))}</div>}</div>))}</div></div>}
            {!previewLesson.youtube_embed_id && !previewLesson.vimeo_url && !previewLesson.audio_url && !previewLesson.pdf_url && !previewLesson.lesson_notes && previewQuiz.length === 0 && <div className="text-center py-12 text-gray-400"><FileText className="w-12 h-12 mx-auto mb-3" /><p>No content attached yet.</p></div>}
          </div>
        </div>
      </>)}

      {/* ═══ EDIT LESSON MODAL ═══ */}
      {editLesson && (<>
        <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setEditLesson(null)} />
        <div className="fixed inset-0 sm:inset-4 md:inset-8 lg:inset-y-8 lg:inset-x-[15%] bg-white sm:rounded-2xl z-50 flex flex-col overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b bg-gray-50 flex-shrink-0">
            <h3 className="text-lg font-bold text-[#0a1628]">Edit Lesson</h3>
            <div className="flex items-center gap-2">
              <Button onClick={saveEditLesson} disabled={savingEdit} className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold" size="sm"><Save className="w-3.5 h-3.5 mr-1" />{savingEdit ? 'Saving...' : 'Save'}</Button>
              <button onClick={() => setEditLesson(null)} className="p-2 hover:bg-gray-200 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>Title</Label><Input value={editLessonForm.title || ''} onChange={(e) => setEditLessonForm({ ...editLessonForm, title: e.target.value })} /></div>
              <div><Label>Duration (min)</Label><Input type="number" value={editLessonForm.estimated_duration_minutes || 0} onChange={(e) => setEditLessonForm({ ...editLessonForm, estimated_duration_minutes: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <div><Label>Description</Label><Input value={editLessonForm.description || ''} onChange={(e) => setEditLessonForm({ ...editLessonForm, description: e.target.value })} /></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>Move to Module</Label><select value={editLessonForm.module_id || ''} onChange={(e) => setEditLessonForm({ ...editLessonForm, module_id: e.target.value })} className="w-full h-10 px-3 border rounded-md text-sm">{modules.map((m: any) => <option key={m.id} value={m.id}>{m.title}</option>)}</select></div>
              <div><Label>Content Type</Label><select value={editLessonForm.content_type || 'text'} onChange={(e) => setEditLessonForm({ ...editLessonForm, content_type: e.target.value })} className="w-full h-10 px-3 border rounded-md text-sm"><option value="text">Text</option><option value="youtube">Video (YouTube)</option><option value="vimeo">Video (Vimeo)</option><option value="audio">Audio</option><option value="pdf">PDF</option><option value="doc">Document</option><option value="blog">Blog</option><option value="guide">Course Guide</option><option value="quiz">Quiz/Test</option></select></div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>YouTube URL</Label><Input value={editLessonForm.youtube_url || ''} onChange={(e) => setEditLessonForm({ ...editLessonForm, youtube_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." /></div>
              <div><Label>Vimeo URL</Label><Input value={editLessonForm.vimeo_url || ''} onChange={(e) => setEditLessonForm({ ...editLessonForm, vimeo_url: e.target.value })} /></div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>Audio URL</Label><Input value={editLessonForm.audio_url || ''} onChange={(e) => setEditLessonForm({ ...editLessonForm, audio_url: e.target.value })} /></div>
              <div><Label>PDF/Doc URL</Label><Input value={editLessonForm.pdf_url || ''} onChange={(e) => setEditLessonForm({ ...editLessonForm, pdf_url: e.target.value })} /></div>
            </div>
            <div><Label>Lesson Notes</Label><textarea value={editLessonForm.lesson_notes || ''} onChange={(e) => setEditLessonForm({ ...editLessonForm, lesson_notes: e.target.value })} className="w-full min-h-[120px] px-3 py-2 border rounded-md text-sm" /></div>
            <div><Label>Scripture References</Label><Input value={editLessonForm.scripture_references || ''} onChange={(e) => setEditLessonForm({ ...editLessonForm, scripture_references: e.target.value })} /></div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editLessonForm.is_required || false} onChange={(e) => setEditLessonForm({ ...editLessonForm, is_required: e.target.checked })} className="w-4 h-4" /><span className="text-sm">Required</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editLessonForm.quiz_required || false} onChange={(e) => setEditLessonForm({ ...editLessonForm, quiz_required: e.target.checked })} className="w-4 h-4" /><span className="text-sm">Quiz required</span></label>
            </div>
          </div>
        </div>
      </>)}
    </div>
  )
}
