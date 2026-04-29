'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, BookOpen, CheckCircle, Clock, DollarSign } from 'lucide-react'
import { toast } from 'sonner'

interface Enrollment {
  id: string
  enrollment_type: string
  enrolled_at: string
  completed_at: string | null
  user: {
    full_name: string | null
    email: string
  }
  course: {
    title: string
  }
}

export default function AdminEnrollmentsPage() {
  const supabase = createClient()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [filteredEnrollments, setFilteredEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    loadEnrollments()
  }, [])

  useEffect(() => {
    let filtered = enrollments

    if (searchQuery) {
      filtered = filtered.filter(
        (enrollment) =>
          enrollment.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          enrollment.user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          enrollment.course.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (filterType !== 'all') {
      filtered = filtered.filter((e) => e.enrollment_type === filterType)
    }

    setFilteredEnrollments(filtered)
  }, [searchQuery, filterType, enrollments])

  const loadEnrollments = async () => {
    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        *,
        user:user_id(full_name, email),
        course:course_id(title)
      `)
      .order('enrolled_at', { ascending: false })

    if (error) {
      toast.error('Failed to load enrollments')
      setLoading(false)
      return
    }

    setEnrollments(data || [])
    setFilteredEnrollments(data || [])
    setLoading(false)
  }

  const getEnrollmentTypeBadge = (type: string) => {
    switch (type) {
      case 'purchase':
        return <Badge className="bg-green-100 text-green-700">Purchase</Badge>
      case 'membership':
        return <Badge className="bg-blue-100 text-blue-700">Membership</Badge>
      case 'free':
        return <Badge className="bg-gray-100 text-gray-700">Free</Badge>
      case 'admin_granted':
        return <Badge className="bg-purple-100 text-purple-700">Admin Granted</Badge>
      default:
        return <Badge>{type}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">Loading enrollments...</div>
      </div>
    )
  }

  const completedCount = enrollments.filter((e) => e.completed_at).length
  const activeCount = enrollments.filter((e) => !e.completed_at).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-[#2a2e35]">Enrollments Management</h1>
          <p className="text-gray-600 mt-1">Track and manage course enrollments</p>
        </div>
        <Badge className="text-lg px-4 py-2">{enrollments.length} Total Enrollments</Badge>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-3xl font-bold text-[#003d82]">{activeCount}</p>
              </div>
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-green-600">{completedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Purchases</p>
                <p className="text-3xl font-bold text-[#003d82]">
                  {enrollments.filter((e) => e.enrollment_type === 'purchase').length}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Free</p>
                <p className="text-3xl font-bold text-[#003d82]">
                  {enrollments.filter((e) => e.enrollment_type === 'free').length}
                </p>
              </div>
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by student, email, or course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">All Types</option>
              <option value="purchase">Purchase</option>
              <option value="membership">Membership</option>
              <option value="free">Free</option>
              <option value="admin_granted">Admin Granted</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredEnrollments.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                No enrollments found
              </div>
            ) : (
              filteredEnrollments.map((enrollment) => (
                <Card key={enrollment.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{enrollment.course.title}</h3>
                          {enrollment.completed_at && (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>
                            <strong>Student:</strong> {enrollment.user.full_name || enrollment.user.email}
                          </span>
                          <span>
                            <strong>Enrolled:</strong> {new Date(enrollment.enrolled_at).toLocaleDateString()}
                          </span>
                          {enrollment.completed_at && (
                            <span>
                              <strong>Completed:</strong> {new Date(enrollment.completed_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getEnrollmentTypeBadge(enrollment.enrollment_type)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
