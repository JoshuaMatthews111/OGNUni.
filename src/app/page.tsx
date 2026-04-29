import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BookOpen, Award, Users, Globe, GraduationCap, Sparkles } from 'lucide-react'

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-[#0a1628] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://ext.same-assets.com/3152590629/2434394669.jpeg')] bg-cover bg-center opacity-10" />
        <div className="container mx-auto px-6 py-20 md:py-28 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <Image src="/assets/ogn-university-logo-transparent.png" alt="OGN University" width={140} height={112} className="mx-auto mb-6 object-contain" />
            <p className="text-sm tracking-[4px] text-[#c9a227] font-bold mb-4">OGN UNIVERSITY</p>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Overcomers Global Network University
            </h1>
            <p className="text-xl text-[#c9a227] font-bold tracking-[3px] mb-6">EDUCATE • EQUIP • EVOLVE</p>
            <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
              Welcome to OGN University! We are dedicated to providing transformative course content designed to help you grow in spiritual knowledge and strengthen your personal walk with Christ.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/courses">
                <Button className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-bold px-8 h-12 text-base">
                  Browse Courses
                </Button>
              </Link>
              <Link href="/about">
                <Button variant="outline" className="border-[#c9a227] text-[#c9a227] hover:bg-[#c9a227] hover:text-[#0a1628] px-8 h-12 text-base">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0a1628] via-[#c9a227] to-[#0a1628]" />
      </section>

      {/* Scripture Banner */}
      <section className="bg-white py-8 border-b">
        <div className="container mx-auto px-6 text-center">
          <p className="text-lg italic text-gray-600">
            &ldquo;Wisdom is the principal thing; therefore get wisdom: and with all thy getting get understanding.&rdquo;
          </p>
          <p className="text-sm font-bold text-[#c9a227] mt-2">— Proverbs 4:7</p>
        </div>
      </section>

      {/* Learn & Grow Section */}
      <section className="bg-[#f0f2f5] py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs tracking-[3px] text-[#c9a227] font-bold mb-3">WHY OGN UNIVERSITY</p>
            <h2 className="text-3xl font-bold text-[#0a1628]">Learn & Grow in Your Calling</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: BookOpen, title: 'Learn From Anointed Ministers', desc: 'Our courses, led by highly qualified, ordained ministers, ensure you receive the best education in spiritual wisdom and practical knowledge.' },
              { icon: Globe, title: 'Online & In-Person Training', desc: 'Experience dynamic, transformative growth through our online courses and in-person training, infused with spiritual wisdom and practical guidance.' },
              { icon: Award, title: 'Certifications & Ordination', desc: 'Upon completing our courses, receive a certification as a testament to your growth. We also offer an ordination pathway for your divine calling.' },
            ].map((item, i) => (
              <Card key={i} className="hover:shadow-lg transition-shadow border-t-4 border-t-[#c9a227]">
                <CardContent className="p-8">
                  <div className="w-12 h-12 rounded-full bg-[#0a1628] flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-[#c9a227]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#0a1628] mb-3">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Meet Our Team */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs tracking-[3px] text-[#c9a227] font-bold mb-3">LEADERSHIP</p>
            <h2 className="text-3xl font-bold text-[#0a1628]">Meet Our Team</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="overflow-hidden">
              <CardContent className="p-8">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <Image
                    src="https://lwfiles.mycourse.app/679876f2332972770e04e9bb-public/b7ba08e82b88d1259402357a5bdd62ab.png"
                    alt="Prophet Joshua Matthews"
                    width={120}
                    height={120}
                    className="rounded-full border-4 border-[#c9a227] shrink-0"
                  />
                  <div>
                    <h3 className="text-xl font-bold text-[#0a1628] mb-1">Prophet Joshua Matthews</h3>
                    <p className="text-sm text-[#c9a227] font-semibold mb-3">Founder of OGN / President, OGN University USA</p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Prophet Joshua Matthews, founder of Overcomers Global Network, is dedicated to empowering individuals through the mission to educate, equip, and evolve believers in their spiritual journeys. A global leader and published author, he has gained international recognition for his transformative ministry.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-8">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <Image
                    src="https://lwfiles.mycourse.app/679876f2332972770e04e9bb-public/4039795f60b20c69e31882e68f5bb916.jpg"
                    alt="Dr. Stephan Jonathan Din"
                    width={120}
                    height={120}
                    className="rounded-full border-4 border-[#c9a227] shrink-0"
                  />
                  <div>
                    <h3 className="text-xl font-bold text-[#0a1628] mb-1">Dr. Stephan Jonathan Din</h3>
                    <p className="text-sm text-[#c9a227] font-semibold mb-3">Founder of LCM / Chancellor, OGN University Africa</p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Stephan Jonathan Din, also known as Emeritus, is a renowned relationship expert, motivational speaker, and wealth creation agent. He has authored over thirty books and is an honoris causa Doctor of Humanities and Christian Education.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Global Learning */}
      <section className="bg-[#0a1628] text-white py-16">
        <div className="container mx-auto px-6 text-center">
          <p className="text-xs tracking-[3px] text-[#c9a227] font-bold mb-3">PARTICIPATE IN</p>
          <h2 className="text-3xl font-bold mb-6">A Global Learning Experience</h2>
          <p className="max-w-3xl mx-auto text-gray-300 text-lg mb-10">
            OGN University serves students worldwide, offering courses taught by experienced instructors fluent in both French and English to ensure accessible and impactful learning for everyone.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { num: '100%', label: 'Success Rate' },
              { num: '12+', label: 'Years Experience' },
              { num: '135K+', label: 'Students Worldwide' },
              { num: '7', label: 'Course Categories' },
            ].map((stat, i) => (
              <div key={i}>
                <p className="text-4xl font-bold text-[#c9a227]">{stat.num}</p>
                <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Discover Your Calling */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs tracking-[3px] text-[#c9a227] font-bold mb-3">LEARN TO</p>
              <h2 className="text-3xl font-bold text-[#0a1628] mb-6">Discover Your Calling</h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                Our program isn&apos;t just for ministers — it&apos;s for every child of God with a desire to grow deeper in faith and purpose. With biblical foundational teachings and impactful lessons, you&apos;ll gain the wisdom and tools needed to confidently walk in and fulfill your God-given destiny.
              </p>
              <Link href="/courses">
                <Button className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold px-8">
                  Start Learning Today
                </Button>
              </Link>
            </div>
            <div>
              <Image
                src="https://ext.same-assets.com/3152590629/2434394669.jpeg"
                alt="Campus"
                width={600}
                height={400}
                className="rounded-xl shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-[#0a1628] to-[#1a3a5c] text-white py-16 text-center">
        <div className="container mx-auto px-6">
          <Sparkles className="w-10 h-10 text-[#c9a227] mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Become a Member. Join Our Community.</h2>
          <p className="text-gray-300 text-lg mb-8 max-w-xl mx-auto">
            You are taking a step toward your Divine Purpose. See you in class!
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/courses">
              <Button className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-bold px-8 h-12">
                View Courses
              </Button>
            </Link>
            <Link href="/community">
              <Button variant="outline" className="border-[#c9a227] text-[#c9a227] hover:bg-[#c9a227] hover:text-[#0a1628] px-8 h-12">
                Join Community
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
