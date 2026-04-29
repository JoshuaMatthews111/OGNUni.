'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Megaphone, Pin } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Announcement {
  id: string
  title: string
  content: string
  is_pinned: boolean
  created_at: string
  instructor: {
    full_name: string
    avatar_url: string
  }
  is_read?: boolean
}

interface CourseAnnouncementsProps {
  courseId: string
}

export function CourseAnnouncements({ courseId }: CourseAnnouncementsProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadAnnouncements()
    const unsubscribe = subscribeToAnnouncements()
    return unsubscribe
  }, [courseId])

  const loadAnnouncements = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('announcements')
      .select(`
        *,
        instructor:instructor_id(full_name, avatar_url)
      `)
      .eq('course_id', courseId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      setLoading(false)
      return
    }

    if (data && user) {
      // Check read status
      const { data: reads } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id)
        .in('announcement_id', data.map(a => a.id))

      const readIds = new Set(reads?.map(r => r.announcement_id) || [])

      setAnnouncements(data.map(a => ({
        ...a,
        is_read: readIds.has(a.id)
      })))
    }
    setLoading(false)
  }

  const subscribeToAnnouncements = () => {
    const channel = supabase
      .channel(`announcements:${courseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements',
          filter: `course_id=eq.${courseId}`,
        },
        () => {
          loadAnnouncements()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const markAsRead = async (announcementId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('announcement_reads')
      .upsert({
        announcement_id: announcementId,
        user_id: user.id
      })

    setAnnouncements(prev =>
      prev.map(a => a.id === announcementId ? { ...a, is_read: true } : a)
    )
  }

  if (loading) {
    return <div className="text-center py-8">Loading announcements...</div>
  }

  if (announcements.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Megaphone className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No announcements yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => (
        <Card key={announcement.id} className={!announcement.is_read ? 'border-[#003d82]' : ''}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {announcement.is_pinned && (
                    <Pin className="w-4 h-4 text-[#003d82]" />
                  )}
                  <CardTitle className="text-xl">{announcement.title}</CardTitle>
                  {!announcement.is_read && (
                    <Badge className="bg-[#003d82]">New</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">{announcement.instructor.full_name}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none mb-4">
              <p className="whitespace-pre-wrap">{announcement.content}</p>
            </div>
            {!announcement.is_read && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAsRead(announcement.id)}
              >
                Mark as Read
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
