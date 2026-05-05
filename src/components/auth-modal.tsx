'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { GraduationCap, BookOpen, Shield, Mail, KeyRound } from 'lucide-react'

const ENABLE_GOOGLE_AUTH = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === 'true'
const ENABLE_APPLE_AUTH = process.env.NEXT_PUBLIC_ENABLE_APPLE_AUTH === 'true'

const DEMO_ACCOUNTS = [
  { label: 'Student', email: 'student@overcomersuniversity.com', password: 'Student123!', icon: GraduationCap, color: 'bg-blue-600 hover:bg-blue-700', redirect: '/dashboard' },
  { label: 'Teacher', email: 'teacher@overcomersuniversity.com', password: 'Teacher123!', icon: BookOpen, color: 'bg-green-600 hover:bg-green-700', redirect: '/admin' },
  { label: 'Admin', email: 'admin@overcomersuniversity.com', password: 'Admin123!', icon: Shield, color: 'bg-red-600 hover:bg-red-700', redirect: '/admin' },
]

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'signin' | 'signup'
  onModeChange: (mode: 'signin' | 'signup') => void
}

export function AuthModal({ isOpen, onClose, mode, onModeChange }: AuthModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [loginMethod, setLoginMethod] = useState<'password' | 'magic_link'>('password')
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [signupComplete, setSignupComplete] = useState(false)
  const [forgotPassword, setForgotPassword] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)

  const supabase = createClient()

  const handleDemoLogin = async (account: typeof DEMO_ACCOUNTS[0]) => {
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    })

    if (error) {
      if (
        error.message.toLowerCase().includes('failed to fetch') ||
        error.message.toLowerCase().includes('fetch failed')
      ) {
        toast.error(
          'Supabase is not configured. Update NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (placeholders are currently set).'
        )
        setLoading(false)
        return
      }

      if (error.message.includes('Invalid login') || error.message.includes('invalid')) {
        setSeeding(true)
        toast.info('Setting up demo accounts...')
        try {
          const res = await fetch('/api/seed-demo', { method: 'POST' })
          if (res.ok) {
            const { error: retryError } = await supabase.auth.signInWithPassword({
              email: account.email,
              password: account.password,
            })
            if (retryError) {
              toast.error('Demo login failed: ' + retryError.message)
              setLoading(false)
              setSeeding(false)
              return
            }
          } else {
            let message = 'Failed to create demo accounts. Check your Supabase service role key.'
            try {
              const body = await res.json()
              if (body?.error) message = body.error
            } catch {}
            toast.error(message)
            setLoading(false)
            setSeeding(false)
            return
          }
        } catch {
          toast.error('Could not reach demo seed API')
          setLoading(false)
          setSeeding(false)
          return
        }
        setSeeding(false)
      } else {
        toast.error(error.message)
        setLoading(false)
        return
      }
    }

    toast.success(`Welcome! Logged in as ${account.label}`)
    onClose()
    window.location.href = account.redirect
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Welcome back!')
      onClose()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', authUser.id).single()
        if (profile && ['super_admin', 'prophet', 'teacher', 'minister'].includes(profile.role)) {
          window.location.href = '/admin'
          return
        }
      }
      window.location.href = '/dashboard'
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Please enter your email address')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'forgot_password' }),
      })
      const result = await res.json()
      setLoading(false)
      if (res.ok) {
        setResetEmailSent(true)
        toast.success('Password reset link sent! Check your email.')
      } else {
        toast.error(result.error || 'Failed to send reset link.')
      }
    } catch {
      setLoading(false)
      toast.error('Something went wrong. Please try again.')
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Please enter your email address')
      return
    }
    setLoading(true)

    try {
      const res = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          type: 'magic_link',
          redirectUrl: `${window.location.origin}/auth/callback`,
        }),
      })

      const result = await res.json()
      setLoading(false)

      if (res.ok) {
        setMagicLinkSent(true)
        toast.success('Login link sent! Check your email inbox.')
      } else {
        toast.error(result.error || 'Failed to send login link. Try again.')
      }
    } catch {
      setLoading(false)
      toast.error('Something went wrong. Please try again.')
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already been registered') || error.message.toLowerCase().includes('user already registered')) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
        setLoading(false)
        if (signInErr) {
          toast.error('An account with this email already exists. Try signing in or use a login link.')
          onModeChange('signin')
        } else {
          toast.success('Welcome back!')
          onClose()
          const { data: { user: authUser } } = await supabase.auth.getUser()
          if (authUser) {
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', authUser.id).single()
            if (profile && ['super_admin', 'prophet', 'teacher', 'minister'].includes(profile.role)) {
              window.location.href = '/admin'
              return
            }
          }
          window.location.href = '/dashboard'
        }
        return
      }
      setLoading(false)
      toast.error(error.message)
    } else {
      // Check if account already existed (identities empty)
      if (data?.user?.identities?.length === 0) {
        setLoading(false)
        toast.error('An account with this email already exists. Please sign in.')
        onModeChange('signin')
        return
      }

      // Sign out immediately - user must verify email first
      await supabase.auth.signOut()

      // Send verification email via our SendGrid API
      try {
        await fetch('/api/auth/send-magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            type: 'signup_verification',
            name: fullName,
            redirectUrl: `${window.location.origin}/auth/callback`,
          }),
        })
      } catch {}

      // Notify admin of new signup
      try {
        await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trigger: 'new_signup', data: { name: fullName, email } }),
        })
      } catch {}

      setLoading(false)
      setSignupComplete(true)
    }
  }

  const handleSocialSignIn = async (provider: 'google' | 'apple') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true,
      },
    })

    if (error) {
      const msg = error.message || JSON.stringify(error)
      if (msg.includes('not enabled') || msg.includes('Unsupported provider') || msg.includes('validation_failed') || msg.includes('provider')) {
        toast.error(
          `${provider === 'google' ? 'Google' : 'Apple'} login is not yet configured. Please use email and password to sign in.`,
          { duration: 5000 }
        )
      } else {
        toast.error(msg)
      }
      return
    }

    if (data?.url) {
      window.location.href = data.url
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {mode === 'signin' ? 'Login to start learning' : 'Sign up to Overcomers Global Network University!'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Demo Login Box */}
          {mode === 'signin' && (
            <div className="bg-[#f8f9fa] border border-[#c9a227]/30 rounded-xl p-4">
              <p className="text-xs font-bold text-[#0a1628] text-center mb-3 tracking-wide">DEMO ACCOUNTS — Quick Login</p>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map((account) => {
                  const Icon = account.icon
                  return (
                    <button
                      key={account.label}
                      onClick={() => handleDemoLogin(account)}
                      disabled={loading}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg text-white text-xs font-semibold transition-all ${account.color} disabled:opacity-50`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{seeding ? 'Setting up...' : `Login as ${account.label}`}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-2">Demo accounts are auto-created on first use</p>
            </div>
          )}

          {/* Sign In Mode */}
          {mode === 'signin' && (
            <>
              {/* Login Method Toggle */}
              <div className="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => { setLoginMethod('password'); setMagicLinkSent(false) }}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-md text-xs font-semibold transition-all ${
                    loginMethod === 'password' ? 'bg-[#0a1628] text-[#c9a227] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" /> Password
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginMethod('magic_link'); setMagicLinkSent(false) }}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-md text-xs font-semibold transition-all ${
                    loginMethod === 'magic_link' ? 'bg-[#0a1628] text-[#c9a227] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" /> Email Me a Login Link
                </button>
              </div>

              {/* Password Login */}
              {loginMethod === 'password' && !forgotPassword && (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
                  </div>
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required />
                  </div>
                  <Button type="submit" className="w-full bg-[#0a1628] hover:bg-[#c9a227] hover:text-[#0a1628] font-semibold" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                  <div className="text-center">
                    <button type="button" onClick={() => setForgotPassword(true)} className="text-xs text-[#c9a227] hover:underline">
                      Forgot your password?
                    </button>
                  </div>
                </form>
              )}

              {/* Forgot Password */}
              {loginMethod === 'password' && forgotPassword && (
                <>
                  {resetEmailSent ? (
                    <div className="text-center py-6 space-y-3">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <Mail className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-[#0a1628]">Reset link sent!</h3>
                      <p className="text-sm text-gray-500">Check your email for the password reset link.</p>
                      <button onClick={() => { setForgotPassword(false); setResetEmailSent(false) }} className="text-xs text-[#c9a227] hover:underline">
                        Back to sign in
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <p className="text-sm text-gray-600 text-center">Enter your email and we'll send you a link to reset your password.</p>
                      <div>
                        <Label htmlFor="reset-email">Email *</Label>
                        <Input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
                      </div>
                      <Button type="submit" className="w-full bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold" disabled={loading}>
                        {loading ? 'Sending...' : 'Send Reset Link'}
                      </Button>
                      <div className="text-center">
                        <button type="button" onClick={() => setForgotPassword(false)} className="text-xs text-gray-500 hover:underline">
                          Back to sign in
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}

              {/* Magic Link Login */}
              {loginMethod === 'magic_link' && (
                <>
                  {magicLinkSent ? (
                    <div className="text-center py-6 space-y-3">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <Mail className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-[#0a1628]">Check your email!</h3>
                      <p className="text-sm text-gray-500">We sent a login link to <strong>{email}</strong>. Click the link in the email to sign in.</p>
                      <button onClick={() => setMagicLinkSent(false)} className="text-xs text-[#c9a227] hover:underline">
                        Send to a different email
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleMagicLink} className="space-y-4">
                      <div>
                        <Label htmlFor="magic-email">Email *</Label>
                        <Input id="magic-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
                      </div>
                      <p className="text-xs text-gray-400">We'll send a secure login link to your email. No password needed.</p>
                      <Button type="submit" className="w-full bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold" disabled={loading}>
                        {loading ? 'Sending...' : 'Send Login Link'}
                      </Button>
                    </form>
                  )}
                </>
              )}
            </>
          )}

          {/* Sign Up Mode */}
          {mode === 'signup' && (
            <>
              {signupComplete ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Mail className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#0a1628]">Check your email!</h3>
                  <p className="text-sm text-gray-600">We sent a verification link to:</p>
                  <p className="font-semibold text-[#0a1628]">{email}</p>
                  <p className="text-sm text-gray-500">Click the link in the email to verify your account and start learning.</p>
                  <div className="border-t pt-3 mt-4">
                    <p className="text-xs text-gray-400">Didn't get the email? Check your spam folder or</p>
                    <button
                      onClick={() => { setSignupComplete(false) }}
                      className="text-xs text-[#c9a227] hover:underline font-semibold"
                    >
                      try again with a different email
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" required />
                  </div>
                  <div>
                    <Label htmlFor="signup-email">Email *</Label>
                    <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
                  </div>
                  <div>
                    <Label htmlFor="signup-password">Create Password *</Label>
                    <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6} />
                  </div>
                  <Button type="submit" className="w-full bg-[#0a1628] hover:bg-[#c9a227] hover:text-[#0a1628] font-semibold" disabled={loading}>
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              )}
            </>
          )}

          {/* Google/Apple (only shown if enabled via env) */}
          {(ENABLE_GOOGLE_AUTH || ENABLE_APPLE_AUTH) && (
            <>
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-gray-400">or continue with</span></div>
              </div>
              <div className={`grid gap-2 ${ENABLE_GOOGLE_AUTH && ENABLE_APPLE_AUTH ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {ENABLE_GOOGLE_AUTH && (
                  <Button variant="outline" onClick={() => handleSocialSignIn('google')} className="w-full h-10 gap-2 text-sm font-medium" type="button">
                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Google
                  </Button>
                )}
                {ENABLE_APPLE_AUTH && (
                  <Button variant="outline" onClick={() => handleSocialSignIn('apple')} className="w-full h-10 gap-2 text-sm font-medium" type="button">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                    Apple
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Switch mode */}
          <div className="text-center text-sm">
            {mode === 'signin' ? (
              <button onClick={() => onModeChange('signup')} className="text-[#0a1628] hover:text-[#c9a227] hover:underline">
                Don't have an account? <strong>Sign up free</strong>
              </button>
            ) : (
              <button onClick={() => onModeChange('signin')} className="text-[#0a1628] hover:text-[#c9a227] hover:underline">
                Already have an account? <strong>Sign in</strong>
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
