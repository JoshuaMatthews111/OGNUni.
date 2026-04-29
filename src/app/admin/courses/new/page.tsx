'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { COURSE_CATEGORIES, VISIBILITY_OPTIONS } from '@/lib/constants'
import { ArrowLeft, Save, Eye, Upload, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'
import CoverGenerator from '@/components/cover-generator'

export default function NewCoursePage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    slug: '',
    description: '',
    long_description: '',
    category: '',
    is_free: true,
    price: 0,
    visibility: 'public',
    status: 'draft',
    thumbnail_url: '',
  })

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => setThumbnailPreview(reader.result as string)
    reader.readAsDataURL(file)

    const fileExt = file.name.split('.').pop()
    const fileName = `course-thumb-${Date.now()}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('course-thumbnails')
      .upload(fileName, file)

    if (error) {
      toast.error('Failed to upload image')
      return
    }

    const { data: urlData } = supabase.storage
      .from('course-thumbnails')
      .getPublicUrl(fileName)

    setForm({ ...form, thumbnail_url: urlData.publicUrl })
    toast.success('Image uploaded!')
  }

  const handleSubmit = async (e: React.FormEvent, publish = false) => {
    e.preventDefault()
    if (!form.title) {
      toast.error('Title is required')
      return
    }

    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Not authenticated')
      setSaving(false)
      return
    }

    const courseData = {
      title: form.title,
      subtitle: form.subtitle,
      slug: form.slug || generateSlug(form.title),
      description: form.description,
      long_description: form.long_description,
      category: form.category,
      is_free: form.is_free,
      price: form.is_free ? 0 : form.price,
      visibility: form.visibility,
      status: publish ? 'published' : form.status,
      is_published: publish,
      thumbnail_url: form.thumbnail_url,
      instructor_id: user.id,
    }

    const { data, error } = await supabase
      .from('courses')
      .insert(courseData)
      .select()
      .single()

    setSaving(false)

    if (error) {
      toast.error('Failed to create course: ' + error.message)
      return
    }

    toast.success(publish ? 'Course published!' : 'Course saved as draft!')
    router.push(`/admin/courses/${data.id}/edit`)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/courses">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#0a1628]">Create New Course</h1>
            <p className="text-sm text-gray-500">Build a teaching for OGN University</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={(e) => handleSubmit(e, false)} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold" onClick={(e) => handleSubmit(e, true)} disabled={saving}>
            <Eye className="w-4 h-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-[#0a1628]">Course Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Course Title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value, slug: generateSlug(e.target.value) })}
                  placeholder="e.g., Foundational Teachings"
                  required
                />
              </div>
              <div>
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  placeholder="Building Strong Spiritual Foundations"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="auto-generated"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full h-10 px-3 border rounded-md text-sm"
                >
                  <option value="">Select category...</option>
                  {COURSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Short Description *</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief overview of the course"
                required
              />
            </div>

            <div>
              <Label htmlFor="long_description">Full Description</Label>
              <textarea
                id="long_description"
                value={form.long_description}
                onChange={(e) => setForm({ ...form, long_description: e.target.value })}
                className="w-full min-h-[150px] px-3 py-2 border rounded-md text-sm"
                placeholder="Detailed course description with learning outcomes..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Cover Image */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-[#0a1628]">Featured Graphic</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-6">
              <div className="w-48 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                {thumbnailPreview || form.thumbnail_url ? (
                  <img
                    src={thumbnailPreview || form.thumbnail_url}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#0a1628] text-white rounded-lg cursor-pointer hover:bg-[#1a3a5c] transition-colors text-sm">
                    <Upload className="w-4 h-4" />
                    Upload Image
                    <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" />
                  </label>
                  <CoverGenerator
                    courseTitle={form.title}
                    courseCategory={form.category}
                    courseDescription={form.description}
                    currentThumbnail={form.thumbnail_url}
                    onSelectCover={(url) => { setForm({ ...form, thumbnail_url: url }); setThumbnailPreview(url) }}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Recommended: 1280x720px. Shows on dashboard, catalog, and course pages.
                </p>
                {form.thumbnail_url && (
                  <Input
                    value={form.thumbnail_url}
                    onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                    placeholder="Or paste image URL..."
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Visibility */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-[#0a1628]">Pricing & Visibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Pricing</Label>
                <div className="flex items-center gap-3 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={form.is_free}
                      onChange={() => setForm({ ...form, is_free: true, price: 0 })}
                      className="w-4 h-4 text-[#c9a227]"
                    />
                    <span className="text-sm">Free</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!form.is_free}
                      onChange={() => setForm({ ...form, is_free: false })}
                      className="w-4 h-4 text-[#c9a227]"
                    />
                    <span className="text-sm">Paid</span>
                  </label>
                </div>
              </div>

              {!form.is_free && (
                <div>
                  <Label htmlFor="price">Price (USD)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                      className="pl-7"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="visibility">Visibility</Label>
                <select
                  id="visibility"
                  value={form.visibility}
                  onChange={(e) => setForm({ ...form, visibility: e.target.value })}
                  className="w-full h-10 px-3 border rounded-md text-sm"
                >
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <Link href="/admin/courses">
            <Button variant="ghost">Cancel</Button>
          </Link>
          <div className="flex gap-2">
            <Button type="submit" variant="outline" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save as Draft'}
            </Button>
            <Button
              type="button"
              className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold"
              onClick={(e) => handleSubmit(e, true)}
              disabled={saving}
            >
              <Eye className="w-4 h-4 mr-2" />
              Publish Course
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
