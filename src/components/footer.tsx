import Link from 'next/link'
import Image from 'next/image'
import { Twitter, Youtube, Linkedin } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-[#0a1628] text-white py-12">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Image src="/assets/ogn-logo-small.png" alt="OGN University" width={48} height={48} className="w-12 h-12 object-contain" />
              <div>
                <p className="font-bold text-white">OGN University</p>
                <p className="text-[10px] tracking-[2px] text-[#c9a227] font-semibold">EDUCATE • EQUIP • EVOLVE</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Overcomers Global Network University — equipping believers with transformative biblical education for kingdom impact.
            </p>
          </div>

          <div>
            <h3 className="font-bold mb-4 text-[#c9a227]">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/" className="text-gray-300 hover:text-[#c9a227] text-sm">Home</Link></li>
              <li><Link href="/courses" className="text-gray-300 hover:text-[#c9a227] text-sm">Courses</Link></li>
              <li><Link href="/community" className="text-gray-300 hover:text-[#c9a227] text-sm">Community</Link></li>
              <li><Link href="/about" className="text-gray-300 hover:text-[#c9a227] text-sm">About Us</Link></li>
              <li><Link href="/contact" className="text-gray-300 hover:text-[#c9a227] text-sm">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4 text-[#c9a227]">Connect with Us</h3>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-[#c9a227] transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#c9a227] transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#c9a227] transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
            <p className="text-sm text-gray-400 mt-4">Painesville, Ohio, USA</p>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-8 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Overcomers Global Network University. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
