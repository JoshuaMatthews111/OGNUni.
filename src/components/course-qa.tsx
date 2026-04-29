'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, ThumbsUp, CheckCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface Question {
  id: string
  title: string
  question: string
  is_answered: boolean
  is_featured: boolean
  upvotes: number
  created_at: string
  student: {
    full_name: string
  }
  answers: Answer[]
}

interface Answer {
  id: string
  answer: string
  is_instructor_answer: boolean
  is_accepted: boolean
  upvotes: number
  created_at: string
  answerer: {
    full_name: string
    role: string
  }
}

interface CourseQAProps {
  courseId: string
  lessonId?: string
}

export function CourseQA({ courseId, lessonId }: CourseQAProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [showAskQuestion, setShowAskQuestion] = useState(false)
  const [newQuestionTitle, setNewQuestionTitle] = useState('')
  const [newQuestion, setNewQuestion] = useState('')
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null)
  const [newAnswer, setNewAnswer] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadUser()
    loadQuestions()
    const unsubscribe = subscribeToQuestions()
    return unsubscribe
  }, [courseId, lessonId])

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setCurrentUser(profile)
    }
  }

  const loadQuestions = async () => {
    let query = supabase
      .from('course_questions')
      .select(`
        *,
        student:student_id(full_name),
        answers:question_answers(
          *,
          answerer:answerer_id(full_name, role)
        )
      `)
      .eq('course_id', courseId)

    if (lessonId) {
      query = query.eq('lesson_id', lessonId)
    }

    const { data, error } = await query
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load questions')
    }

    if (data) {
      setQuestions(data)
    }
    setLoading(false)
  }

  const subscribeToQuestions = () => {
    const channel = supabase
      .channel(`questions:${courseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'course_questions',
          filter: `course_id=eq.${courseId}`,
        },
        () => {
          loadQuestions()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const askQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newQuestionTitle.trim() || !newQuestion.trim()) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Please sign in to ask a question')
      return
    }

    const { error } = await supabase
      .from('course_questions')
      .insert({
        course_id: courseId,
        lesson_id: lessonId,
        student_id: user.id,
        title: newQuestionTitle.trim(),
        question: newQuestion.trim(),
      })

    if (error) {
      toast.error('Failed to post question')
    } else {
      toast.success('Question posted!')
      setNewQuestionTitle('')
      setNewQuestion('')
      setShowAskQuestion(false)
      loadQuestions()
    }
  }

  const postAnswer = async (questionId: string) => {
    if (!newAnswer.trim()) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Please sign in to answer')
      return
    }

    const isInstructor = currentUser?.role === 'instructor' || currentUser?.role === 'admin'

    const { error } = await supabase
      .from('question_answers')
      .insert({
        question_id: questionId,
        answerer_id: user.id,
        answer: newAnswer.trim(),
        is_instructor_answer: isInstructor,
      })

    if (error) {
      toast.error('Failed to post answer')
    } else {
      toast.success('Answer posted!')
      setNewAnswer('')
      setSelectedQuestion(null)
      loadQuestions()
    }
  }

  const upvoteQuestion = async (questionId: string) => {
    const { error } = await supabase.rpc('increment_question_upvotes', {
      question_id: questionId
    })

    if (!error) {
      loadQuestions()
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading questions...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif text-[#2a2e35]">Questions & Answers</h2>
        <Button
          onClick={() => setShowAskQuestion(!showAskQuestion)}
          className="bg-[#003d82] hover:bg-[#0052ad]"
        >
          Ask a Question
        </Button>
      </div>

      {showAskQuestion && (
        <Card>
          <CardHeader>
            <CardTitle>Ask Your Question</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={askQuestion} className="space-y-4">
              <div>
                <Label htmlFor="title">Question Title</Label>
                <Input
                  id="title"
                  placeholder="Brief summary of your question"
                  value={newQuestionTitle}
                  onChange={(e) => setNewQuestionTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="question">Your Question</Label>
                <textarea
                  id="question"
                  className="w-full min-h-[120px] px-3 py-2 border rounded-md"
                  placeholder="Provide details about your question..."
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="bg-[#003d82] hover:bg-[#0052ad]">
                  Post Question
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAskQuestion(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {questions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No questions yet. Be the first to ask!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((question) => (
            <Card key={question.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{question.title}</CardTitle>
                      {question.is_answered && (
                        <Badge className="bg-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Answered
                        </Badge>
                      )}
                      {question.is_featured && (
                        <Badge className="bg-yellow-600">Featured</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>{question.student.full_name}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => upvoteQuestion(question.id)}
                    className="flex items-center gap-1"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>{question.upvotes}</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-4 whitespace-pre-wrap">{question.question}</p>

                {/* Answers */}
                {question.answers.length > 0 && (
                  <div className="space-y-4 mb-4 pl-6 border-l-2 border-gray-200">
                    {question.answers.map((answer) => (
                      <div key={answer.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{answer.answerer.full_name}</span>
                            {answer.is_instructor_answer && (
                              <Badge className="bg-[#003d82]">Instructor</Badge>
                            )}
                            {answer.is_accepted && (
                              <Badge className="bg-green-600">Accepted Answer</Badge>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(answer.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{answer.answer}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Answer Form */}
                {selectedQuestion === question.id ? (
                  <div className="space-y-3">
                    <textarea
                      className="w-full min-h-[100px] px-3 py-2 border rounded-md"
                      placeholder="Write your answer..."
                      value={newAnswer}
                      onChange={(e) => setNewAnswer(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => postAnswer(question.id)}
                        className="bg-[#003d82] hover:bg-[#0052ad]"
                      >
                        Post Answer
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedQuestion(null)
                          setNewAnswer('')
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setSelectedQuestion(question.id)}
                  >
                    Answer this Question
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
