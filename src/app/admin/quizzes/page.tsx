'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, ClipboardList, CheckCircle, Clock, Eye } from 'lucide-react'
import Link from 'next/link'

export default function AdminQuizzesPage() {
  const supabase = createClient()
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [attempts, setAttempts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [quizRes, attemptsRes] = await Promise.all([
      supabase.from('quizzes').select('*, course:course_id(title), lesson:lesson_id(title)').order('created_at', { ascending: false }),
      supabase.from('quiz_attempts').select('*, user:user_id(full_name, email), quiz:quiz_id(title)').order('completed_at', { ascending: false }).limit(20),
    ])
    setQuizzes(quizRes.data || [])
    setAttempts(attemptsRes.data || [])
    setLoading(false)
  }

  const filtered = quizzes.filter((q) =>
    q.title.toLowerCase().includes(search.toLowerCase())
  )

  const pendingReview = attempts.filter((a) => !a.passed && a.score >= 0)

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0a1628]">Quizzes & Tests</h1>
          <p className="text-sm text-gray-500">{quizzes.length} quizzes • {attempts.length} attempts</p>
        </div>
        <Link href="/admin/quizzes/generate">
          <Button className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold">Generate AI Quiz</Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search quizzes..." className="pl-10" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base text-[#0a1628]">All Quizzes ({filtered.length})</CardTitle></CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <ClipboardList className="w-10 h-10 mx-auto mb-2" />
                <p>No quizzes found. Generate one from a course.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((quiz) => (
                  <div key={quiz.id} className="p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#0a1628]">{quiz.title}</p>
                        <p className="text-xs text-gray-500">{quiz.course?.title} • Pass: {quiz.passing_score}%</p>
                      </div>
                      <Badge className="bg-[#0a1628] text-[#c9a227]">{quiz.max_attempts} attempts</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base text-[#0a1628]">Recent Attempts</CardTitle></CardHeader>
          <CardContent>
            {attempts.length === 0 ? (
              <p className="text-center py-8 text-gray-400">No attempts yet</p>
            ) : (
              <div className="space-y-3">
                {attempts.map((att) => (
                  <div key={att.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-[#0a1628] text-[#c9a227] flex items-center justify-center text-xs font-bold">
                      {att.user?.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{att.user?.full_name || att.user?.email}</p>
                      <p className="text-xs text-gray-500">{att.quiz?.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{att.score}%</p>
                      {att.passed ? (
                        <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Passed</span>
                      ) : (
                        <span className="text-xs text-red-600 flex items-center gap-1"><Clock className="w-3 h-3" /> Failed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
