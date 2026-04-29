'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Sparkles, Save, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function GenerateQuizPage() {
  const supabase = createClient()
  const [courses, setCourses] = useState<any[]>([])
  const [lessons, setLessons] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedLesson, setSelectedLesson] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generatedQuiz, setGeneratedQuiz] = useState<any>(null)

  const [manualInput, setManualInput] = useState({
    lessonTitle: '',
    lessonNotes: '',
    scriptureReferences: '',
  })

  useEffect(() => { loadCourses() }, [])

  useEffect(() => {
    if (selectedCourse) loadLessons(selectedCourse)
  }, [selectedCourse])

  useEffect(() => {
    if (selectedLesson) {
      const lesson = lessons.find((l) => l.id === selectedLesson)
      if (lesson) {
        setManualInput({
          lessonTitle: lesson.title,
          lessonNotes: lesson.lesson_notes || '',
          scriptureReferences: lesson.scripture_references || '',
        })
      }
    }
  }, [selectedLesson])

  const loadCourses = async () => {
    const { data } = await supabase.from('courses').select('id, title').order('title')
    setCourses(data || [])
  }

  const loadLessons = async (courseId: string) => {
    const { data } = await supabase
      .from('lessons')
      .select('*, module:module_id!inner(course_id)')
      .eq('module.course_id', courseId)
      .order('order_index')
    setLessons(data || [])
  }

  const handleGenerate = async () => {
    if (!manualInput.lessonTitle) { toast.error('Enter or select a lesson title'); return }
    setGenerating(true)
    setGeneratedQuiz(null)
    try {
      const res = await fetch('/api/gemini/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualInput),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setGeneratedQuiz(data.quiz)
      toast.success('Quiz generated!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate quiz')
    }
    setGenerating(false)
  }

  const handleSave = async () => {
    if (!generatedQuiz) return
    setSaving(true)
    try {
      const { data: quizRow, error: qErr } = await supabase
        .from('quizzes')
        .insert({
          lesson_id: selectedLesson || null,
          course_id: selectedCourse || null,
          title: generatedQuiz.title,
          description: generatedQuiz.description,
          passing_score: generatedQuiz.passing_score || 70,
        })
        .select().single()

      if (qErr || !quizRow) throw new Error('Failed to save quiz')

      const questions = generatedQuiz.questions.map((q: any, i: number) => ({
        quiz_id: quizRow.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        correct_answer: q.correct_answer,
        points: q.points || 1,
        order_index: i,
        teacher_review_required: q.teacher_review_required || false,
      }))

      await supabase.from('quiz_questions').insert(questions)
      toast.success('Quiz saved to database!')
      setGeneratedQuiz(null)
    } catch (err: any) {
      toast.error(err.message)
    }
    setSaving(false)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/quizzes"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-[#0a1628]">Generate AI Quiz</h1>
          <p className="text-sm text-gray-500">Use Gemini AI to create quizzes from lesson content</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg text-[#0a1628]">Source Content</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Course (optional)</Label>
              <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="w-full h-10 px-3 border rounded-md text-sm">
                <option value="">Select course...</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <Label>Lesson (optional)</Label>
              <select value={selectedLesson} onChange={(e) => setSelectedLesson(e.target.value)} className="w-full h-10 px-3 border rounded-md text-sm">
                <option value="">Select lesson...</option>
                {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
            </div>
          </div>

          <div>
            <Label>Lesson Title *</Label>
            <Input value={manualInput.lessonTitle} onChange={(e) => setManualInput({ ...manualInput, lessonTitle: e.target.value })} placeholder="e.g., The Doctrine of Baptisms" />
          </div>
          <div>
            <Label>Lesson Notes / Content</Label>
            <textarea value={manualInput.lessonNotes} onChange={(e) => setManualInput({ ...manualInput, lessonNotes: e.target.value })} className="w-full min-h-[120px] px-3 py-2 border rounded-md text-sm" placeholder="Paste lesson content for better quiz quality..." />
          </div>
          <div>
            <Label>Scripture References</Label>
            <Input value={manualInput.scriptureReferences} onChange={(e) => setManualInput({ ...manualInput, scriptureReferences: e.target.value })} placeholder="John 3:16, Romans 8:28, ..." />
          </div>

          <Button onClick={handleGenerate} className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold w-full" disabled={generating}>
            <Sparkles className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating Quiz with Gemini AI...' : 'Generate Quiz with Gemini AI'}
          </Button>
        </CardContent>
      </Card>

      {generatedQuiz && (
        <Card className="border-[#c9a227] border-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-[#0a1628]">{generatedQuiz.title}</CardTitle>
            <Button onClick={handleSave} className="bg-[#0a1628] text-white" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save Quiz'}
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">{generatedQuiz.description} • Pass: {generatedQuiz.passing_score}%</p>
            <div className="space-y-4">
              {generatedQuiz.questions?.map((q: any, i: number) => (
                <div key={i} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-[#0a1628] text-[#c9a227] text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{i + 1}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      q.question_type === 'multiple_choice' ? 'bg-blue-100 text-blue-700' :
                      q.question_type === 'short_answer' ? 'bg-purple-100 text-purple-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>{q.question_type.replace('_', ' ')}</span>
                    <span className="text-xs text-gray-500">{q.points} pts</span>
                    {q.teacher_review_required && <span className="text-xs text-red-600">Teacher review</span>}
                  </div>
                  <p className="text-sm font-medium mb-2">{q.question_text}</p>
                  {q.options && (
                    <div className="space-y-1 ml-4">
                      {q.options.map((opt: string, oi: number) => (
                        <p key={oi} className={`text-sm ${opt === q.correct_answer ? 'text-green-700 font-semibold' : 'text-gray-600'}`}>
                          {opt === q.correct_answer && <CheckCircle className="w-3 h-3 inline mr-1" />}{opt}
                        </p>
                      ))}
                    </div>
                  )}
                  {!q.options && <p className="text-xs text-gray-500 ml-4 italic">Answer guidance: {q.correct_answer}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
