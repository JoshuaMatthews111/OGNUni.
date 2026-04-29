'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Search, Send } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface Conversation {
  id: string
  participant_1: any
  participant_2: any
  last_message_at: string
  unread_count: number
}

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
  is_read: boolean
  sender: any
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadUser()
    loadConversations()
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation)
      markMessagesAsRead(selectedConversation)

      // Subscribe to new messages
      const channel = supabase
        .channel(`conversation:${selectedConversation}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${selectedConversation}`,
          },
          (payload) => {
            loadMessages(selectedConversation)
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [selectedConversation])

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

  const loadConversations = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participant_1:participant_1_id(id, full_name, email, avatar_url, role),
        participant_2:participant_2_id(id, full_name, email, avatar_url, role)
      `)
      .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false })

    if (data) {
      setConversations(data)
    }
    setLoading(false)
  }

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id(id, full_name, avatar_url, role)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (data) {
      setMessages(data)
    }
  }

  const markMessagesAsRead = async (conversationId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .eq('is_read', false)
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: selectedConversation,
        sender_id: user.id,
        content: newMessage.trim(),
      })

    if (error) {
      toast.error('Failed to send message')
    } else {
      setNewMessage('')
      loadMessages(selectedConversation)
      loadConversations()
    }
  }

  const getOtherParticipant = (conversation: Conversation) => {
    if (!currentUser) return null
    return conversation.participant_1.id === currentUser.id
      ? conversation.participant_2
      : conversation.participant_1
  }

  const selectedConv = conversations.find(c => c.id === selectedConversation)
  const otherParticipant = selectedConv ? getOtherParticipant(selectedConv) : null

  const filteredConversations = conversations.filter(conv => {
    const other = getOtherParticipant(conv)
    return other?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           other?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-4xl font-serif mb-8 text-[#2a2e35]">Messages</h1>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Conversations List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-xl">Conversations</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 text-center text-gray-500">Loading...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No conversations yet</div>
            ) : (
              <div className="divide-y">
                {filteredConversations.map((conv) => {
                  const other = getOtherParticipant(conv)
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv.id)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        selectedConversation === conv.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#003d82] text-white flex items-center justify-center font-semibold">
                          {other?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold truncate">{other?.full_name || 'User'}</h3>
                            {conv.unread_count > 0 && (
                              <Badge className="bg-[#003d82]">{conv.unread_count}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {other?.role || 'student'}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                            </span>
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
          {selectedConversation && otherParticipant ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#003d82] text-white flex items-center justify-center font-semibold text-lg">
                    {otherParticipant.full_name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{otherParticipant.full_name || 'User'}</h2>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{otherParticipant.role || 'student'}</Badge>
                      <span className="text-sm text-gray-500">{otherParticipant.email}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Messages */}
                <div className="h-[500px] overflow-y-auto p-6 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-12">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isOwn = message.sender_id === currentUser?.id
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                            <div
                              className={`rounded-lg p-4 ${
                                isOwn
                                  ? 'bg-[#003d82] text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{message.content}</p>
                            </div>
                            <p className={`text-xs text-gray-500 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Message Input */}
                <div className="border-t p-4">
                  <form onSubmit={sendMessage} className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" className="bg-[#003d82] hover:bg-[#0052ad]">
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="p-12 text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold mb-2 text-gray-700">No conversation selected</h3>
              <p className="text-gray-500">Select a conversation to start messaging</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
