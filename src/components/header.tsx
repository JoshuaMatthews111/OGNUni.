'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AuthModal } from './auth-modal'

export function Header() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')

  const handleSignIn = () => {
    setAuthMode('signin')
    setShowAuthModal(true)
  }

  const handleSignUp = () => {
    setAuthMode('signup')
    setShowAuthModal(true)
  }

  return (
    <>
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/assets/ogn-logo-small.png"
                alt="Overcomers Global Network University"
                width={56}
                height={56}
                className="h-14 w-14 object-contain"
              />
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-[#0a1628] leading-tight">OGN University</p>
                <p className="text-[10px] tracking-[2px] text-[#c9a227] font-semibold">EDUCATE • EQUIP • EVOLVE</p>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-[#0a1628] hover:text-[#c9a227] font-medium">
                HOME
              </Link>
              <Link href="/courses" className="text-[#0a1628] hover:text-[#c9a227] font-medium">
                COURSES
              </Link>
              <Link href="/contact" className="text-[#0a1628] hover:text-[#c9a227] font-medium">
                CONTACT
              </Link>
              <Link href="/about" className="text-[#0a1628] hover:text-[#c9a227] font-medium">
                ABOUT US
              </Link>
              <button
                onClick={handleSignIn}
                className="text-[#0a1628] hover:text-[#c9a227] font-medium"
              >
                SIGN IN
              </button>
              <Button
                onClick={handleSignUp}
                className="bg-[#c9a227] border-2 border-[#c9a227] text-[#0a1628] hover:bg-[#0a1628] hover:text-[#c9a227] rounded-full px-8 font-semibold"
              >
                SIGN UP
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />
    </>
  )
}
