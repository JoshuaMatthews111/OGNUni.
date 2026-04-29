'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, BookOpen, Users, Clock } from 'lucide-react'
import { COURSE_CATEGORIES } from '@/lib/constants'

export default function CoursesPage() {
  const supabase = createClient()
  const [courses, setCourses] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadCourses() }, [])

  const loadCourses = async () => {
    const { data } = await supabase
      .from('courses')
      .select('*, instructor:instructor_id(full_name)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
    setCourses(data || [])
    setLoading(false)
  }

  const filtered = courses.filter((c) => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase())
    const matchCat = !category || c.category === category
    return matchSearch && matchCat
  })

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* Hero */}
      <div className="bg-[#0a1628] text-white py-16">
        <div className="container mx-auto px-6 text-center">
          <Image src="/assets/ogn-university-logo-transparent.png" alt="OGN" width={100} height={80} className="mx-auto mb-4 object-contain" />
          <p className="text-xs tracking-[4px] text-[#c9a227] font-bold mb-3">OGN UNIVERSITY COURSE CATALOGUE</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Start Learning Now</h1>
          <p className="text-gray-300 max-w-2xl mx-auto mb-8">
            Browse through our courses to advance your knowledge and deepen your personal walk with God.
          </p>
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses..." className="pl-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-gray-400 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="container mx-auto px-6 py-6">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setCategory('')} className={`px-4 py-2 rounded-full text-sm transition-all ${!category ? 'bg-[#0a1628] text-[#c9a227] font-semibold' : 'bg-white border hover:border-[#c9a227] text-gray-600'}`}>
            All Courses
          </button>
          {COURSE_CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)} className={`px-4 py-2 rounded-full text-sm transition-all ${category === cat ? 'bg-[#0a1628] text-[#c9a227] font-semibold' : 'bg-white border hover:border-[#c9a227] text-gray-600'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Course Grid */}
      <div className="container mx-auto px-6 pb-16">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold mb-2">No courses found</h3>
            <p className="text-gray-500">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((course) => (
              <Link key={course.id} href={`/courses/${course.slug}`}>
                <Card className="overflow-hidden hover:shadow-xl transition-all cursor-pointer group h-full">
                  <div className="relative h-48">
                    {course.thumbnail_url ? (
                      <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#0a1628] to-[#1a3a5c] flex items-center justify-center">
                        <BookOpen className="w-14 h-14 text-[#c9a227]/40" />
                      </div>
                    )}
                    {course.is_free && <Badge className="absolute top-3 left-3 bg-green-600 text-white">FREE</Badge>}
                    {course.category && <Badge className="absolute top-3 right-3 bg-[#0a1628]/80 text-[#c9a227] text-[10px]">{course.category}</Badge>}
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-bold text-[#0a1628] mb-1 line-clamp-2 group-hover:text-[#c9a227] transition-colors">{course.title}</h3>
                    <p className="text-xs text-gray-500 mb-3">{course.instructor?.full_name || 'Prophet Joshua Matthews'}</p>
                    {course.description && <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.description}</p>}

                    <div className="flex items-center justify-between">
                      {course.is_free ? (
                        <span className="text-lg font-bold text-green-600">Free</span>
                      ) : (
                        <span className="text-lg font-bold text-[#0a1628]">${parseFloat(course.price || 0).toFixed(2)}</span>
                      )}
                      <Button size="sm" className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] text-xs font-semibold">
                        View Course
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
