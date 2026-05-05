'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AuthModal } from './auth-modal'
import { Menu, X } from 'lucide-react'

export function Header() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignIn = () => {
    setAuthMode('signin')
    setShowAuthModal(true)
    setMobileMenuOpen(false)
  }

  const handleSignUp = () => {
    setAuthMode('signup')
    setShowAuthModal(true)
    setMobileMenuOpen(false)
  }

  return (
    <>
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/assets/ogn-logo-small.png"
                alt="Overcomers Global Network University"
                width={56}
                height={56}
                className="h-10 w-10 sm:h-14 sm:w-14 object-contain"
              />
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-[#0a1628] leading-tight">OGN University</p>
                <p className="text-[10px] tracking-[2px] text-[#c9a227] font-semibold">EDUCATE • EQUIP • EVOLVE</p>
              </div>
            </Link>

            {/* Desktop Nav */}
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

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2 md:hidden">
              <Button
                onClick={handleSignIn}
                variant="ghost"
                size="sm"
                className="text-[#0a1628] font-semibold text-xs"
              >
                SIGN IN
              </Button>
              <Button
                onClick={handleSignUp}
                size="sm"
                className="bg-[#c9a227] text-[#0a1628] font-semibold text-xs rounded-full px-4"
              >
                SIGN UP
              </Button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-[#0a1628] hover:bg-gray-100 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <nav className="container mx-auto px-4 py-3 flex flex-col gap-1">
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-[#0a1628] hover:bg-[#c9a227]/10 hover:text-[#c9a227] font-medium rounded-lg transition-colors">
                HOME
              </Link>
              <Link href="/courses" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-[#0a1628] hover:bg-[#c9a227]/10 hover:text-[#c9a227] font-medium rounded-lg transition-colors">
                COURSES
              </Link>
              <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-[#0a1628] hover:bg-[#c9a227]/10 hover:text-[#c9a227] font-medium rounded-lg transition-colors">
                CONTACT
              </Link>
              <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-[#0a1628] hover:bg-[#c9a227]/10 hover:text-[#c9a227] font-medium rounded-lg transition-colors">
                ABOUT US
              </Link>
              <div className="border-t my-2" />
              <div className="flex gap-2 px-4 py-2">
                <Button onClick={handleSignIn} variant="outline" className="flex-1 font-semibold border-[#0a1628] text-[#0a1628]">
                  SIGN IN
                </Button>
                <Button onClick={handleSignUp} className="flex-1 bg-[#c9a227] text-[#0a1628] font-semibold">
                  SIGN UP
                </Button>
              </div>
            </nav>
          </div>
        )}
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
