'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { extractYouTubeId, youtubeEmbedUrl } from '@/lib/constants'
import { ArrowLeft, Save, Youtube, Sparkles, Upload } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function NewLessonPage() {
  const router = useRouter()
  const supabase = createClient()
  const [courses, setCourses] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [saving, setSaving] = useState(false)
  const [generatingTemplate, setGeneratingTemplate] = useState(false)

  const [form, setForm] = useState({
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
    loadCourses()
  }, [])

  useEffect(() => {
    if (selectedCourse) loadModules(selectedCourse)
  }, [selectedCourse])

  const loadCourses = async () => {
    const { data } = await supabase.from('courses').select('id, title').order('title')
    setCourses(data || [])
  }

  const loadModules = async (courseId: string) => {
    const { data } = await supabase.from('modules').select('*').eq('course_id', courseId).order('order_index')
    setModules(data || [])
  }

  const handleGenerateTemplate = async () => {
    if (!form.title) { toast.error('Enter a lesson title first'); return }
    setGeneratingTemplate(true)
    try {
      const course = courses.find((c) => c.id === selectedCourse)
      const res = await fetch('/api/gemini/generate-lesson-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonTitle: form.title,
          courseTitle: course?.title || '',
          scriptureReferences: form.scripture_references,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const tpl = data.template
      setForm({
        ...form,
        description: tpl.overview?.substring(0, 500) || form.description,
        lesson_notes: tpl.lesson_notes || tpl.overview || form.lesson_notes,
        scripture_references: tpl.key_scriptures?.map((s: any) => s.reference).join(', ') || form.scripture_references,
      })
      toast.success('Template generated!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate template')
    }
    setGeneratingTemplate(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCourse || !form.title) { toast.error('Select a course and enter a title'); return }
    setSaving(true)

    let moduleId = modules[0]?.id
    if (!moduleId) {
      const { data: newMod } = await supabase
        .from('modules')
        .insert({ course_id: selectedCourse, title: 'Main Module', order_index: 0 })
        .select().single()
      if (!newMod) { toast.error('Failed to create module'); setSaving(false); return }
      moduleId = newMod.id
    }

    const ytId = form.youtube_url ? extractYouTubeId(form.youtube_url) : null
    const lessonCount = await supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('module_id', moduleId)

    const { error } = await supabase.from('lessons').insert({
      module_id: moduleId,
      title: form.title,
      description: form.description,
      content_type: ytId ? 'youtube' : 'text',
      order_index: lessonCount.count || 0,
      youtube_url: form.youtube_url || null,
      youtube_embed_id: ytId,
      lesson_notes: form.lesson_notes || null,
      scripture_references: form.scripture_references || null,
      estimated_duration_minutes: form.estimated_duration_minutes,
      is_required: form.is_required,
      quiz_required: form.quiz_required,
    })

    setSaving(false)
    if (error) { toast.error('Failed: ' + error.message); return }
    toast.success('Lesson created!')
    router.push(`/admin/courses/${selectedCourse}/edit`)
  }

  const ytPreviewId = form.youtube_url ? extractYouTubeId(form.youtube_url) : null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/lessons"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-[#0a1628]">Add New Lesson</h1>
          <p className="text-sm text-gray-500">Create a lesson and attach it to a course</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-lg text-[#0a1628]">Course Assignment</CardTitle></CardHeader>
          <CardContent>
            <Label>Select Course *</Label>
            <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="w-full h-10 px-3 border rounded-md text-sm" required>
              <option value="">Choose a course...</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-[#0a1628]">Lesson Details</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={handleGenerateTemplate} disabled={generatingTemplate}>
              <Sparkles className={`w-4 h-4 mr-1 ${generatingTemplate ? 'animate-spin' : ''}`} />
              {generatingTemplate ? 'Generating...' : 'Generate Template'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Lesson Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., The Doctrine of Baptisms" required />
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input type="number" value={form.estimated_duration_minutes} onChange={(e) => setForm({ ...form, estimated_duration_minutes: parseInt(e.target.value) || 0 })} />
              </div>
            </div>

            <div>
              <Label>YouTube Video URL</Label>
              <Input value={form.youtube_url} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
              {ytPreviewId && (
                <div className="mt-3 rounded-lg overflow-hidden border">
                  <iframe src={youtubeEmbedUrl(ytPreviewId)} className="w-full aspect-video" allowFullScreen title="Preview" />
                </div>
              )}
            </div>

            <div>
              <Label>Lesson Notes</Label>
              <textarea value={form.lesson_notes} onChange={(e) => setForm({ ...form, lesson_notes: e.target.value })} className="w-full min-h-[150px] px-3 py-2 border rounded-md text-sm" placeholder="Full lesson content..." />
            </div>

            <div>
              <Label>Scripture References</Label>
              <Input value={form.scripture_references} onChange={(e) => setForm({ ...form, scripture_references: e.target.value })} placeholder="John 3:16, Romans 8:28, ..." />
            </div>

            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief lesson description" />
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_required} onChange={(e) => setForm({ ...form, is_required: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm">Required for completion</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.quiz_required} onChange={(e) => setForm({ ...form, quiz_required: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm">Quiz required</span>
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Link href="/admin/lessons"><Button variant="ghost">Cancel</Button></Link>
          <Button type="submit" className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Create Lesson'}
          </Button>
        </div>
      </form>
    </div>
  )
}
