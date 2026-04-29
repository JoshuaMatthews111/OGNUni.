import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BookOpen, Users, Award, Heart, Globe, Shield } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-[#0a1628] text-white py-20">
        <div className="container mx-auto px-6 text-center">
          <Image src="/assets/ogn-university-logo-transparent.png" alt="OGN University" width={140} height={112} className="mx-auto mb-6 object-contain" />
          <p className="text-xs tracking-[4px] text-[#c9a227] font-bold mb-4">ABOUT OGN UNIVERSITY</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Overcomers Global Network University</h1>
          <p className="text-xl text-[#c9a227] font-bold tracking-[3px] mb-6">EDUCATE • EQUIP • EVOLVE</p>
          <p className="text-gray-300 max-w-2xl mx-auto text-lg">
            A Christ-centered institution dedicated to transforming believers through rigorous theological education, spiritual formation, and prophetic training.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs tracking-[3px] text-[#c9a227] font-bold mb-3">OUR MISSION</p>
              <h2 className="text-3xl font-bold text-[#0a1628] mb-6">Equipping Believers for Kingdom Impact</h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  We are committed to equipping believers with the knowledge, wisdom, and spiritual tools needed to grow in their walk with Christ. Our mission is to provide transformative biblical education that empowers you to fulfill your divine calling and live victoriously in both ministry and everyday life.
                </p>
                <p>
                  Located in Painesville, Ohio — about 40 minutes from Cleveland — Overcomers Global Network University is not just an educational institution but a spiritual hub for believers seeking deeper growth. In addition to our courses, we offer in-person workshops and regular church services through Overcomers Global Network, providing a complete environment for learning, worship, and fellowship.
                </p>
              </div>
            </div>
            <div className="relative">
              <Image
                src="https://ext.same-assets.com/3152590629/850138261.jpeg"
                alt="Student"
                width={600}
                height={400}
                className="rounded-xl shadow-xl"
              />
              <div className="absolute -bottom-4 -left-4 bg-[#c9a227] text-[#0a1628] px-6 py-3 rounded-lg font-bold text-sm shadow-lg">
                Founded by Prophet Joshua Matthews
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-[#f0f2f5]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs tracking-[3px] text-[#c9a227] font-bold mb-3">WHAT WE STAND FOR</p>
            <h2 className="text-3xl font-bold text-[#0a1628]">Our Core Values</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: BookOpen, title: 'Biblical Excellence', desc: 'Every course is grounded in Scripture, offering rigorous theological education that challenges and transforms.' },
              { icon: Shield, title: 'Spiritual Formation', desc: 'We nurture not just the mind but the spirit, cultivating deep intimacy with God through prayer, worship, and community.' },
              { icon: Globe, title: 'Kingdom Impact', desc: 'Our graduates go forth equipped to impact their communities, churches, and nations with the power of the Gospel.' },
              { icon: Users, title: 'Community & Fellowship', desc: 'Learning is stronger together. Our students form bonds that last beyond the classroom into lifelong ministry partnerships.' },
              { icon: Award, title: 'Prophetic Training', desc: 'Unique to OGN, our prophetic training equips believers to hear, discern, and respond to the voice of God with accuracy.' },
              { icon: Heart, title: 'Christ-Centered Living', desc: 'Everything we do points back to Jesus Christ — the author and finisher of our faith, the cornerstone of all learning.' },
            ].map((item, i) => (
              <Card key={i} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-8">
                  <div className="w-14 h-14 rounded-full bg-[#0a1628] flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-7 h-7 text-[#c9a227]" />
                  </div>
                  <h3 className="font-bold text-[#0a1628] mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Commitment */}
      <section className="py-16 bg-[#0a1628] text-white">
        <div className="container mx-auto px-6 max-w-4xl text-center">
          <p className="text-xs tracking-[3px] text-[#c9a227] font-bold mb-3">OUR COMMITMENT</p>
          <h2 className="text-3xl font-bold mb-6">Academic Excellence & Spiritual Maturity</h2>
          <p className="text-gray-300 leading-relaxed text-lg">
            At Overcomers Global Network University, we are committed to fostering academic excellence and spiritual maturity through a Christ-centered curriculum. Our foundation is built on the biblical mandate to move beyond elementary teachings and develop a deep, unwavering faith. We believe that true spiritual growth comes from both knowledge and application, equipping believers to navigate life and ministry with wisdom, authority, and purpose.
          </p>
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { num: '7+', label: 'Course Categories' },
              { num: '100%', label: 'Online Access' },
              { num: '24/7', label: 'Learning Anytime' },
              { num: 'OGN', label: 'Certified' },
            ].map((stat, i) => (
              <div key={i}>
                <p className="text-3xl font-bold text-[#c9a227]">{stat.num}</p>
                <p className="text-sm text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Course Categories */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6 text-center">
          <p className="text-xs tracking-[3px] text-[#c9a227] font-bold mb-3">AREAS OF STUDY</p>
          <h2 className="text-3xl font-bold text-[#0a1628] mb-8">Course Categories</h2>
          <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto mb-10">
            {['Foundational Teachings', 'Christology', 'Soteriology', 'Pneumatology', 'Prophetic Training', 'Ministry Leadership', 'Spiritual Formation'].map((cat) => (
              <span key={cat} className="px-5 py-2.5 rounded-full border-2 border-[#0a1628] text-[#0a1628] font-semibold text-sm hover:bg-[#0a1628] hover:text-[#c9a227] transition-all cursor-default">
                {cat}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-[#0a1628] to-[#1a3a5c] text-white text-center">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold mb-4">Ready to Begin Your Journey?</h2>
          <p className="text-gray-300 mb-8 max-w-xl mx-auto">
            Explore our latest courses and take the first step toward deeper spiritual understanding and kingdom impact.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/courses">
              <Button className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold px-8 h-12">
                Browse Courses
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" className="border-[#c9a227] text-[#c9a227] hover:bg-[#c9a227] hover:text-[#0a1628] px-8 h-12">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
