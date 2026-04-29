'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { COURSE_CATEGORIES, VISIBILITY_OPTIONS, extractYouTubeId, youtubeEmbedUrl } from '@/lib/constants'
import { ArrowLeft, Save, Eye, Plus, Trash2, GripVertical, Youtube, FileText, Sparkles, Upload } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import CoverGenerator from '@/components/cover-generator'

interface Lesson {
  id: string
  title: string
  description: string
  content_type: string
  order_index: number
  youtube_url: string | null
  youtube_embed_id: string | null
  pdf_url: string | null
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
  const [generatingQuiz, setGeneratingQuiz] = useState<string | null>(null)
  const [generatingTemplate, setGeneratingTemplate] = useState<string | null>(null)

  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    youtube_url: '',
    lesson_notes: '',
    scripture_references: '',
    estimated_duration_minutes: 30,
    is_required: true,
    quiz_required: false,
  })

  useEffect(() => {
    loadCourse()
  }, [params.id])

  const loadCourse = async () => {
    const { data: courseData } = await supabase
      .from('courses')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!courseData) {
      router.push('/admin/courses')
      return
    }

    setCourse(courseData)

    const { data: modulesData } = await supabase
      .from('modules')
      .select('*')
      .eq('course_id', params.id)
      .order('order_index')

    setModules(modulesData || [])

    if (modulesData && modulesData.length > 0) {
      const moduleIds = modulesData.map((m: any) => m.id)
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .in('module_id', moduleIds)
        .order('order_index')

      setLessons(lessonsData || [])
    }

    setLoading(false)
  }

  const updateCourse = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('courses')
      .update({
        title: course.title,
        subtitle: course.subtitle,
        slug: course.slug,
        description: course.description,
        long_description: course.long_description,
        category: course.category,
        is_free: course.is_free,
        price: course.is_free ? 0 : course.price,
        visibility: course.visibility,
        thumbnail_url: course.thumbnail_url,
      })
      .eq('id', params.id)

    setSaving(false)
    if (error) {
      toast.error('Failed to save: ' + error.message)
    } else {
      toast.success('Course updated!')
    }
  }

  const publishCourse = async () => {
    const { error } = await supabase
      .from('courses')
      .update({ is_published: true, status: 'published' })
      .eq('id', params.id)

    if (error) {
      toast.error('Failed to publish')
    } else {
      toast.success('Course published!')
      setCourse({ ...course, is_published: true, status: 'published' })
    }
  }

  const addLesson = async (e: React.FormEvent) => {
    e.preventDefault()

    let moduleId = modules[0]?.id
    if (!moduleId) {
      const { data: newModule, error: modErr } = await supabase
        .from('modules')
        .insert({
          course_id: params.id,
          title: 'Main Module',
          order_index: 0,
        })
        .select()
        .single()

      if (modErr || !newModule) {
        toast.error('Failed to create module')
        return
      }
      moduleId = newModule.id
      setModules([newModule])
    }

    const ytId = lessonForm.youtube_url ? extractYouTubeId(lessonForm.youtube_url) : null

    const { error } = await supabase
      .from('lessons')
      .insert({
        module_id: moduleId,
        title: lessonForm.title,
        description: lessonForm.description,
        content_type: ytId ? 'youtube' : 'text',
        order_index: lessons.length,
        youtube_url: lessonForm.youtube_url || null,
        youtube_embed_id: ytId,
        lesson_notes: lessonForm.lesson_notes || null,
        scripture_references: lessonForm.scripture_references || null,
        estimated_duration_minutes: lessonForm.estimated_duration_minutes,
        is_required: lessonForm.is_required,
        quiz_required: lessonForm.quiz_required,
      })

    if (error) {
      toast.error('Failed to add lesson: ' + error.message)
    } else {
      toast.success('Lesson added!')
      setLessonForm({
        title: '', description: '', youtube_url: '', lesson_notes: '',
        scripture_references: '', estimated_duration_minutes: 30, is_required: true, quiz_required: false,
      })
      setShowAddLesson(false)
      loadCourse()
    }
  }

  const deleteLesson = async (lessonId: string) => {
    if (!confirm('Delete this lesson?')) return
    const { error } = await supabase.from('lessons').delete().eq('id', lessonId)
    if (error) {
      toast.error('Failed to delete')
    } else {
      toast.success('Lesson deleted')
      loadCourse()
    }
  }

  const generateQuiz = async (lesson: Lesson) => {
    setGeneratingQuiz(lesson.id)
    try {
      const res = await fetch('/api/gemini/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonTitle: lesson.title,
          lessonNotes: lesson.lesson_notes,
          scriptureReferences: lesson.scripture_references,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const quiz = data.quiz
      const { data: quizRow, error: qErr } = await supabase
        .from('quizzes')
        .insert({
          lesson_id: lesson.id,
          course_id: params.id,
          title: quiz.title,
          description: quiz.description,
          passing_score: quiz.passing_score || 70,
        })
        .select()
        .single()

      if (qErr || !quizRow) throw new Error('Failed to save quiz')

      const questions = quiz.questions.map((q: any, i: number) => ({
        quiz_id: quizRow.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        correct_answer: q.correct_answer,
        points: q.points || 1,
        order_index: i,
        teacher_review_required: q.teacher_review_required || false,
      }))

      const { error: questErr } = await supabase.from('quiz_questions').insert(questions)
      if (questErr) throw new Error('Failed to save questions')

      toast.success(`Quiz generated with ${questions.length} questions!`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate quiz')
    }
    setGeneratingQuiz(null)
  }

  const generateLessonTemplate = async (lesson: Lesson) => {
    setGeneratingTemplate(lesson.id)
    try {
      const res = await fetch('/api/gemini/generate-lesson-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonTitle: lesson.title,
          courseTitle: course?.title,
          category: course?.category,
          scriptureReferences: lesson.scripture_references,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const tpl = data.template
      const { error } = await supabase
        .from('lessons')
        .update({
          lesson_notes: tpl.lesson_notes || tpl.overview,
          scripture_references: tpl.key_scriptures?.map((s: any) => s.reference).join(', '),
          description: tpl.overview?.substring(0, 500),
        })
        .eq('id', lesson.id)

      if (error) throw new Error('Failed to update lesson')
      toast.success('Lesson template applied!')
      loadCourse()
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate template')
    }
    setGeneratingTemplate(null)
  }

  const ytPreviewId = lessonForm.youtube_url ? extractYouTubeId(lessonForm.youtube_url) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/courses"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button></Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#0a1628]">{course?.title}</h1>
              {course?.is_published ? (
                <Badge className="bg-green-600 text-white">Published</Badge>
              ) : (
                <Badge variant="outline">Draft</Badge>
              )}
            </div>
            <p className="text-sm text-gray-500">{lessons.length} lessons</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={updateCourse} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save'}
          </Button>
          {!course?.is_published && (
            <Button className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold" onClick={publishCourse}>
              <Eye className="w-4 h-4 mr-2" /> Publish
            </Button>
          )}
        </div>
      </div>

      {/* Course Details (Editable) */}
      <Card>
        <CardHeader><CardTitle className="text-lg text-[#0a1628]">Course Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Title</Label>
              <Input value={course?.title || ''} onChange={(e) => setCourse({ ...course, title: e.target.value })} />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Input value={course?.subtitle || ''} onChange={(e) => setCourse({ ...course, subtitle: e.target.value })} />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <select value={course?.category || ''} onChange={(e) => setCourse({ ...course, category: e.target.value })} className="w-full h-10 px-3 border rounded-md text-sm">
                <option value="">Select...</option>
                {COURSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>Visibility</Label>
              <select value={course?.visibility || 'public'} onChange={(e) => setCourse({ ...course, visibility: e.target.value })} className="w-full h-10 px-3 border rounded-md text-sm">
                {VISIBILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <textarea value={course?.description || ''} onChange={(e) => setCourse({ ...course, description: e.target.value })} className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm" />
          </div>
          <div>
            <Label>Thumbnail</Label>
            <div className="flex items-start gap-4">
              {course?.thumbnail_url && (
                <img src={course.thumbnail_url} alt="Cover" className="w-32 h-20 object-cover rounded border" />
              )}
              <div className="flex-1 space-y-2">
                <Input value={course?.thumbnail_url || ''} onChange={(e) => setCourse({ ...course, thumbnail_url: e.target.value })} placeholder="Paste image URL or upload" />
                <CoverGenerator
                  courseTitle={course?.title || ''}
                  courseCategory={course?.category}
                  courseDescription={course?.description}
                  currentThumbnail={course?.thumbnail_url}
                  onSelectCover={(url) => setCourse({ ...course, thumbnail_url: url })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lessons */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-[#0a1628]">Lessons ({lessons.length})</CardTitle>
          <Button onClick={() => setShowAddLesson(!showAddLesson)} className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold" size="sm">
            <Plus className="w-4 h-4 mr-1" /> Add Lesson
          </Button>
        </CardHeader>
        <CardContent>
          {/* Add Lesson Form */}
          {showAddLesson && (
            <Card className="mb-6 border-[#c9a227] border-2">
              <CardContent className="p-4">
                <form onSubmit={addLesson} className="space-y-4">
                  <h3 className="font-semibold text-[#0a1628]">New Lesson</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Lesson Title *</Label>
                      <Input value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} required />
                    </div>
                    <div>
                      <Label>Duration (minutes)</Label>
                      <Input type="number" value={lessonForm.estimated_duration_minutes} onChange={(e) => setLessonForm({ ...lessonForm, estimated_duration_minutes: parseInt(e.target.value) || 0 })} />
                    </div>
                  </div>

                  <div>
                    <Label>YouTube Video URL</Label>
                    <Input
                      value={lessonForm.youtube_url}
                      onChange={(e) => setLessonForm({ ...lessonForm, youtube_url: e.target.value })}
                      placeholder="https://youtube.com/watch?v=... or youtu.be/..."
                    />
                    {ytPreviewId && (
                      <div className="mt-3 rounded-lg overflow-hidden border">
                        <iframe
                          src={youtubeEmbedUrl(ytPreviewId)}
                          className="w-full aspect-video"
                          allowFullScreen
                          title="YouTube Preview"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Lesson Notes</Label>
                    <textarea value={lessonForm.lesson_notes} onChange={(e) => setLessonForm({ ...lessonForm, lesson_notes: e.target.value })} className="w-full min-h-[100px] px-3 py-2 border rounded-md text-sm" placeholder="Lesson content, key points..." />
                  </div>

                  <div>
                    <Label>Scripture References</Label>
                    <Input value={lessonForm.scripture_references} onChange={(e) => setLessonForm({ ...lessonForm, scripture_references: e.target.value })} placeholder="John 3:16, Romans 8:28, ..." />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Input value={lessonForm.description} onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })} placeholder="Brief lesson description" />
                  </div>

                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={lessonForm.is_required} onChange={(e) => setLessonForm({ ...lessonForm, is_required: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">Required for completion</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={lessonForm.quiz_required} onChange={(e) => setLessonForm({ ...lessonForm, quiz_required: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm">Quiz required</span>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="bg-[#0a1628] text-white hover:bg-[#1a3a5c]">Add Lesson</Button>
                    <Button type="button" variant="ghost" onClick={() => setShowAddLesson(false)}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Lessons List */}
          {lessons.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3" />
              <p>No lessons yet. Add your first lesson above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lessons.map((lesson, index) => (
                <div key={lesson.id} className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="text-gray-400"><GripVertical className="w-4 h-4" /></div>
                  <div className="w-8 h-8 rounded-full bg-[#0a1628] text-[#c9a227] flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[#0a1628] truncate">{lesson.title}</p>
                      {lesson.youtube_embed_id && <Youtube className="w-4 h-4 text-red-600" />}
                      {lesson.quiz_required && <Badge className="text-[10px] bg-purple-100 text-purple-700">Quiz</Badge>}
                      {lesson.is_required && <Badge className="text-[10px] bg-blue-100 text-blue-700">Required</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{lesson.description || lesson.scripture_references || 'No description'}</p>
                  </div>
                  <div className="text-xs text-gray-400">{lesson.estimated_duration_minutes || '—'} min</div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => generateLessonTemplate(lesson)}
                      disabled={generatingTemplate === lesson.id}
                      title="Generate Lesson Template"
                    >
                      <Sparkles className={`w-4 h-4 ${generatingTemplate === lesson.id ? 'animate-spin text-[#c9a227]' : 'text-blue-600'}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => generateQuiz(lesson)}
                      disabled={generatingQuiz === lesson.id}
                      title="Generate Quiz with AI"
                    >
                      <Sparkles className={`w-4 h-4 ${generatingQuiz === lesson.id ? 'animate-spin text-[#c9a227]' : 'text-purple-600'}`} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteLesson(lesson.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
