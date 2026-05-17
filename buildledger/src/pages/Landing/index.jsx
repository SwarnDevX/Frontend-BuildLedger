import { useState, useEffect } from 'react'
import Navbar       from '../../components/landing/Navbar'
import Hero         from '../../components/landing/Hero'
import Belt         from '../../components/landing/Belt'
import WhoWeServe   from '../../components/landing/WhoWeServe'
import Capabilities from '../../components/landing/Capabilities'
import CTA          from '../../components/landing/CTA'
import Footer       from '../../components/landing/Footer'
import './landing.css'

export default function Landing() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div style={{ background: '#fff', color: '#0f172a', overflowX: 'hidden' }}>
      <Navbar scrolled={scrolled} />
      <Hero />
      <Belt />
      <WhoWeServe />
      <Capabilities />
      <CTA />
      <Footer />
    </div>
  )
}
