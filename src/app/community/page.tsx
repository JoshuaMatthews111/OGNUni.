'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, MessageSquare, Clock, User, Send } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import Link from 'next/link'

export default function CommunityPage() {
  const supabase = createClient()
  const [posts, setPosts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, any[]>>({})
  const [newComment, setNewComment] = useState('')

  useEffect(() => {
    loadPosts()
    loadUser()
  }, [])

  const loadUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
      setUser(profile)
    }
  }

  const loadPosts = async () => {
    const { data } = await supabase
      .from('community_posts')
      .select('*, author:author_id(full_name, role, avatar_url)')
      .eq('is_public', true)
      .order('published_at', { ascending: false })
    setPosts(data || [])
    setLoading(false)
  }

  const loadComments = async (postId: string) => {
    const { data } = await supabase
      .from('community_comments')
      .select('*, user:user_id(full_name, role)')
      .eq('post_id', postId)
      .eq('status', 'approved')
      .order('created_at', { ascending: true })
    setComments((prev) => ({ ...prev, [postId]: data || [] }))
  }

  const togglePost = (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null)
    } else {
      setExpandedPost(postId)
      if (!comments[postId]) loadComments(postId)
    }
  }

  const submitComment = async (postId: string) => {
    if (!user) { toast.error('Please sign in to comment'); return }
    if (!newComment.trim()) return

    const { error } = await supabase.from('community_comments').insert({
      post_id: postId,
      user_id: user.id,
      content: newComment,
      status: 'approved',
    })

    if (error) { toast.error('Failed to post comment'); return }
    toast.success('Comment posted!')
    setNewComment('')
    loadComments(postId)
  }

  const filtered = posts.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.body?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#0a1628] text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-4">
            <Image src="/assets/ogn-logo-small.png" alt="OGN" width={60} height={48} className="object-contain" />
            <div>
              <h1 className="text-3xl font-bold">OGN Community</h1>
              <p className="text-[#c9a227]">Discussions, announcements, and fellowship</p>
            </div>
          </div>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search community..." className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <MessageSquare className="w-16 h-16 mx-auto mb-4" />
            <p className="text-lg">No posts yet. Check back soon!</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {filtered.map((post) => (
              <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {post.featured_image && (
                  <div className="w-full h-48 relative">
                    <img src={post.featured_image} alt={post.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    {post.category && <Badge className="bg-[#0a1628] text-[#c9a227] text-xs">{post.category}</Badge>}
                    <span className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(post.published_at || post.created_at).toLocaleDateString()}</span>
                  </div>
                  <h2 className="text-xl font-bold text-[#0a1628] mb-2">{post.title}</h2>
                  <p className="text-gray-600 mb-4 whitespace-pre-wrap">{expandedPost === post.id ? post.body : post.body?.substring(0, 300) + (post.body?.length > 300 ? '...' : '')}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <User className="w-4 h-4" />
                      <span>{post.author?.full_name || 'OGN University'}</span>
                      {post.author?.role && <Badge variant="outline" className="text-[10px]">{post.author.role}</Badge>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => togglePost(post.id)}>
                      <MessageSquare className="w-4 h-4 mr-1" />
                      {expandedPost === post.id ? 'Hide' : 'Comments'}
                    </Button>
                  </div>

                  {expandedPost === post.id && (
                    <div className="mt-4 border-t pt-4 space-y-3">
                      {(comments[post.id] || []).map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <div className="w-7 h-7 rounded-full bg-[#0a1628] text-[#c9a227] flex items-center justify-center text-xs font-bold shrink-0">
                            {comment.user?.full_name?.charAt(0) || '?'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{comment.user?.full_name}</span>
                              <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-gray-700">{comment.content}</p>
                          </div>
                        </div>
                      ))}

                      {user ? (
                        <div className="flex gap-2 mt-3">
                          <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write a comment..." className="flex-1" onKeyDown={(e) => e.key === 'Enter' && submitComment(post.id)} />
                          <Button size="sm" className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628]" onClick={() => submitComment(post.id)}>
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 text-center mt-3">
                          <Link href="/" className="text-[#c9a227] hover:underline">Sign in</Link> to leave a comment
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
