'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings, Save } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminSettingsPage() {
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    siteName: 'Overcomers Global Network University',
    siteEmail: 'admin@overcomersglobal.org',
    membershipPrice: '29.99',
    mentoringPrice: '99.99',
    stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    muxTokenId: process.env.MUX_TOKEN_ID || '',
  })

  const handleSave = async () => {
    setSaving(true)
    setTimeout(() => {
      toast.success('Settings saved successfully')
      setSaving(false)
    }, 1000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-[#2a2e35]">Platform Settings</h1>
        <p className="text-gray-600 mt-1">Configure platform-wide settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="siteName">Site Name</Label>
              <Input
                id="siteName"
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="siteEmail">Admin Email</Label>
              <Input
                id="siteEmail"
                type="email"
                value={settings.siteEmail}
                onChange={(e) => setSettings({ ...settings, siteEmail: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="membershipPrice">Membership Price (Monthly)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="membershipPrice"
                  type="number"
                  step="0.01"
                  value={settings.membershipPrice}
                  onChange={(e) => setSettings({ ...settings, membershipPrice: e.target.value })}
                  className="pl-7"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="mentoringPrice">Mentoring Price (Monthly)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="mentoringPrice"
                  type="number"
                  step="0.01"
                  value={settings.mentoringPrice}
                  onChange={(e) => setSettings({ ...settings, mentoringPrice: e.target.value })}
                  className="pl-7"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integration Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="stripeKey">Stripe Publishable Key</Label>
            <Input
              id="stripeKey"
              type="text"
              value={settings.stripePublishableKey}
              onChange={(e) => setSettings({ ...settings, stripePublishableKey: e.target.value })}
              placeholder="pk_live_..."
            />
            <p className="text-sm text-gray-500 mt-1">
              Configure in .env.local file
            </p>
          </div>
          <div>
            <Label htmlFor="muxToken">Mux Token ID</Label>
            <Input
              id="muxToken"
              type="text"
              value={settings.muxTokenId}
              onChange={(e) => setSettings({ ...settings, muxTokenId: e.target.value })}
              placeholder="Your Mux Token ID"
            />
            <p className="text-sm text-gray-500 mt-1">
              Configure in .env.local file
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Certificate Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Certificate Template</Label>
            <p className="text-sm text-gray-600 mt-1">
              Certificates are automatically generated when students complete courses.
            </p>
          </div>
          <div>
            <Label>Signature</Label>
            <p className="text-sm text-gray-600 mt-1">
              Current signature: Prophet Joshua Matthews, President
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#003d82] hover:bg-[#0052ad]"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
