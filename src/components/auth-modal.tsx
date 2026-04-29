'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Image from 'next/image'
import { GraduationCap, BookOpen, Shield } from 'lucide-react'

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

  const supabase = createClient()

  const handleDemoLogin = async (account: typeof DEMO_ACCOUNTS[0]) => {
    setLoading(true)

    // Try signing in first
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

      // If user doesn't exist, seed demo accounts first
      if (error.message.includes('Invalid login') || error.message.includes('invalid')) {
        setSeeding(true)
        toast.info('Setting up demo accounts...')
        try {
          const res = await fetch('/api/seed-demo', { method: 'POST' })
          if (res.ok) {
            // Try signing in again
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
            } catch {
              // ignore
            }
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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Welcome back!')
      onClose()
      // Check role and redirect accordingly
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    setLoading(false)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Account created! Please check your email to verify.')
      onClose()
    }
  }

  const handleSocialSignIn = async (provider: 'google' | 'facebook') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      toast.error(error.message)
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

          <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <Label htmlFor="fullName">What's your name? *</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <Label htmlFor="email">What's your e-mail? *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Your password? *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full bg-[#0a1628] hover:bg-[#c9a227] hover:text-[#0a1628]" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'signin' ? 'Login' : 'Start your learning journey'}
            </Button>
          </form>

          <div className="text-center text-sm">
            {mode === 'signin' ? (
              <button
                onClick={() => onModeChange('signup')}
                className="text-[#0a1628] hover:text-[#c9a227] hover:underline"
              >
                Create a new account for free
              </button>
            ) : (
              <button
                onClick={() => onModeChange('signin')}
                className="text-[#0a1628] hover:text-[#c9a227] hover:underline"
              >
                Sign in with your account
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
