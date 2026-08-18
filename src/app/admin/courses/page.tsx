'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Plus, Edit, Trash2, Eye, Search, BookOpen, MoreVertical,
  CheckCircle, FileEdit, Clock, Archive, Copy, ExternalLink,
  Filter, Users, Layers,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'

interface Course {
  id: string
  title: string
  slug: string
  description: string
  is_published: boolean
  is_free: boolean
  price: number
  thumbnail_url: string | null
  category: string | null
  status: string | null
  instructor_id: string
  instructor: { full_name: string; avatar_url?: string; role?: string } | null
  created_at: string
  _lessonCount?: number
  _totalMinutes?: number
  _enrollmentCount?: number
}

export default function CoursesManagement() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all')
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const supabase = createClient()

  useEffect(() => { loadUser(); loadCourses() }, [])

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setCurrentUser(profile)
    }
  }

  const loadCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('*, instructor:instructor_id(full_name, avatar_url, role)')
      .order('created_at', { ascending: false })

    if (data) {
      // Load lesson counts and enrollment counts
      const courseIds = data.map((c: any) => c.id)

      // Get modules first, then lessons
      const { data: modulesData } = await supabase
        .from('modules')
        .select('id, course_id')
        .in('course_id', courseIds)

      let lessonCounts: Record<string, number> = {}
      let totalMinutes: Record<string, number> = {}

      if (modulesData && modulesData.length > 0) {
        const moduleIds = modulesData.map((m: any) => m.id)
        const moduleMap: Record<string, string> = {}
        modulesData.forEach((m: any) => { moduleMap[m.id] = m.course_id })

        const { data: lessonsData } = await supabase
          .from('lessons')
          .select('module_id, estimated_duration_minutes')
          .in('module_id', moduleIds)

        if (lessonsData) {
          lessonsData.forEach((l: any) => {
            const cid = moduleMap[l.module_id]
            if (cid) {
              lessonCounts[cid] = (lessonCounts[cid] || 0) + 1
              totalMinutes[cid] = (totalMinutes[cid] || 0) + (l.estimated_duration_minutes || 0)
            }
          })
        }
      }

      const { data: enrollData } = await supabase
        .from('enrollments')
        .select('course_id')
        .in('course_id', courseIds)

      const enrollCounts: Record<string, number> = {}
      enrollData?.forEach((e: any) => { enrollCounts[e.course_id] = (enrollCounts[e.course_id] || 0) + 1 })

      const enriched = data.map((c: any) => ({
        ...c,
        _lessonCount: lessonCounts[c.id] || 0,
        _totalMinutes: totalMinutes[c.id] || 0,
        _enrollmentCount: enrollCounts[c.id] || 0,
      }))

      setCourses(enriched)
    }
    setLoading(false)
  }

  const togglePublish = async (courseId: string, currentStatus: boolean) => {
    const { error } = await supabase.from('courses').update({ is_published: !currentStatus }).eq('id', courseId)
    if (error) toast.error('Failed to update course')
    else { toast.success(`Course ${!currentStatus ? 'published' : 'unpublished'}!`); loadCourses() }
    setOpenMenu(null)
  }

  const duplicateCourse = async (course: Course) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const slug = `${course.slug}-copy-${Date.now().toString(36)}`
    const { error } = await supabase.from('courses').insert({
      title: `${course.title} (Copy)`, slug, description: course.description,
      thumbnail_url: course.thumbnail_url, category: course.category,
      is_free: course.is_free, price: course.price, instructor_id: user.id,
      is_published: false, status: 'draft',
    })
    if (error) toast.error('Failed to duplicate')
    else { toast.success('Course duplicated as draft!'); loadCourses() }
    setOpenMenu(null)
  }

  const archiveCourse = async (courseId: string) => {
    const { error } = await supabase.from('courses').update({ status: 'archived', is_published: false }).eq('id', courseId)
    if (error) toast.error('Failed to archive')
    else { toast.success('Course archived'); loadCourses() }
    setOpenMenu(null)
  }

  const deleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to permanently delete this course? This cannot be undone.')) return
    const { error } = await supabase.from('courses').delete().eq('id', courseId)
    if (error) toast.error('Failed to delete course')
    else { toast.success('Course deleted!'); loadCourses() }
    setOpenMenu(null)
  }

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins}m`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  // Stats
  const totalCourses = courses.length
  const publishedCount = courses.filter(c => c.is_published && c.status !== 'archived').length
  const draftCount = courses.filter(c => !c.is_published && c.status !== 'archived').length
  const archivedCount = courses.filter(c => c.status === 'archived').length

  // Filter + search
  const filtered = courses.filter(c => {
    if (statusFilter === 'published' && (!c.is_published || c.status === 'archived')) return false
    if (statusFilter === 'draft' && (c.is_published || c.status === 'archived')) return false
    if (statusFilter === 'archived' && c.status !== 'archived') return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return c.title.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q) || c.instructor?.full_name?.toLowerCase().includes(q)
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0a1628]">Course Management</h1>
          <p className="text-sm text-gray-500">Create, organize, and manage all your courses.</p>
        </div>
        <Link href="/admin/courses/new">
          <Button className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold rounded-lg h-10 px-5">
            <Plus className="w-4 h-4 mr-2" /> Create Course
          </Button>
        </Link>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <button onClick={() => setStatusFilter('all')} className={`flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl border-2 transition-all bg-white hover:shadow-md ${statusFilter === 'all' ? 'border-[#0a1628] shadow-md' : 'border-gray-100'}`}>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#0a1628]/10 flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-[#0a1628]" />
          </div>
          <div className="text-left">
            <p className="text-xl sm:text-2xl font-bold text-[#0a1628]">{totalCourses}</p>
            <p className="text-[10px] sm:text-xs text-gray-500">Total Courses</p>
          </div>
        </button>
        <button onClick={() => setStatusFilter('published')} className={`flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl border-2 transition-all bg-white hover:shadow-md ${statusFilter === 'published' ? 'border-green-500 shadow-md' : 'border-gray-100'}`}>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
          </div>
          <div className="text-left">
            <p className="text-xl sm:text-2xl font-bold text-green-700">{publishedCount}</p>
            <p className="text-[10px] sm:text-xs text-gray-500">Published</p>
          </div>
        </button>
        <button onClick={() => setStatusFilter('draft')} className={`flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl border-2 transition-all bg-white hover:shadow-md ${statusFilter === 'draft' ? 'border-orange-400 shadow-md' : 'border-gray-100'}`}>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
            <FileEdit className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
          </div>
          <div className="text-left">
            <p className="text-xl sm:text-2xl font-bold text-orange-600">{draftCount}</p>
            <p className="text-[10px] sm:text-xs text-gray-500">Draft</p>
          </div>
        </button>
        <button onClick={() => setStatusFilter('archived')} className={`flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl border-2 transition-all bg-white hover:shadow-md ${statusFilter === 'archived' ? 'border-gray-400 shadow-md' : 'border-gray-100'}`}>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Archive className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
          </div>
          <div className="text-left">
            <p className="text-xl sm:text-2xl font-bold text-gray-600">{archivedCount}</p>
            <p className="text-[10px] sm:text-xs text-gray-500">Archived</p>
          </div>
        </button>
      </div>

      {/* Course Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <BookOpen className="w-14 h-14 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium mb-1">No courses found</p>
          <p className="text-xs text-gray-400 mb-4">{searchQuery ? 'Try a different search term' : 'Create your first course to get started'}</p>
          {!searchQuery && (
            <Link href="/admin/courses/new">
              <Button className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold">
                <Plus className="w-4 h-4 mr-2" /> Create Course
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
          {filtered.map((course) => {
            const isArchived = course.status === 'archived'
            return (
              <div key={course.id} className={`bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-all group ${isArchived ? 'opacity-75' : ''}`}>
                {/* Thumbnail */}
                <div className="relative aspect-[16/10] bg-gradient-to-br from-[#0a1628] to-[#1a3a5c] overflow-hidden">
                  {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center px-4">
                        <Image src="/assets/ogn-logo-small.png" alt="OGN" width={32} height={32} className="mx-auto mb-2 object-contain opacity-30" />
                        <p className="text-white/80 font-bold text-sm sm:text-base leading-tight line-clamp-2">{course.title}</p>
                      </div>
                    </div>
                  )}
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    {isArchived ? (
                      <Badge className="bg-gray-700/90 text-white text-[10px] font-semibold shadow-lg">Archived</Badge>
                    ) : course.is_published ? (
                      <Badge className="bg-green-600/90 text-white text-[10px] font-semibold shadow-lg">Published</Badge>
                    ) : (
                      <Badge className="bg-orange-500/90 text-white text-[10px] font-semibold shadow-lg">Draft</Badge>
                    )}
                  </div>
                  {/* Category */}
                  {course.category && (
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-black/50 text-white text-[10px] backdrop-blur-sm">{course.category}</Badge>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="p-4">
                  {/* Instructor Row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {course.instructor?.avatar_url ? (
                        <img src={course.instructor.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#0a1628] text-[#c9a227] flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {course.instructor?.full_name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#0a1628] truncate">{course.instructor?.full_name || 'Unknown'}</p>
                        <p className="text-[10px] text-gray-400 capitalize">{course.instructor?.role?.replace('_', ' ') || 'Instructor'}</p>
                      </div>
                    </div>
                    {/* Actions Menu */}
                    <div className="relative flex-shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === course.id ? null : course.id) }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenu === course.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border z-50 py-1.5 overflow-hidden">
                            <Link href={`/admin/courses/${course.id}/edit`} onClick={() => setOpenMenu(null)} className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50">
                              <Edit className="w-3.5 h-3.5" /> Edit Course
                            </Link>
                            <Link href={`/courses/${course.slug}`} target="_blank" onClick={() => setOpenMenu(null)} className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50">
                              <ExternalLink className="w-3.5 h-3.5" /> Preview Course
                            </Link>
                            <button onClick={() => togglePublish(course.id, course.is_published)} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50">
                              <Eye className="w-3.5 h-3.5" /> {course.is_published ? 'Unpublish' : 'Publish'}
                            </button>
                            <button onClick={() => duplicateCourse(course)} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50">
                              <Copy className="w-3.5 h-3.5" /> Duplicate
                            </button>
                            {!isArchived && (
                              <button onClick={() => archiveCourse(course.id)} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                <Archive className="w-3.5 h-3.5" /> Archive
                              </button>
                            )}
                            <div className="border-t my-1" />
                            <button onClick={() => deleteCourse(course.id)} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50">
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Title + Description */}
                  <Link href={`/admin/courses/${course.id}/edit`} className="block group/title">
                    <h3 className="text-sm sm:text-base font-bold text-[#0a1628] mb-1 line-clamp-1 group-hover/title:text-[#c9a227] transition-colors">{course.title}</h3>
                  </Link>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3 min-h-[2rem]">{course.description || 'No description added yet.'}</p>

                  {/* Stats Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-3 text-[11px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-[#c9a227]" />
                        {course._lessonCount} Lesson{course._lessonCount !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#c9a227]" />
                        {formatDuration(course._totalMinutes || 0)}
                      </span>
                    </div>
                    {(course._enrollmentCount || 0) > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Users className="w-3.5 h-3.5" /> {course._enrollmentCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bottom Feature Bar */}
      <div className="hidden sm:grid grid-cols-4 gap-4 bg-white rounded-xl border p-5">
        {[
          { icon: Layers, color: 'text-[#0a1628]', bg: 'bg-[#0a1628]/10', title: 'Organized & Easy', desc: 'Quickly find and manage your courses in one place.' },
          { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', title: 'Track Performance', desc: 'Monitor course stats and student engagement.' },
          { icon: BookOpen, color: 'text-[#c9a227]', bg: 'bg-[#c9a227]/10', title: 'Build Impact', desc: 'Create powerful teachings that transform lives.' },
          { icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', title: 'Kingdom Focused', desc: 'Equipping believers. Impacting nations.' },
        ].map((f, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg ${f.bg} flex items-center justify-center flex-shrink-0`}>
              <f.icon className={`w-4 h-4 ${f.color}`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#0a1628]">{f.title}</p>
              <p className="text-[10px] text-gray-400 leading-tight">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
