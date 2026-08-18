'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, X, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

// Shown to signed-in users whose email is not yet verified
// (user_metadata.email_verified === false, set at signup).
// They keep full access — this is a gentle reminder with a resend option.
export function VerifyEmailBanner() {
  const [email, setEmail] = useState<string | null>(null)
  const [name, setName] = useState<string>('')
  const [visible, setVisible] = useState(false)
  const [sending, setSending] = useState(false)
  const [resent, setResent] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && user.user_metadata?.email_verified === false && user.email) {
        if (sessionStorage.getItem('ogn-verify-banner-dismissed') === '1') return
        setEmail(user.email)
        setName(user.user_metadata?.full_name || '')
        setVisible(true)
      }
    }
    check()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleResend = async () => {
    if (!email || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, type: 'signup_verification' }),
      })
      if (res.ok) {
        setResent(true)
        toast.success('Verification email sent! Check your inbox and spam folder.')
      } else {
        toast.error('Could not send the email. Please try again in a moment.')
      }
    } catch {
      toast.error('Could not send the email. Please try again in a moment.')
    }
    setSending(false)
  }

  const handleDismiss = () => {
    sessionStorage.setItem('ogn-verify-banner-dismissed', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="bg-gradient-to-r from-[#0a1628] via-[#0e1e38] to-[#0a1628] border border-[#c9a227]/40 rounded-lg px-4 py-3 mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 shadow-lg">
      <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
        <div className="shrink-0 flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/ogn-university-logo-transparent.png" alt="OGN University" className="w-10 h-10 object-contain" />
          <span className="text-[7px] tracking-[0.15em] text-[#c9a227] font-semibold mt-0.5 whitespace-nowrap">EDUCATE • EQUIP • EVOLVE</span>
        </div>
        <Mail className="w-5 h-5 text-[#c9a227] shrink-0 mt-0.5 sm:mt-0 hidden sm:block" />
        <p className="text-sm text-white/90">
          {resent ? (
            <>A new verification email is on its way to <strong className="text-[#c9a227]">{email}</strong>. Check your inbox and spam folder.</>
          ) : (
            <>We sent a verification email to <strong className="text-[#c9a227]">{email}</strong>. You have full access — verify whenever you're ready.</>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        {resent ? (
          <CheckCircle className="w-4 h-4 text-green-400" />
        ) : (
          <button
            onClick={handleResend}
            disabled={sending}
            className="text-xs font-semibold text-[#0a1628] bg-[#c9a227] hover:bg-[#b8941f] px-3 py-1.5 rounded-md transition-colors disabled:opacity-60"
          >
            {sending ? 'Sending...' : 'Resend Email'}
          </button>
        )}
        <button onClick={handleDismiss} aria-label="Dismiss" className="text-white/50 hover:text-white p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
