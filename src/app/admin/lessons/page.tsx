'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, FileText, Youtube, Plus } from 'lucide-react'
import Link from 'next/link'

export default function AdminLessonsPage() {
  const supabase = createClient()
  const [lessons, setLessons] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadLessons() }, [])

  const loadLessons = async () => {
    const { data } = await supabase
      .from('lessons')
      .select('*, module:module_id(title, course:course_id(title, id))')
      .order('created_at', { ascending: false })
    setLessons(data || [])
    setLoading(false)
  }

  const filtered = lessons.filter((l) =>
    l.title.toLowerCase().includes(search.toLowerCase()) ||
    l.module?.course?.title?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0a1628]">Lessons</h1>
          <p className="text-sm text-gray-500">{lessons.length} total lessons</p>
        </div>
        <Link href="/admin/lessons/new">
          <Button className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold">
            <Plus className="w-4 h-4 mr-2" /> Add Lesson
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search lessons..." className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3" />
              <p>No lessons found</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((lesson, i) => (
                <div key={lesson.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-full bg-[#0a1628] text-[#c9a227] flex items-center justify-center text-sm font-bold">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#0a1628] truncate">{lesson.title}</p>
                    <p className="text-xs text-gray-500">{lesson.module?.course?.title || 'No course'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {lesson.youtube_embed_id && <Youtube className="w-4 h-4 text-red-600" />}
                    {lesson.quiz_required && <Badge className="text-[10px] bg-purple-100 text-purple-700">Quiz</Badge>}
                    {lesson.is_required && <Badge className="text-[10px] bg-blue-100 text-blue-700">Required</Badge>}
                  </div>
                  <span className="text-xs text-gray-400">{lesson.estimated_duration_minutes || '—'} min</span>
                  {lesson.module?.course?.id && (
                    <Link href={`/admin/courses/${lesson.module.course.id}/edit`}>
                      <Button variant="ghost" size="sm" className="text-[#c9a227]">Edit Course</Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
