import { useState } from 'react'

export default function Navbar({ scrolled }) {
  const [active,    setActive]    = useState(null)
  const [loginHov,  setLoginHov]  = useState(false)
  const [ctaHov,    setCtaHov]    = useState(false)

  return (
    <div style={{
      position:'fixed', top:0, left:0, right:0, zIndex:1000,
      display:'flex', justifyContent:'center',
      padding: scrolled ? '8px 28px' : '20px 28px',
      pointerEvents:'none',
      transition:'padding .5s cubic-bezier(.16,1,.3,1)',
    }}>

      {/* ── Glassmorphism pill ── */}
      <nav style={{
        pointerEvents:'auto',
        width:'100%', maxWidth:1200,
        height:62,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 8px 0 12px',
        borderRadius:999,
        /* Glass surface */
        background: scrolled
          ? 'rgba(255,255,255,0.78)'
          : 'rgba(8,24,44,0.52)',
        backdropFilter:'blur(48px) saturate(180%)',
        WebkitBackdropFilter:'blur(48px) saturate(180%)',
        /* Border — top highlight + colour tint */
        border: scrolled
          ? '1px solid rgba(14,165,233,0.22)'
          : '1px solid rgba(255,255,255,0.13)',
        boxShadow: scrolled
          ? [
              '0 8px 40px rgba(14,165,233,0.10)',
              '0 2px 8px rgba(0,0,0,0.06)',
              'inset 0 1px 0 rgba(255,255,255,0.90)',
              'inset 0 -1px 0 rgba(14,165,233,0.08)',
            ].join(',')
          : [
              '0 8px 48px rgba(0,0,0,0.45)',
              '0 2px 8px rgba(0,0,0,0.25)',
              'inset 0 1px 0 rgba(255,255,255,0.12)',
              'inset 0 -1px 0 rgba(0,0,0,0.20)',
            ].join(','),
        transition:'all .45s cubic-bezier(.16,1,.3,1)',
      }}>

        {/* ── Logo ── */}
        <a href="#top" style={{
          display:'flex', alignItems:'center', gap:10,
          textDecoration:'none', flexShrink:0, padding:'0 12px',
        }}>
          <div style={{
            width:36, height:36, borderRadius:11,
            background:'linear-gradient(135deg,#38bdf8 0%,#0ea5e9 50%,#0284c7 100%)',
            display:'flex', alignItems:'center', justifyContent:'center',
            flexShrink:0,
            boxShadow:'0 4px 16px rgba(14,165,233,.55), inset 0 1px 0 rgba(255,255,255,.3)',
          }}>
            <svg width="18" height="18" viewBox="0 0 17 17" fill="none">
              <path d="M2 13L5.5 5.5L8.5 9.5L11.5 4L15 13"
                stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{
            fontFamily:'Inter,sans-serif', fontSize:17.5, fontWeight:800,
            letterSpacing:'-.04em',
            color: scrolled ? '#0c4a6e' : '#fff',
            transition:'color .3s',
          }}>Build<span style={{color:'#0ea5e9'}}>Ledger</span></span>
        </a>

        {/* ── Nav links ── */}
        <div className="hide-mobile" style={{display:'flex', gap:2}}>
          {[
            { label:'Platform',     href:'#platform'    },
            { label:'Who We Serve', href:'#who-we-serve'},
            { label:'Solutions',    href:'#platform'    },
          ].map(({ label, href }) => (
            <a key={label} href={href}
              onMouseEnter={() => setActive(label)}
              onMouseLeave={() => setActive(null)}
              style={{
                fontSize:13.5, fontWeight:500, letterSpacing:'.01em',
                textDecoration:'none',
                padding:'8px 16px', borderRadius:9,
                color: scrolled
                  ? (active === label ? '#0c4a6e' : '#475569')
                  : (active === label ? '#fff'    : 'rgba(255,255,255,.72)'),
                background: active === label
                  ? (scrolled ? 'rgba(14,165,233,.09)' : 'rgba(255,255,255,.11)')
                  : 'transparent',
                transition:'all .18s cubic-bezier(.16,1,.3,1)',
              }}
            >{label}</a>
          ))}
        </div>

        {/* ── Actions ── */}
        <div style={{display:'flex', gap:6, alignItems:'center', flexShrink:0, padding:'0 6px'}}>

          {/* Login — ghost */}
          <button
            onClick={() => window.location.href = '/login'}
            onMouseEnter={() => setLoginHov(true)}
            onMouseLeave={() => setLoginHov(false)}
            style={{
              padding:'9px 20px',
              background: loginHov
                ? (scrolled ? 'rgba(14,165,233,.10)' : 'rgba(255,255,255,.10)')
                : 'transparent',
              border: scrolled
                ? '1px solid rgba(14,165,233,.25)'
                : '1px solid rgba(255,255,255,.18)',
              color: scrolled ? '#0284c7' : 'rgba(255,255,255,.88)',
              borderRadius:9,
              cursor:'pointer',
              fontSize:13.5,
              fontWeight:600,
              fontFamily:'Inter,sans-serif',
              backdropFilter: loginHov ? 'blur(8px)' : 'none',
              transition:'all .2s cubic-bezier(.16,1,.3,1)',
              transform: loginHov ? 'translateY(-1px)' : 'none',
            }}
          >Login</button>

          {/* Get Started — solid CTA */}
          <button
            onClick={() => window.location.href = '/login'}
            onMouseEnter={() => setCtaHov(true)}
            onMouseLeave={() => setCtaHov(false)}
            style={{
              padding:'10px 24px',
              background: ctaHov
                ? 'linear-gradient(135deg,#38bdf8 0%,#0ea5e9 60%,#0284c7 100%)'
                : 'linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%)',
              border:'1px solid rgba(56,189,248,.3)',
              color:'#fff',
              borderRadius:9,
              cursor:'pointer',
              fontSize:13.5,
              fontWeight:700,
              fontFamily:'Inter,sans-serif',
              letterSpacing:'-.01em',
              boxShadow: ctaHov
                ? '0 8px 32px rgba(14,165,233,.60), inset 0 1px 0 rgba(255,255,255,.25)'
                : '0 4px 16px rgba(14,165,233,.40), inset 0 1px 0 rgba(255,255,255,.20)',
              transform: ctaHov ? 'translateY(-1px)' : 'none',
              transition:'all .22s cubic-bezier(.16,1,.3,1)',
            }}
          >Get Started</button>
        </div>
      </nav>
    </div>
  )
}
