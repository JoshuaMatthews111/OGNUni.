'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Video } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { toast } from 'sonner'

interface MeetingRequest {
  id: string
  requested_date: string
  duration_minutes: number
  topic: string
  student_notes: string
  status: 'pending' | 'approved' | 'declined' | 'completed' | 'canceled'
  instructor_notes: string | null
  meeting_link: string | null
  created_at: string
  student: {
    full_name: string
    email: string
  }
  instructor: {
    full_name: string
    email: string
  }
  course: {
    title: string
  } | null
}

interface MeetingRequestsProps {
  courseId?: string
  instructorId?: string
  isInstructor?: boolean
}

export function MeetingRequests({ courseId, instructorId, isInstructor = false }: MeetingRequestsProps) {
  const [meetings, setMeetings] = useState<MeetingRequest[]>([])
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [formData, setFormData] = useState({
    requested_date: '',
    duration_minutes: 30,
    topic: '',
    student_notes: '',
  })
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadUser()
    loadMeetings()
    subscribeToMeetings()
  }, [courseId, instructorId])

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

  const loadMeetings = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from('meeting_requests')
      .select(`
        *,
        student:student_id(full_name, email),
        instructor:instructor_id(full_name, email),
        course:course_id(title)
      `)

    if (isInstructor) {
      query = query.eq('instructor_id', user.id)
    } else {
      query = query.eq('student_id', user.id)
    }

    if (courseId) {
      query = query.eq('course_id', courseId)
    }

    const { data, error } = await query.order('requested_date', { ascending: true })

    if (data) {
      setMeetings(data)
    }
    setLoading(false)
  }

  const subscribeToMeetings = () => {
    const { data: { user } } = supabase.auth.getUser()

    const channel = supabase
      .channel('meeting_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_requests',
        },
        () => {
          loadMeetings()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const requestMeeting = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!instructorId) {
      toast.error('Instructor not specified')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Please sign in')
      return
    }

    const { error } = await supabase
      .from('meeting_requests')
      .insert({
        student_id: user.id,
        instructor_id: instructorId,
        course_id: courseId,
        requested_date: new Date(formData.requested_date).toISOString(),
        duration_minutes: formData.duration_minutes,
        topic: formData.topic,
        student_notes: formData.student_notes,
        status: 'pending',
      })

    if (error) {
      toast.error('Failed to request meeting')
    } else {
      toast.success('Meeting request sent!')
      setFormData({
        requested_date: '',
        duration_minutes: 30,
        topic: '',
        student_notes: '',
      })
      setShowRequestForm(false)
      loadMeetings()
    }
  }

  const updateMeetingStatus = async (
    meetingId: string,
    status: 'approved' | 'declined' | 'completed' | 'canceled',
    instructorNotes?: string,
    meetingLink?: string
  ) => {
    const updateData: any = { status }
    if (instructorNotes) updateData.instructor_notes = instructorNotes
    if (meetingLink) updateData.meeting_link = meetingLink

    const { error } = await supabase
      .from('meeting_requests')
      .update(updateData)
      .eq('id', meetingId)

    if (error) {
      toast.error('Failed to update meeting')
    } else {
      toast.success('Meeting updated!')
      loadMeetings()
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-600',
      approved: 'bg-green-600',
      declined: 'bg-red-600',
      completed: 'bg-gray-600',
      canceled: 'bg-gray-400',
    }
    return <Badge className={colors[status]}>{status}</Badge>
  }

  if (loading) {
    return <div className="text-center py-8">Loading meetings...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif text-[#2a2e35]">
          {isInstructor ? 'Meeting Requests' : 'My Meetings'}
        </h2>
        {!isInstructor && instructorId && (
          <Button
            onClick={() => setShowRequestForm(!showRequestForm)}
            className="bg-[#003d82] hover:bg-[#0052ad]"
          >
            Request Meeting
          </Button>
        )}
      </div>

      {showRequestForm && !isInstructor && (
        <Card>
          <CardHeader>
            <CardTitle>Request a 1-on-1 Meeting</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={requestMeeting} className="space-y-4">
              <div>
                <Label htmlFor="topic">Meeting Topic</Label>
                <Input
                  id="topic"
                  placeholder="What would you like to discuss?"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  required
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="requested_date">Preferred Date & Time</Label>
                  <Input
                    id="requested_date"
                    type="datetime-local"
                    value={formData.requested_date}
                    onChange={(e) => setFormData({ ...formData, requested_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={15}
                    max={120}
                    step={15}
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <textarea
                  id="notes"
                  className="w-full min-h-[100px] px-3 py-2 border rounded-md"
                  placeholder="Any specific topics or questions you'd like to cover..."
                  value={formData.student_notes}
                  onChange={(e) => setFormData({ ...formData, student_notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="bg-[#003d82] hover:bg-[#0052ad]">
                  Send Request
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRequestForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {meetings.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">
              {isInstructor ? 'No meeting requests yet' : 'No meetings scheduled'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => (
            <Card key={meeting.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{meeting.topic}</CardTitle>
                      {getStatusBadge(meeting.status)}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(meeting.requested_date), 'PPP')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{format(new Date(meeting.requested_date), 'p')} ({meeting.duration_minutes} minutes)</span>
                      </div>
                      <div>
                        {isInstructor ? (
                          <span>Student: {meeting.student.full_name}</span>
                        ) : (
                          <span>Instructor: {meeting.instructor.full_name}</span>
                        )}
                      </div>
                      {meeting.course && <div>Course: {meeting.course.title}</div>}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {meeting.student_notes && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-sm mb-2">Student Notes:</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{meeting.student_notes}</p>
                  </div>
                )}

                {meeting.instructor_notes && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-sm mb-2">Instructor Notes:</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{meeting.instructor_notes}</p>
                  </div>
                )}

                {meeting.meeting_link && meeting.status === 'approved' && (
                  <div className="mb-4">
                    <Button
                      asChild
                      className="bg-[#003d82] hover:bg-[#0052ad]"
                    >
                      <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer">
                        <Video className="w-4 h-4 mr-2" />
                        Join Meeting
                      </a>
                    </Button>
                  </div>
                )}

                {isInstructor && meeting.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        const link = prompt('Enter meeting link (Zoom, Google Meet, etc.):')
                        if (link) {
                          updateMeetingStatus(meeting.id, 'approved', '', link)
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        const notes = prompt('Reason for declining (optional):')
                        updateMeetingStatus(meeting.id, 'declined', notes || '')
                      }}
                    >
                      Decline
                    </Button>
                  </div>
                )}

                {!isInstructor && meeting.status === 'pending' && (
                  <Button
                    variant="outline"
                    onClick={() => updateMeetingStatus(meeting.id, 'canceled')}
                  >
                    Cancel Request
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
