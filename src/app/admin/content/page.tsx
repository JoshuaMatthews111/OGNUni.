'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ROLE_LABELS } from '@/lib/constants'
import {
  Upload, Send, FileText, Search, Plus, X, Check,
  File, Image as ImageIcon, Video, Trash2, Users, Eye
} from 'lucide-react'
import { toast } from 'sonner'

export default function AdminContentPage() {
  const supabase = createClient()
  const [sharedContent, setSharedContent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [allStudents, setAllStudents] = useState<any[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [studentSearch, setStudentSearch] = useState('')
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState({
    title: '',
    description: '',
    file_url: '',
    file_type: 'document',
  })

  useEffect(() => { loadContent() }, [])

  const loadContent = async () => {
    const { data } = await supabase
      .from('shared_content')
      .select('*, sender:sender_id(full_name, role), recipients:shared_content_recipients(id, recipient:recipient_id(full_name, email), is_read)')
      .order('created_at', { ascending: false })
    setSharedContent(data || [])
    setLoading(false)
  }

  const loadStudents = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .order('full_name')
    setAllStudents(data || [])
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const ext = file.name.split('.').pop()
    const fileName = `content-${Date.now()}.${ext}`

    const { error } = await supabase.storage.from('course-thumbnails').upload(fileName, file)
    if (error) {
      toast.error('Upload failed: ' + error.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('course-thumbnails').getPublicUrl(fileName)
    const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document'
    setForm(f => ({ ...f, file_url: data.publicUrl, file_type: type }))
    toast.success('File uploaded!')
    setUploading(false)
  }

  const handleSend = async () => {
    if (!form.title || !form.file_url) { toast.error('Title and file are required'); return }
    if (selectedStudents.size === 0) { toast.error('Select at least one recipient'); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: content, error } = await supabase
      .from('shared_content')
      .insert({
        title: form.title,
        description: form.description,
        file_url: form.file_url,
        file_type: form.file_type,
        sender_id: user.id,
      })
      .select().single()

    if (error || !content) { toast.error('Failed to create content'); return }

    const recipients = Array.from(selectedStudents).map(sid => ({
      content_id: content.id,
      recipient_id: sid,
    }))

    const { error: recErr } = await supabase.from('shared_content_recipients').insert(recipients)
    if (recErr) { toast.error('Failed to assign recipients'); return }

    toast.success(`Content shared with ${selectedStudents.size} student(s)!`)
    setForm({ title: '', description: '', file_url: '', file_type: 'document' })
    setSelectedStudents(new Set())
    setShowUpload(false)
    loadContent()
  }

  const deleteContent = async (id: string) => {
    if (!confirm('Delete this shared content?')) return
    await supabase.from('shared_content_recipients').delete().eq('content_id', id)
    const { error } = await supabase.from('shared_content').delete().eq('id', id)
    if (error) toast.error('Failed to delete')
    else { toast.success('Content deleted'); loadContent() }
  }

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllStudents = () => {
    const students = filteredStudents
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(students.map(s => s.id)))
    }
  }

  const filteredStudents = allStudents.filter(s =>
    s.full_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email?.toLowerCase().includes(studentSearch.toLowerCase())
  )

  const fileIcon = (type: string) => {
    if (type === 'image') return <ImageIcon className="w-4 h-4 text-blue-500" />
    if (type === 'video') return <Video className="w-4 h-4 text-red-500" />
    return <File className="w-4 h-4 text-gray-500" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0a1628]">Content Sharing</h1>
          <p className="text-sm text-gray-500">Upload and distribute content to specific students</p>
        </div>
        <Button onClick={() => { setShowUpload(true); loadStudents() }} className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold">
          <Plus className="w-4 h-4 mr-2" /> Upload & Share
        </Button>
      </div>

      {/* Upload & Share Form */}
      {showUpload && (
        <Card className="border-[#c9a227] border-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base text-[#0a1628]">Share Content with Students</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowUpload(false)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Study Guide - Week 3" />
              </div>
              <div>
                <Label>Type</Label>
                <select value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })} className="w-full h-10 px-3 border rounded-md text-sm">
                  <option value="document">Document</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm" placeholder="Brief description of the content..." />
            </div>

            <div>
              <Label>File</Label>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#0a1628] text-white rounded-lg cursor-pointer hover:bg-[#1a3a5c] text-sm">
                  <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload File'}
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
                <Input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="Or paste file/link URL..." className="flex-1" />
              </div>
              {form.file_url && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                  <Check className="w-4 h-4" /> File ready
                </div>
              )}
            </div>

            {/* Student Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Select Recipients *</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{selectedStudents.size} selected</Badge>
                  <Button variant="ghost" size="sm" onClick={selectAllStudents} className="text-xs">
                    {selectedStudents.size === filteredStudents.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input placeholder="Search students..." className="pl-9" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                {filteredStudents.map((s) => (
                  <button key={s.id} onClick={() => toggleStudent(s.id)}
                    className={`w-full text-left p-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors ${selectedStudents.has(s.id) ? 'bg-[#c9a227]/5' : ''}`}>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${selectedStudents.has(s.id) ? 'bg-[#c9a227] border-[#c9a227]' : 'border-gray-300'}`}>
                      {selectedStudents.has(s.id) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.full_name || s.email}</p>
                      <p className="text-xs text-gray-500">{ROLE_LABELS[s.role] || s.role} • {s.email}</p>
                    </div>
                  </button>
                ))}
                {filteredStudents.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No users found</p>}
              </div>
            </div>

            <Button onClick={handleSend} className="w-full bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold" disabled={!form.title || !form.file_url || selectedStudents.size === 0}>
              <Send className="w-4 h-4 mr-2" /> Share with {selectedStudents.size} Student{selectedStudents.size !== 1 ? 's' : ''}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Content List */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin" /></div>
      ) : sharedContent.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3" />
            <p>No shared content yet. Upload and share content with your students!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sharedContent.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {fileIcon(item.file_type)}
                      <h3 className="font-semibold text-[#0a1628]">{item.title}</h3>
                      <Badge variant="outline" className="text-[10px]">{item.file_type}</Badge>
                    </div>
                    {item.description && <p className="text-sm text-gray-600 mb-2">{item.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>By {item.sender?.full_name || 'Admin'}</span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {item.recipients?.length || 0} recipients
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {item.recipients?.filter((r: any) => r.is_read).length || 0} viewed
                      </span>
                    </div>
                    {item.recipients && item.recipients.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.recipients.slice(0, 5).map((r: any) => (
                          <Badge key={r.id} variant="outline" className={`text-[10px] ${r.is_read ? 'bg-green-50 text-green-700' : ''}`}>
                            {r.recipient?.full_name || 'User'}
                          </Badge>
                        ))}
                        {item.recipients.length > 5 && (
                          <Badge variant="outline" className="text-[10px]">+{item.recipients.length - 5} more</Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 ml-4">
                    <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm"><Eye className="w-3.5 h-3.5" /></Button>
                    </a>
                    <Button variant="ghost" size="sm" onClick={() => deleteContent(item.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
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
