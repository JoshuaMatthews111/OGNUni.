'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, MessageSquare, CheckCircle, EyeOff, Trash2, Reply } from 'lucide-react'
import { toast } from 'sonner'

type Tab = 'community' | 'lesson'

export default function AdminCommentsPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('community')
  const [communityComments, setCommunityComments] = useState<any[]>([])
  const [lessonComments, setLessonComments] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')

  useEffect(() => { loadComments() }, [])

  const loadComments = async () => {
    const [ccRes, lcRes] = await Promise.all([
      supabase.from('community_comments').select('*, user:user_id(full_name, role), post:post_id(title)').order('created_at', { ascending: false }),
      supabase.from('lesson_comments').select('*, user:user_id(full_name, role), lesson:lesson_id(title)').order('created_at', { ascending: false }),
    ])
    setCommunityComments(ccRes.data || [])
    setLessonComments(lcRes.data || [])
    setLoading(false)
  }

  const updateCommentStatus = async (table: string, id: string, status: string) => {
    const { error } = await supabase.from(table).update({ status }).eq('id', id)
    if (error) toast.error('Failed to update')
    else { toast.success(`Comment ${status}`); loadComments() }
  }

  const deleteComment = async (table: string, id: string) => {
    if (!confirm('Delete this comment?')) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) toast.error('Failed to delete')
    else { toast.success('Deleted'); loadComments() }
  }

  const submitReply = async (table: string, parentId: string, postOrLessonId: string) => {
    if (!replyContent.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const insertData: any = {
      user_id: user.id,
      content: replyContent,
      status: 'approved',
    }

    if (table === 'community_comments') {
      insertData.post_id = postOrLessonId
      insertData.parent_comment_id = parentId
    } else {
      insertData.lesson_id = postOrLessonId
      insertData.parent_comment_id = parentId
    }

    const { error } = await supabase.from(table).insert(insertData)
    if (error) toast.error('Failed to reply: ' + error.message)
    else { toast.success('Reply posted'); setReplyTo(null); setReplyContent(''); loadComments() }
  }

  const comments = tab === 'community' ? communityComments : lessonComments
  const tableName = tab === 'community' ? 'community_comments' : 'lesson_comments'

  const filtered = comments.filter((c) =>
    c.content.toLowerCase().includes(search.toLowerCase()) ||
    c.user?.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0a1628]">Comment Moderation</h1>
        <p className="text-sm text-gray-500">Review, approve, and respond to comments</p>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === 'community' ? 'default' : 'outline'} onClick={() => setTab('community')}
          className={tab === 'community' ? 'bg-[#0a1628] text-white' : ''}>
          Community ({communityComments.length})
        </Button>
        <Button variant={tab === 'lesson' ? 'default' : 'outline'} onClick={() => setTab('lesson')}
          className={tab === 'lesson' ? 'bg-[#0a1628] text-white' : ''}>
          Lessons ({lessonComments.length})
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search comments..." className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3" />
            <p>No comments found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((comment) => (
            <Card key={comment.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#0a1628] text-[#c9a227] flex items-center justify-center text-xs font-bold shrink-0">
                    {comment.user?.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[#0a1628]">{comment.user?.full_name || 'Unknown'}</span>
                      <Badge className="text-[10px]" variant="outline">{comment.user?.role || 'student'}</Badge>
                      <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleDateString()}</span>
                      <Badge className={`text-[10px] ${
                        comment.status === 'approved' ? 'bg-green-100 text-green-700' :
                        comment.status === 'hidden' ? 'bg-yellow-100 text-yellow-700' :
                        comment.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>{comment.status}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      on {tab === 'community' ? comment.post?.title : comment.lesson?.title}
                    </p>
                    <p className="text-sm text-gray-700 mt-2">{comment.content}</p>

                    {replyTo === comment.id && (
                      <div className="mt-3 flex gap-2">
                        <Input
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Write reply..."
                          className="flex-1"
                        />
                        <Button size="sm" className="bg-[#0a1628] text-white"
                          onClick={() => submitReply(tableName, comment.id, tab === 'community' ? comment.post_id : comment.lesson_id)}>
                          Send
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setReplyTo(null)}>Cancel</Button>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setReplyTo(comment.id)} title="Reply">
                      <Reply className="w-4 h-4 text-blue-600" />
                    </Button>
                    {comment.status !== 'approved' && (
                      <Button variant="ghost" size="sm" onClick={() => updateCommentStatus(tableName, comment.id, 'approved')} title="Approve">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => updateCommentStatus(tableName, comment.id, 'hidden')} title="Hide">
                      <EyeOff className="w-4 h-4 text-yellow-600" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteComment(tableName, comment.id)} title="Delete">
                      <Trash2 className="w-4 h-4 text-red-500" />
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
