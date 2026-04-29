'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Plus, MessagesSquare, Eye, Trash2, Edit } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function AdminCommunityPage() {
  const supabase = createClient()
  const [posts, setPosts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadPosts() }, [])

  const loadPosts = async () => {
    const { data } = await supabase
      .from('community_posts')
      .select('*, author:author_id(full_name, role)')
      .order('created_at', { ascending: false })
    setPosts(data || [])
    setLoading(false)
  }

  const deletePost = async (id: string) => {
    if (!confirm('Delete this post?')) return
    const { error } = await supabase.from('community_posts').delete().eq('id', id)
    if (error) toast.error('Failed to delete')
    else { toast.success('Post deleted'); loadPosts() }
  }

  const filtered = posts.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0a1628]">Community & Discussions</h1>
          <p className="text-sm text-gray-500">{posts.length} posts</p>
        </div>
        <Link href="/admin/community/new">
          <Button className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold">
            <Plus className="w-4 h-4 mr-2" /> New Post
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posts..." className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-400">
            <MessagesSquare className="w-12 h-12 mx-auto mb-3" />
            <p>No posts yet. Create your first community post!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((post) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[#0a1628]">{post.title}</h3>
                      {post.is_public ? (
                        <Badge className="bg-green-100 text-green-700 text-[10px]">Public</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700 text-[10px]">Private</Badge>
                      )}
                      {post.students_only_replies && (
                        <Badge className="bg-blue-100 text-blue-700 text-[10px]">Students Only Replies</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{post.body?.substring(0, 200)}...</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>By {post.author?.full_name || 'Unknown'}</span>
                      {post.category && <span>• {post.category}</span>}
                      <span>• {new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <Button variant="ghost" size="sm" onClick={() => deletePost(post.id)}>
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
