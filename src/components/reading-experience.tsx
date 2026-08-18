'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Sun, Moon, Type, Maximize2, Minimize2, BookMarked, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export type ReadingMode = 'standard' | 'focus' | 'large_font' | 'scripture' | 'dark' | 'book'

export const READING_MODES: { id: ReadingMode; label: string; icon: string; desc: string }[] = [
  { id: 'standard', label: 'Standard Mode', icon: '📖', desc: 'Clean, comfortable reading' },
  { id: 'focus', label: 'Focus Mode', icon: '🎯', desc: 'Distraction-free immersive reading' },
  { id: 'large_font', label: 'Large Font', icon: '🔤', desc: 'Larger text for accessibility' },
  { id: 'scripture', label: 'Scripture Study', icon: '✝️', desc: 'Optimized for Bible study' },
  { id: 'dark', label: 'Dark Mode', icon: '🌙', desc: 'Eye-friendly dark reading' },
  { id: 'book', label: 'Book Style', icon: '📚', desc: 'Digital workbook layout' },
]

export function useReadingPrefs() {
  const [readingMode, setReadingMode] = useState<ReadingMode>('standard')
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [focusMode, setFocusMode] = useState(false)

  useEffect(() => {
    const sm = localStorage.getItem('ogn-reading-mode')
    if (sm) setReadingMode(sm as ReadingMode)
    const sf = localStorage.getItem('ogn-font-size')
    if (sf) setFontSize(sf as any)
  }, [])

  useEffect(() => { localStorage.setItem('ogn-reading-mode', readingMode) }, [readingMode])
  useEffect(() => { localStorage.setItem('ogn-font-size', fontSize) }, [fontSize])

  const isDark = readingMode === 'dark'
  const fontSizeClass = fontSize === 'small' ? 'text-[14px] sm:text-[15px]' : fontSize === 'large' ? 'text-[18px] sm:text-[20px] lg:text-[22px]' : 'text-[16px] sm:text-[17px]'
  const lineHeightClass = fontSize === 'large' ? 'leading-[2] sm:leading-[2.1]' : 'leading-[1.8] sm:leading-[1.9]'

  const getReadingStyles = (): string => {
    const base = `${fontSizeClass} ${lineHeightClass} tracking-[0.01em]`
    switch (readingMode) {
      case 'focus': return `${base} max-w-xl mx-auto`
      case 'large_font': return `${base} max-w-2xl mx-auto`
      case 'scripture': return `${base} max-w-2xl mx-auto font-serif`
      case 'dark': return `${base} max-w-2xl mx-auto`
      case 'book': return `${base} max-w-2xl mx-auto font-serif`
      default: return `${base} max-w-2xl mx-auto`
    }
  }

  const getContainerStyles = (): string => {
    switch (readingMode) {
      case 'dark': return 'bg-[#0a1628] text-gray-200'
      case 'book': return 'bg-[#faf8f0] text-[#2c2c2c]'
      case 'scripture': return 'bg-[#fdfbf5] text-[#1a1a1a]'
      case 'focus': return 'bg-white text-gray-800'
      default: return 'bg-white text-gray-800'
    }
  }

  return { readingMode, setReadingMode, fontSize, setFontSize, focusMode, setFocusMode, isDark, fontSizeClass, lineHeightClass, getReadingStyles, getContainerStyles }
}

// Reading controls toolbar
export function ReadingControls({ readingMode, setReadingMode, fontSize, setFontSize, isDark, setFocusMode }: {
  readingMode: ReadingMode; setReadingMode: (m: ReadingMode) => void
  fontSize: 'small' | 'medium' | 'large'; setFontSize: (s: 'small' | 'medium' | 'large') => void
  isDark: boolean; setFocusMode: (f: boolean) => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <div className="relative">
        <button onClick={() => setShowMenu(!showMenu)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border rounded-lg hover:bg-gray-50 text-gray-700">
          <BookMarked className="w-3.5 h-3.5" /> Reading Mode <ChevronDown className="w-3 h-3" />
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-xl border z-50 py-2">
              <p className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 tracking-widest">READING OPTIONS</p>
              {READING_MODES.map((mode) => (
                <button key={mode.id} onClick={() => { setReadingMode(mode.id); setShowMenu(false) }}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors ${readingMode === mode.id ? 'bg-[#c9a227]/10' : ''}`}>
                  <span className="text-lg">{mode.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${readingMode === mode.id ? 'text-[#c9a227]' : 'text-[#0a1628]'}`}>{mode.label}</p>
                    <p className="text-[10px] text-gray-400">{mode.desc}</p>
                  </div>
                  {readingMode === mode.id && <CheckCircle className="w-4 h-4 text-[#c9a227] shrink-0" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="flex items-center bg-white border rounded-lg overflow-hidden">
        <button onClick={() => setFontSize('small')} className={`px-2 py-1.5 text-[10px] font-semibold ${fontSize === 'small' ? 'bg-[#0a1628] text-[#c9a227]' : 'text-gray-500 hover:bg-gray-50'}`}>A</button>
        <button onClick={() => setFontSize('medium')} className={`px-2 py-1.5 text-xs font-semibold ${fontSize === 'medium' ? 'bg-[#0a1628] text-[#c9a227]' : 'text-gray-500 hover:bg-gray-50'}`}>A</button>
        <button onClick={() => setFontSize('large')} className={`px-2 py-1.5 text-sm font-semibold ${fontSize === 'large' ? 'bg-[#0a1628] text-[#c9a227]' : 'text-gray-500 hover:bg-gray-50'}`}>A</button>
      </div>
      <button onClick={() => setReadingMode(isDark ? 'standard' : 'dark')} className={`p-1.5 rounded-lg border ${isDark ? 'bg-[#0a1628] text-[#c9a227] border-[#c9a227]/30' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
      <button onClick={() => setFocusMode(true)} className="p-1.5 rounded-lg border bg-white text-gray-500 hover:bg-gray-50" title="Focus Mode">
        <Maximize2 className="w-4 h-4" />
      </button>
    </div>
  )
}

// Render text content with reading mode styles
export function ReadingContent({ text, readingMode, fontSizeClass, lineHeightClass, isDark }: {
  text: string; readingMode: ReadingMode; fontSizeClass: string; lineHeightClass: string; isDark: boolean
}) {
  const paragraphs = text.split('\n\n').filter(Boolean)

  if (readingMode === 'scripture') {
    return <>{paragraphs.map((p, i) => {
      const isQuote = p.startsWith('"') || p.startsWith('\u201c') || p.startsWith('>') || /[""\u201c].*(?:—|–|-)\s*\w+\s+\d+:\d+/m.test(p)
      const hasScriptureRef = /\b(?:Genesis|Exodus|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Hebrews|James|Peter|Jude|Revelation|Psalms?|Proverbs|Isaiah|Jeremiah|Ezekiel|Daniel)\s+\d+/i.test(p)
      if (isQuote || hasScriptureRef) {
        return (
          <div key={i} className="my-8 bg-gradient-to-br from-[#0a1628]/5 to-[#c9a227]/10 border border-[#c9a227]/20 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#c9a227] to-[#0a1628]" />
            <div className="absolute top-3 right-4 text-[#c9a227]/20 text-5xl font-serif">&ldquo;</div>
            <p className={`${fontSizeClass} ${lineHeightClass} italic text-[#0a1628] font-serif relative z-10`}>{p.replace(/^>?\s*/, '')}</p>
          </div>
        )
      }
      return <p key={i} className={`mb-5 ${fontSizeClass} ${lineHeightClass} text-[#1a1a1a]`} style={{ wordSpacing: '0.05em' }}>{p}</p>
    })}</>
  }

  if (readingMode === 'book') {
    return (
      <div className="relative">
        {paragraphs.map((p, i) => {
          const isQuote = p.startsWith('"') || p.startsWith('\u201c') || p.startsWith('>')
          if (isQuote) {
            return (
              <blockquote key={i} className="my-8 mx-4 sm:mx-8 pl-6 border-l-[3px] border-[#8B7355] text-[#4a3f2f] italic py-2">
                <p className={`${fontSizeClass} ${lineHeightClass} font-serif`}>{p.replace(/^>?\s*/, '')}</p>
              </blockquote>
            )
          }
          return <p key={i} className={`mb-6 ${fontSizeClass} ${lineHeightClass} text-[#2c2c2c] font-serif`} style={{ textIndent: i > 0 ? '2em' : '0', wordSpacing: '0.04em' }}>{p}</p>
        })}
      </div>
    )
  }

  // Standard / Focus / Large Font / Dark
  return <>{paragraphs.map((p, i) => {
    const isQuote = p.startsWith('"') || p.startsWith('\u201c') || p.startsWith('>')
    if (isQuote) {
      return (
        <blockquote key={i} className={`my-6 pl-5 border-l-4 ${isDark ? 'border-[#c9a227]/60 text-gray-300 bg-[#c9a227]/5' : 'border-[#c9a227] text-gray-600 bg-[#c9a227]/5'} py-4 pr-5 rounded-r-lg italic`}>
          <p className={`${fontSizeClass} ${lineHeightClass}`}>{p.replace(/^>?\s*/, '')}</p>
        </blockquote>
      )
    }
    return <p key={i} className={`mb-5 ${fontSizeClass} ${lineHeightClass} ${isDark ? 'text-gray-200' : 'text-gray-700'}`} style={{ wordSpacing: '0.05em' }}>{p}</p>
  })}</>
}
