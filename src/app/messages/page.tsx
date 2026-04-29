'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Search, Send, Plus, X, Users } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { ROLE_LABELS } from '@/lib/constants'
import Image from 'next/image'

export default function MessagesPage() {
  const supabase = createClient()
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedConv, setSelectedConv] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewConv, setShowNewConv] = useState(false)
  const [teachers, setTeachers] = useState<any[]>([])
  const [teacherSearch, setTeacherSearch] = useState('')

  useEffect(() => {
    loadUser()
    loadConversations()
  }, [])

  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv)
      markRead(selectedConv)
      const channel = supabase
        .channel(`conv:${selectedConv}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConv}` }, () => loadMessages(selectedConv))
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
  }, [selectedConv])

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setCurrentUser(profile)
    }
  }

  const loadConversations = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase
      .from('conversations')
      .select('*, participant_1:participant_1_id(id, full_name, email, role), participant_2:participant_2_id(id, full_name, email, role)')
      .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false })
    setConversations(data || [])
    setLoading(false)
  }

  const loadMessages = async (convId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:sender_id(id, full_name, role)')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
  }

  const markRead = async (convId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('messages').update({ is_read: true }).eq('conversation_id', convId).neq('sender_id', user.id).eq('is_read', false)
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConv) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('messages').insert({ conversation_id: selectedConv, sender_id: user.id, content: newMessage.trim() })
    if (error) toast.error('Failed to send message')
    else { setNewMessage(''); loadMessages(selectedConv); loadConversations() }
  }

  const loadTeachers = async () => {
    // Students can message teachers, prophets, ministers, and super_admins
    const { data } = await supabase.from('profiles').select('id, full_name, email, role').in('role', ['super_admin', 'prophet', 'teacher', 'minister']).order('full_name')
    setTeachers(data || [])
  }

  const startNewConversation = async (recipientId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(participant_1_id.eq.${user.id},participant_2_id.eq.${recipientId}),and(participant_1_id.eq.${recipientId},participant_2_id.eq.${user.id})`)
      .single()

    if (existing) {
      setSelectedConv(existing.id)
      setShowNewConv(false)
      return
    }

    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({ participant_1_id: user.id, participant_2_id: recipientId, last_message_at: new Date().toISOString() })
      .select().single()

    if (error) { toast.error('Failed to start conversation'); return }
    toast.success('Conversation started!')
    setShowNewConv(false)
    await loadConversations()
    setSelectedConv(newConv.id)
  }

  const getOther = (conv: any) => {
    if (!currentUser) return null
    return conv.participant_1?.id === currentUser.id ? conv.participant_2 : conv.participant_1
  }

  const filteredConvs = conversations.filter(c => {
    const other = getOther(c)
    return other?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || other?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const filteredTeachers = teachers.filter(t =>
    t.full_name?.toLowerCase().includes(teacherSearch.toLowerCase()) || t.email?.toLowerCase().includes(teacherSearch.toLowerCase())
  )

  const selectedConvData = conversations.find(c => c.id === selectedConv)
  const otherParticipant = selectedConvData ? getOther(selectedConvData) : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#0a1628] text-white py-8">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image src="/assets/ogn-logo-small.png" alt="OGN" width={50} height={40} className="object-contain" />
              <div>
                <h1 className="text-2xl font-bold">Messages</h1>
                <p className="text-[#c9a227] text-sm">Communicate with your teachers and staff</p>
              </div>
            </div>
            <Button onClick={() => { setShowNewConv(true); loadTeachers() }} className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold">
              <Plus className="w-4 h-4 mr-2" /> Message a Teacher
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* New Conversation Selector */}
        {showNewConv && (
          <Card className="mb-6 border-[#c9a227] border-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base text-[#0a1628]">Select a Teacher or Staff Member</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowNewConv(false)}><X className="w-4 h-4" /></Button>
            </CardHeader>
            <CardContent>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input placeholder="Search teachers..." className="pl-9" value={teacherSearch} onChange={(e) => setTeacherSearch(e.target.value)} />
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                {filteredTeachers.map((t) => (
                  <button key={t.id} onClick={() => startNewConversation(t.id)}
                    className="text-left p-3 rounded-lg hover:bg-gray-50 border flex items-center gap-3 transition-all hover:border-[#c9a227]">
                    <div className="w-9 h-9 rounded-full bg-[#0a1628] text-[#c9a227] flex items-center justify-center text-sm font-bold shrink-0">{t.full_name?.charAt(0) || '?'}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.full_name}</p>
                      <p className="text-xs text-gray-500">{ROLE_LABELS[t.role] || t.role}</p>
                    </div>
                  </button>
                ))}
                {filteredTeachers.length === 0 && <p className="col-span-3 text-center text-gray-400 text-sm py-4">No teachers found</p>}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Conversations List */}
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input placeholder="Search..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 text-center text-gray-500">Loading...</div>
              ) : filteredConvs.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs mt-1">Click "Message a Teacher" to start</p>
                </div>
              ) : (
                <div className="divide-y max-h-[500px] overflow-y-auto">
                  {filteredConvs.map((conv) => {
                    const other = getOther(conv)
                    return (
                      <button key={conv.id} onClick={() => setSelectedConv(conv.id)}
                        className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${selectedConv === conv.id ? 'bg-[#0a1628]/5 border-l-2 border-[#c9a227]' : ''}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#0a1628] text-[#c9a227] flex items-center justify-center text-sm font-bold shrink-0">
                            {other?.full_name?.charAt(0) || 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{other?.full_name || 'User'}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px]">{ROLE_LABELS[other?.role] || other?.role || 'Student'}</Badge>
                              <span className="text-[10px] text-gray-400">{formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Message Thread */}
          <Card className="md:col-span-2">
            {selectedConv && otherParticipant ? (
              <>
                <CardHeader className="border-b py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0a1628] text-[#c9a227] flex items-center justify-center font-bold">
                      {otherParticipant.full_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-semibold text-[#0a1628]">{otherParticipant.full_name || 'User'}</p>
                      <p className="text-xs text-gray-500">{ROLE_LABELS[otherParticipant.role] || otherParticipant.role} • {otherParticipant.email}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-[450px] overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-400 py-12">
                        <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No messages yet. Start the conversation!</p>
                      </div>
                    ) : messages.map((msg) => {
                      const isOwn = msg.sender_id === currentUser?.id
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${isOwn ? 'bg-[#0a1628] text-white' : 'bg-gray-100 text-gray-900'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <p className={`text-[10px] mt-1 ${isOwn ? 'text-gray-400' : 'text-gray-500'}`}>
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="border-t p-3">
                    <form onSubmit={sendMessage} className="flex gap-2">
                      <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type your message..." className="flex-1" />
                      <Button type="submit" className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628]"><Send className="w-4 h-4" /></Button>
                    </form>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="p-12 text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold mb-2 text-gray-700">No conversation selected</h3>
                <p className="text-gray-500 text-sm">Select a conversation or message a teacher to get started</p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
