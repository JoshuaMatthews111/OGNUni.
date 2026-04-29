'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Eye, Search, BookOpen } from 'lucide-react'
import { COURSE_CATEGORIES } from '@/lib/constants'
import { toast } from 'sonner'
import Link from 'next/link'

interface Course {
  id: string
  title: string
  slug: string
  description: string
  is_published: boolean
  is_free: boolean
  price: number
  instructor: {
    full_name: string
  }
  created_at: string
}

export default function CoursesManagement() {
  const [courses, setCourses] = useState<Course[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    long_description: '',
    is_free: false,
    price: 0,
  })
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const supabase = createClient()

  useEffect(() => {
    loadUser()
    loadCourses()
  }, [])

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

  const loadCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        instructor:instructor_id(full_name)
      `)
      .order('created_at', { ascending: false })

    if (data) {
      setCourses(data)
    }
    setLoading(false)
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const createCourse = async (e: React.FormEvent) => {
    e.preventDefault()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('courses')
      .insert({
        ...formData,
        instructor_id: user.id,
        slug: formData.slug || generateSlug(formData.title),
      })

    if (error) {
      toast.error('Failed to create course')
      console.error(error)
    } else {
      toast.success('Course created successfully!')
      setFormData({
        title: '',
        slug: '',
        description: '',
        long_description: '',
        is_free: false,
        price: 0,
      })
      setShowCreateForm(false)
      loadCourses()
    }
  }

  const togglePublish = async (courseId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('courses')
      .update({ is_published: !currentStatus })
      .eq('id', courseId)

    if (error) {
      toast.error('Failed to update course')
    } else {
      toast.success(`Course ${!currentStatus ? 'published' : 'unpublished'}!`)
      loadCourses()
    }
  }

  const deleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId)

    if (error) {
      toast.error('Failed to delete course')
    } else {
      toast.success('Course deleted!')
      loadCourses()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0a1628]">Course Management</h1>
          <p className="text-sm text-gray-500">Create and manage teachings</p>
        </div>
        <Link href="/admin/courses/new">
          <Button className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold">
            <Plus className="w-4 h-4 mr-2" />
            Create Course
          </Button>
        </Link>
      </div>

      {/* Create Course Form */}
      {showCreateForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create New Course</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createCourse} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Course Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        title: e.target.value,
                        slug: generateSlug(e.target.value)
                      })
                    }}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="slug">Slug (URL) *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Short Description *</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="long_description">Long Description</Label>
                <textarea
                  id="long_description"
                  className="w-full min-h-[120px] px-3 py-2 border rounded-md"
                  value={formData.long_description}
                  onChange={(e) => setFormData({ ...formData, long_description: e.target.value })}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price (USD)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    disabled={formData.is_free}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_free"
                    checked={formData.is_free}
                    onChange={(e) => setFormData({ ...formData, is_free: e.target.checked, price: 0 })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="is_free">Free Course</Label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-[#003d82] hover:bg-[#0052ad]">
                  Create Course
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Courses List */}
      {courses.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No courses yet. Create your first course!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {courses.map((course) => (
            <Card key={course.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{course.title}</h3>
                      {course.is_published ? (
                        <Badge className="bg-green-600">Published</Badge>
                      ) : (
                        <Badge variant="outline">Draft</Badge>
                      )}
                      {course.is_free && (
                        <Badge className="bg-blue-600">Free</Badge>
                      )}
                    </div>
                    <p className="text-gray-600 mb-2">{course.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Instructor: {course.instructor?.full_name}</span>
                      {!course.is_free && <span>Price: ${course.price}</span>}
                      <span>Created: {new Date(course.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/admin/courses/${course.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePublish(course.id, course.is_published)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteCourse(course.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
