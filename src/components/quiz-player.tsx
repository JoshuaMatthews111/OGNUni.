'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface QuizQuestion {
  id: string
  question_text: string
  question_type: 'multiple_choice' | 'true_false' | 'short_answer'
  options: string[] | null
  correct_answer: string
  points: number
  order_index: number
}

interface Quiz {
  id: string
  title: string
  description: string
  passing_score: number
  max_attempts: number
  time_limit_minutes: number | null
}

interface QuizPlayerProps {
  lessonId: string
  enrollmentId: string
  onComplete: () => void
}

export function QuizPlayer({ lessonId, enrollmentId, onComplete }: QuizPlayerProps) {
  const supabase = createClient()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{
    score: number
    passed: boolean
    totalPoints: number
  } | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [quizStartTime, setQuizStartTime] = useState<Date | null>(null)

  useEffect(() => {
    loadQuiz()
  }, [lessonId])

  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0 && !result) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            handleSubmit()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [timeRemaining, result])

  const loadQuiz = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('lesson_id', lessonId)
      .single()

    if (quizError || !quizData) {
      toast.error('Quiz not found')
      setLoading(false)
      return
    }

    setQuiz(quizData)

    const { data: questionsData } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizData.id)
      .order('order_index', { ascending: true })

    if (questionsData) {
      setQuestions(questionsData)
    }

    const { data: attemptsData } = await supabase
      .from('quiz_attempts')
      .select('id')
      .eq('quiz_id', quizData.id)
      .eq('user_id', user.id)

    setAttempts(attemptsData?.length || 0)

    if (quizData.time_limit_minutes) {
      setTimeRemaining(quizData.time_limit_minutes * 60)
    }

    setQuizStartTime(new Date())
    setLoading(false)
  }

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }

  const handleSubmit = async () => {
    if (!quiz || !quizStartTime) return

    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let correctCount = 0
    let totalPoints = 0

    questions.forEach((q) => {
      totalPoints += q.points
      const userAnswer = answers[q.id]?.trim().toLowerCase()
      const correctAnswer = q.correct_answer.trim().toLowerCase()

      if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
        if (userAnswer === correctAnswer) {
          correctCount += q.points
        }
      } else if (q.question_type === 'short_answer') {
        if (userAnswer === correctAnswer) {
          correctCount += q.points
        }
      }
    })

    const score = Math.round((correctCount / totalPoints) * 100)
    const passed = score >= quiz.passing_score

    const { error: attemptError } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: user.id,
        quiz_id: quiz.id,
        enrollment_id: enrollmentId,
        score,
        passed,
        answers,
        started_at: quizStartTime.toISOString(),
      })

    if (attemptError) {
      toast.error('Failed to submit quiz')
      setSubmitting(false)
      return
    }

    setResult({ score, passed, totalPoints })
    setAttempts((prev) => prev + 1)

    if (passed) {
      await supabase
        .from('lesson_progress')
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          enrollment_id: enrollmentId,
          is_completed: true,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,lesson_id'
        })

      toast.success('Quiz passed! Lesson marked complete.')
      setTimeout(() => onComplete(), 2000)
    } else {
      toast.error(`Quiz failed. Score: ${score}%. Passing: ${quiz.passing_score}%`)
    }

    setSubmitting(false)
  }

  const handleRetry = () => {
    setAnswers({})
    setCurrentQuestionIndex(0)
    setResult(null)
    setQuizStartTime(new Date())
    if (quiz?.time_limit_minutes) {
      setTimeRemaining(quiz.time_limit_minutes * 60)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="text-gray-600">Loading quiz...</div>
        </CardContent>
      </Card>
    )
  }

  if (!quiz || questions.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">No quiz available for this lesson.</p>
        </CardContent>
      </Card>
    )
  }

  if (result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {result.passed ? (
              <>
                <CheckCircle className="w-6 h-6 text-green-600" />
                Quiz Passed!
              </>
            ) : (
              <>
                <XCircle className="w-6 h-6 text-red-600" />
                Quiz Failed
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-5xl font-bold mb-2" style={{ color: result.passed ? '#10b981' : '#ef4444' }}>
              {result.score}%
            </div>
            <p className="text-gray-600">
              {result.passed
                ? `You passed with ${result.score}%! (Required: ${quiz.passing_score}%)`
                : `You scored ${result.score}%. You need ${quiz.passing_score}% to pass.`}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between text-sm mb-2">
              <span>Attempts used:</span>
              <span className="font-medium">{attempts} / {quiz.max_attempts}</span>
            </div>
          </div>

          {!result.passed && attempts < quiz.max_attempts && (
            <Button onClick={handleRetry} className="w-full bg-[#003d82] hover:bg-[#0052ad]">
              Try Again
            </Button>
          )}

          {!result.passed && attempts >= quiz.max_attempts && (
            <div className="text-center text-sm text-gray-600">
              You've used all {quiz.max_attempts} attempts. Please contact your instructor.
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (attempts >= quiz.max_attempts) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <XCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
          <h3 className="text-xl font-semibold mb-2">Maximum Attempts Reached</h3>
          <p className="text-gray-600">
            You've used all {quiz.max_attempts} attempts for this quiz. Please contact your instructor for assistance.
          </p>
        </CardContent>
      </Card>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>{quiz.title}</CardTitle>
            {timeRemaining !== null && (
              <Badge className={`flex items-center gap-1 ${timeRemaining < 60 ? 'bg-red-600' : ''}`}>
                <Clock className="w-3 h-3" />
                {formatTime(timeRemaining)}
              </Badge>
            )}
          </div>
          {quiz.description && <p className="text-sm text-gray-600">{quiz.description}</p>}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
              <span>Passing Score: {quiz.passing_score}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">{currentQuestion.question_text}</h3>

          {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options && (
            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => (
                <label
                  key={idx}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    answers[currentQuestion.id] === option
                      ? 'border-[#003d82] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    value={option}
                    checked={answers[currentQuestion.id] === option}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    className="mr-3"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          )}

          {currentQuestion.question_type === 'true_false' && (
            <div className="space-y-3">
              {['True', 'False'].map((option) => (
                <label
                  key={option}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    answers[currentQuestion.id] === option
                      ? 'border-[#003d82] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    value={option}
                    checked={answers[currentQuestion.id] === option}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    className="mr-3"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          )}

          {currentQuestion.question_type === 'short_answer' && (
            <input
              type="text"
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              className="w-full px-4 py-3 border rounded-lg"
              placeholder="Type your answer here..."
            />
          )}

          <div className="flex gap-3 mt-6">
            {currentQuestionIndex > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
              >
                Previous
              </Button>
            )}
            {currentQuestionIndex < questions.length - 1 ? (
              <Button
                onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                className="ml-auto bg-[#003d82] hover:bg-[#0052ad]"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting || Object.keys(answers).length !== questions.length}
                className="ml-auto bg-[#003d82] hover:bg-[#0052ad]"
              >
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </Button>
            )}
          </div>

          {Object.keys(answers).length !== questions.length && currentQuestionIndex === questions.length - 1 && (
            <p className="text-sm text-amber-600 mt-4">
              Please answer all questions before submitting.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
