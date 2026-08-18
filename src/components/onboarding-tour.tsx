'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, ChevronRight, ChevronLeft, Camera, MessageSquare, MapPin, BookOpen, Upload, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface TourStep {
  title: string
  description: string
  icon: any
  action?: 'upload_photo' | 'fill_address' | null
  position?: 'center' | 'top-right' | 'bottom-left'
}

const STUDENT_STEPS: TourStep[] = [
  {
    title: 'Welcome to OGN University! 🎉',
    description: 'We\'re excited to have you here. Let\'s take a quick tour to help you get started with your learning journey.',
    icon: BookOpen,
    position: 'center',
  },
  {
    title: 'Upload Your Profile Photo',
    description: 'Add a photo so your instructors and classmates can recognize you. You can upload from your phone or computer.',
    icon: Camera,
    action: 'upload_photo',
    position: 'center',
  },
  {
    title: 'Your Address (Optional)',
    description: 'Help us serve you better by providing your location. This is completely optional.',
    icon: MapPin,
    action: 'fill_address',
    position: 'center',
  },
  {
    title: 'Browse Courses',
    description: 'Visit the Courses page to find and enroll in available courses. Your enrolled courses will appear on this dashboard.',
    icon: BookOpen,
    position: 'center',
  },
  {
    title: 'Message Your Instructor',
    description: 'Need help? Use the Messages tab in the sidebar to reach out directly to your course instructor.',
    icon: MessageSquare,
    position: 'center',
  },
]

const ADMIN_STEPS: TourStep[] = [
  {
    title: 'Welcome, Admin! 🏆',
    description: 'This is your command center. Let\'s walk through the key areas so you can manage courses and students effectively.',
    icon: ShieldCheck,
    position: 'center',
  },
  {
    title: 'Upload Your Photo',
    description: 'Add your profile photo — it appears on courses you teach and in messages to students.',
    icon: Camera,
    action: 'upload_photo',
    position: 'center',
  },
  {
    title: 'Course Management',
    description: 'Go to Courses in the sidebar to create new courses, add sections, upload videos and audio lessons, and manage content.',
    icon: BookOpen,
    position: 'center',
  },
  {
    title: 'Bulk Upload',
    description: 'Inside any course editor, use the Bulk Upload button to upload multiple video or audio files at once (up to 50MB each).',
    icon: Upload,
    position: 'center',
  },
  {
    title: 'Student Management',
    description: 'Use the Students and Enrollments sections to track progress, manage enrollments, and view student activity.',
    icon: BookOpen,
    position: 'center',
  },
  {
    title: 'Messages',
    description: 'Students can message you directly. Check the Messages section regularly to respond to questions and provide guidance.',
    icon: MessageSquare,
    position: 'center',
  },
]

interface OnboardingTourProps {
  userId: string
  role: 'student' | 'admin'
  onComplete: () => void
}

export function OnboardingTour({ userId, role, onComplete }: OnboardingTourProps) {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(true)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [address, setAddress] = useState('')
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  const steps = role === 'admin' ? ADMIN_STEPS : STUDENT_STEPS
  const current = steps[step]
  const Icon = current.icon
  const isLast = step === steps.length - 1
  const isFirst = step === 0

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const uploadPhoto = async () => {
    if (!photoFile) return
    setUploading(true)
    const ext = photoFile.name.split('.').pop()?.toLowerCase()
    const fileName = `avatar-${userId}-${Date.now()}.${ext}`
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    try {
      const signedRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, bucket: 'course-thumbnails' }),
      })
      const signedData = await signedRes.json()
      if (!signedRes.ok) { toast.error(signedData.error || 'Upload failed'); setUploading(false); return }
      const uploadRes = await fetch(signedData.signedUrl, { method: 'PUT', headers: { 'Content-Type': photoFile.type }, body: photoFile })
      if (!uploadRes.ok) { toast.error('Upload failed'); setUploading(false); return }
      await supabase.from('profiles').update({ avatar_url: signedData.publicUrl }).eq('id', userId)
      toast.success('Photo uploaded!')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    }
    setUploading(false)
  }

  const saveAddress = async () => {
    if (!address.trim()) return
    await supabase.from('profiles').update({ address }).eq('id', userId)
    toast.success('Address saved!')
  }

  const next = async () => {
    // Handle actions on current step before moving forward
    if (current.action === 'upload_photo' && photoFile) {
      await uploadPhoto()
    }
    if (current.action === 'fill_address' && address.trim()) {
      await saveAddress()
    }

    if (isLast) {
      finish()
    } else {
      setStep(step + 1)
    }
  }

  const skip = () => {
    if (isLast) {
      finish()
    } else {
      setStep(step + 1)
    }
  }

  const finish = async () => {
    // Mark onboarding complete (DB + localStorage fallback)
    try { await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', userId) } catch {}
    localStorage.setItem(`ogn-onboarding-${userId}`, 'done')
    setVisible(false)
    onComplete()
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div className="h-full bg-[#c9a227] transition-all duration-300" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>

        {/* Close */}
        <button onClick={finish} className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 z-10">
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0a1628] to-[#1a3a5c] flex items-center justify-center mb-4">
            <Icon className="w-7 h-7 text-[#c9a227]" />
          </div>

          {/* Step counter */}
          <p className="text-[10px] font-semibold text-[#c9a227] tracking-widest mb-1">STEP {step + 1} OF {steps.length}</p>

          {/* Title & Description */}
          <h3 className="text-xl font-bold text-[#0a1628] mb-2">{current.title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">{current.description}</p>

          {/* Action: Upload Photo */}
          {current.action === 'upload_photo' && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <div className="flex items-center gap-4">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-[#c9a227]" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#0a1628]/10 flex items-center justify-center">
                    <Camera className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#0a1628] text-white rounded-lg cursor-pointer hover:bg-[#1a3a5c] text-sm font-medium">
                    <Camera className="w-4 h-4" /> Choose Photo
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                  </label>
                  <p className="text-[10px] text-gray-400 mt-1.5">JPG, PNG up to 10MB</p>
                </div>
              </div>
            </div>
          )}

          {/* Action: Fill Address */}
          {current.action === 'fill_address' && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="City, State/Province, Country"
                className="w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a227]/50 focus:border-[#c9a227]"
              />
              <p className="text-[10px] text-gray-400 mt-1.5">You can skip this and add it later in your profile settings</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <div>
              {!isFirst && (
                <button onClick={() => setStep(step - 1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#0a1628]">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {current.action && (
                <button onClick={skip} className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2">
                  Skip
                </button>
              )}
              <Button
                onClick={next}
                disabled={uploading}
                className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold px-6"
              >
                {uploading ? 'Uploading...' : isLast ? 'Get Started!' : 'Next'}
                {!isLast && !uploading && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-1.5 pb-4">
          {steps.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-[#c9a227] w-6' : i < step ? 'bg-[#0a1628]' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>
    </div>
  )
}
