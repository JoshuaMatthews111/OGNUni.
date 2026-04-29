import { SupabaseClient } from '@supabase/supabase-js'

export interface MessagePayload {
  conversation_id: string
  sender_id: string
  content: string
  message_type?: 'text' | 'image' | 'video' | 'link' | 'help_request'
  attachment_url?: string | null
  attachment_type?: string | null
}

/**
 * Send a message with optional media attachment
 */
export async function sendMessageWithMedia(
  supabase: SupabaseClient,
  payload: MessagePayload
) {
  const { error } = await supabase.from('messages').insert({
    conversation_id: payload.conversation_id,
    sender_id: payload.sender_id,
    content: payload.content,
    message_type: payload.message_type || 'text',
    attachment_url: payload.attachment_url || null,
    attachment_type: payload.attachment_type || null,
  })

  if (!error) {
    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', payload.conversation_id)
  }

  return { error }
}

/**
 * Upload a file attachment for messaging
 */
export async function uploadMessageAttachment(
  supabase: SupabaseClient,
  file: File
): Promise<{ url: string; type: string } | null> {
  const ext = file.name.split('.').pop()
  const fileName = `msg-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from('course-thumbnails')
    .upload(fileName, file)

  if (error) return null

  const { data } = supabase.storage
    .from('course-thumbnails')
    .getPublicUrl(fileName)

  let type = 'file'
  if (file.type.startsWith('image/')) type = 'image'
  else if (file.type.startsWith('video/')) type = 'video'

  return { url: data.publicUrl, type }
}

/**
 * Find or create a conversation between two users
 */
export async function findOrCreateConversation(
  supabase: SupabaseClient,
  userId: string,
  recipientId: string,
  subject?: string
): Promise<string | null> {
  // Check existing
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .or(
      `and(participant_1_id.eq.${userId},participant_2_id.eq.${recipientId}),and(participant_1_id.eq.${recipientId},participant_2_id.eq.${userId})`
    )
    .single()

  if (existing) return existing.id

  // Create new
  const insertData: any = {
    participant_1_id: userId,
    participant_2_id: recipientId,
    last_message_at: new Date().toISOString(),
  }
  if (subject) insertData.subject = subject

  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert(insertData)
    .select()
    .single()

  if (error || !newConv) return null
  return newConv.id
}

/**
 * Detect if a string contains a URL and extract it
 */
export function extractUrl(text: string): string | null {
  const urlRegex = /(https?:\/\/[^\s]+)/gi
  const match = text.match(urlRegex)
  return match ? match[0] : null
}

/**
 * Determine message type from content
 */
export function detectMessageType(content: string, hasAttachment: boolean, attachmentType?: string): string {
  if (hasAttachment) {
    if (attachmentType === 'image') return 'image'
    if (attachmentType === 'video') return 'video'
    return 'file'
  }
  if (extractUrl(content)) return 'link'
  return 'text'
}
