'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FileText, Search, Download, Eye, File, Image as ImageIcon, Video, Clock, User
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import Link from 'next/link'

export default function ResourcesPage() {
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadResources() }, [])

  const loadResources = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('shared_content_recipients')
      .select('*, content:content_id(*, sender:sender_id(full_name, role))')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })

    setItems(data || [])
    setLoading(false)
  }

  const markRead = async (recipientId: string) => {
    await supabase
      .from('shared_content_recipients')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', recipientId)
  }

  const fileIcon = (type: string) => {
    if (type === 'image') return <ImageIcon className="w-5 h-5 text-blue-500" />
    if (type === 'video') return <Video className="w-5 h-5 text-red-500" />
    return <File className="w-5 h-5 text-gray-500" />
  }

  const filtered = items.filter(i =>
    i.content?.title?.toLowerCase().includes(search.toLowerCase()) ||
    i.content?.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#0a1628] text-white py-10">
        <div className="container mx-auto px-6">
          <div className="flex items-center gap-4">
            <Image src="/assets/ogn-logo-small.png" alt="OGN" width={50} height={40} className="object-contain" />
            <div>
              <h1 className="text-2xl font-bold">My Resources</h1>
              <p className="text-[#c9a227] text-sm">Content shared with you by your teachers</p>
            </div>
          </div>
          <div className="relative max-w-md mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search resources..." className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <FileText className="w-16 h-16 mx-auto mb-4" />
            <p className="text-lg">No resources shared with you yet</p>
            <p className="text-sm mt-1">Your teachers will share materials here</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {filtered.map((item) => {
              const content = item.content
              if (!content) return null
              return (
                <Card key={item.id} className={`overflow-hidden hover:shadow-md transition-shadow ${!item.is_read ? 'border-l-4 border-l-[#c9a227]' : ''}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        {fileIcon(content.file_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-[#0a1628]">{content.title}</h3>
                          {!item.is_read && <Badge className="bg-[#c9a227] text-[#0a1628] text-[10px]">NEW</Badge>}
                          <Badge variant="outline" className="text-[10px]">{content.file_type}</Badge>
                        </div>
                        {content.description && <p className="text-sm text-gray-600 mb-2">{content.description}</p>}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" /> {content.sender?.full_name || 'Admin'}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                      <a href={content.file_url} target="_blank" rel="noopener noreferrer" onClick={() => markRead(item.id)}>
                        <Button size="sm" className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628]">
                          <Eye className="w-4 h-4 mr-1" /> View
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
