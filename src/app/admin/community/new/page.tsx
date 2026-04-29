'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save, Eye, Upload } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

const POST_CATEGORIES = [
  'Announcement',
  'Teaching',
  'Testimony',
  'Prayer Request',
  'Discussion',
  'Event',
  'Resource',
]

export default function NewCommunityPostPage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    title: '',
    body: '',
    featured_image: '',
    category: '',
    is_public: true,
    students_only_replies: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.body) { toast.error('Title and body are required'); return }
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setSaving(false); return }

    const { error } = await supabase.from('community_posts').insert({
      ...form,
      author_id: user.id,
      published_at: new Date().toISOString(),
    })

    setSaving(false)
    if (error) { toast.error('Failed: ' + error.message); return }
    toast.success('Post published!')
    router.push('/admin/community')
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fileName = `post-img-${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('course-thumbnails').upload(fileName, file)
    if (error) { toast.error('Upload failed'); return }
    const { data } = supabase.storage.from('course-thumbnails').getPublicUrl(fileName)
    setForm({ ...form, featured_image: data.publicUrl })
    toast.success('Image uploaded!')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/community"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-[#0a1628]">Create Community Post</h1>
          <p className="text-sm text-gray-500">Publish announcements, teachings, and discussions</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-lg text-[#0a1628]">Post Content</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Post title" required />
            </div>
            <div>
              <Label>Category</Label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full h-10 px-3 border rounded-md text-sm">
                <option value="">Select category...</option>
                {POST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>Body *</Label>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="w-full min-h-[250px] px-3 py-2 border rounded-md text-sm"
                placeholder="Write your post content..."
                required
              />
            </div>
            <div>
              <Label>Featured Image</Label>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#0a1628] text-white rounded-lg cursor-pointer hover:bg-[#1a3a5c] text-sm">
                  <Upload className="w-4 h-4" /> Upload
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                {form.featured_image && (
                  <img src={form.featured_image} alt="Preview" className="w-20 h-14 object-cover rounded-lg border" />
                )}
              </div>
              <Input value={form.featured_image} onChange={(e) => setForm({ ...form, featured_image: e.target.value })} className="mt-2" placeholder="Or paste image URL..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg text-[#0a1628]">Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm">Public visibility</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.students_only_replies} onChange={(e) => setForm({ ...form, students_only_replies: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm">Students-only replies</span>
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Link href="/admin/community"><Button variant="ghost">Cancel</Button></Link>
          <Button type="submit" className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />{saving ? 'Publishing...' : 'Publish Post'}
          </Button>
        </div>
      </form>
    </div>
  )
}
