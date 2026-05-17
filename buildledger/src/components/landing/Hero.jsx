import { useEffect, useRef, useState } from 'react'
import heroBg from '../../assets/hero-bg.mp4'

/* ── animated counter hook ── */
function useCounter(end, duration = 2000, started = false) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!started) return
    let start = null
    const step = ts => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.floor(ease * end))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [started, end, duration])
  return val
}

/* ── floating particles canvas ── */
function Particles() {
  const ref = useRef(null)
  useEffect(() => {
    const cv = ref.current; if (!cv) return
    const ctx = cv.getContext('2d')
    const W = cv.offsetWidth, H = cv.offsetHeight
    cv.width = W; cv.height = H
    const pts = Array.from({length:55},()=>({
      x: Math.random()*W, y: Math.random()*H,
      r: Math.random()*2+.5,
      vx:(Math.random()-.5)*.25, vy:(Math.random()-.5)*.25,
      a: Math.random()*.5+.15,
    }))
    let raf
    function draw() {
      ctx.clearRect(0,0,W,H)
      pts.forEach(p => {
        p.x+=p.vx; p.y+=p.vy
        if(p.x<0)p.x=W; if(p.x>W)p.x=0
        if(p.y<0)p.y=H; if(p.y>H)p.y=0
        ctx.beginPath()
        ctx.arc(p.x,p.y,p.r,0,Math.PI*2)
        ctx.fillStyle=`rgba(125,211,252,${p.a})`
        ctx.fill()
      })
      // draw lines between close particles
      for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++) {
        const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y
        const dist=Math.sqrt(dx*dx+dy*dy)
        if(dist<120){
          ctx.beginPath()
          ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y)
          ctx.strokeStyle=`rgba(125,211,252,${(1-dist/120)*0.12})`
          ctx.lineWidth=.6; ctx.stroke()
        }
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return ()=>cancelAnimationFrame(raf)
  },[])
  return <canvas ref={ref} style={{position:'absolute',inset:0,width:'100%',height:'100%',zIndex:1,pointerEvents:'none'}}/>
}

export default function Hero() {
  const [started, setStarted] = useState(false)
  const ref = useRef(null)
  useEffect(()=>{
    const t = setTimeout(()=>setStarted(true), 600)
    return ()=>clearTimeout(t)
  },[])
  const c1 = useCounter(2400, 2000, started)
  const c2 = useCounter(96,   1800, started)
  const c3 = useCounter(14,   1600, started)
  const c4 = useCounter(8500, 2200, started)

  return (
    <section id="top" ref={ref} style={{
      position:'relative', width:'100%', minHeight:'100vh',
      display:'flex', flexDirection:'column', justifyContent:'center',
      background:'#04111f', overflow:'hidden',
    }}>

      {/* ── VIDEO BG — full cover ── */}
      <div style={{position:'absolute',inset:0,zIndex:0,overflow:'hidden'}}>
        <video autoPlay muted loop playsInline style={{
          position:'absolute', top:0, left:0,
          width:'100%', height:'100%',
          objectFit:'cover',
          objectPosition:'center 30%',
          opacity:0.45,
          filter:'saturate(1.1) brightness(0.80)',
        }}>
          <source src={heroBg} type="video/mp4"/>
        </video>

        {/* dark base so text is always readable */}
        <div style={{
          position:'absolute', inset:0,
          background:'rgba(4,17,31,0.55)',
        }}/>
        {/* left-panel gradient — text side darker */}
        <div style={{
          position:'absolute', inset:0,
          background:'linear-gradient(105deg, rgba(4,17,31,.88) 0%, rgba(4,17,31,.70) 30%, rgba(4,17,31,.35) 55%, rgba(4,17,31,.05) 80%, transparent 100%)',
        }}/>
        {/* vignette edges */}
        <div style={{
          position:'absolute', inset:0,
          background:'radial-gradient(ellipse 90% 90% at 65% 50%, transparent 35%, rgba(4,17,31,.60) 100%)',
        }}/>
        {/* top bar fade */}
        <div style={{
          position:'absolute', top:0, left:0, right:0, height:160,
          background:'linear-gradient(to bottom, rgba(4,17,31,.65), transparent)',
        }}/>
        {/* sky-blue accent glow right side */}
        <div style={{
          position:'absolute', top:'8%', right:'3%',
          width:'50%', height:'80%',
          background:'radial-gradient(ellipse, rgba(14,165,233,.18) 0%, rgba(56,189,248,.06) 45%, transparent 70%)',
          pointerEvents:'none',
          animation:'pulse 7s ease-in-out infinite',
        }}/>
        {/* bottom-left warm glow for depth */}
        <div style={{
          position:'absolute', bottom:'-5%', left:'-5%',
          width:'40%', height:'50%',
          background:'radial-gradient(ellipse, rgba(14,165,233,.10) 0%, transparent 70%)',
          pointerEvents:'none',
        }}/>
      </div>

      {/* ── animated particles ── */}
      <Particles/>

      {/* ── HERO CONTENT ── */}
      <div className="wrap" style={{
        position:'relative', zIndex:10,
        padding:'130px 60px 80px',
        maxWidth:1200, margin:'0 auto', width:'100%',
      }}>
        <div style={{maxWidth:680}}>

          {/* eyebrow pill */}
          <div className="a0" style={{
            display:'inline-flex', alignItems:'center', gap:8,
            background:'rgba(14,165,233,.12)',
            border:'1px solid rgba(14,165,233,.35)',
            borderRadius:999, padding:'6px 16px', marginBottom:30,
            animation:'a0 .9s both, borderPulse 3s 1.5s ease-in-out infinite',
          }}>
            <span style={{width:7,height:7,borderRadius:'50%',background:'#38bdf8',display:'block',animation:'pulse 2s infinite'}}/>
            <span style={{fontSize:12,fontWeight:700,color:'#7dd3fc',letterSpacing:'.1em'}}>
              CONTRACT & VENDOR MANAGEMENT PLATFORM
            </span>
          </div>

          {/* headline */}
          <h1 className="display-xl a1" style={{
            color:'#fff', marginBottom:26,
            lineHeight:1.05,
            fontSize:'clamp(34px,4vw,60px)',
          }}>
            One platform<br/>
            <span style={{
              backgroundImage:'linear-gradient(90deg,#7dd3fc 0%,#38bdf8 40%,#0ea5e9 80%)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              backgroundClip:'text',
              backgroundSize:'200% auto',
              animation:'shimmer 3s linear infinite',
            }}>Every contract<br/>Every vendor</span>
          </h1>

          {/* subtext */}
          <p className="a2" style={{
            fontSize:'clamp(14px,1.2vw,17px)',
            color:'rgba(255,255,255,.62)',
            lineHeight:1.75, maxWidth:520, marginBottom:42, fontWeight:400,
          }}>
            BuildLedger connects construction owners, contractors, and vendors on a single platform — streamlining contract execution, vendor qualification, delivery tracking, and payment processing from award to final closeout.
          </p>

          {/* CTAs */}
          <div className="a3" style={{display:'flex',gap:14,flexWrap:'wrap',marginBottom:60}}>
            <button 
              onClick={() => window.location.href = '/login'}
              className="btn btn-blue btn-lg" 
              style={{
                background:'linear-gradient(135deg,#0ea5e9,#0284c7)',
                boxShadow:'0 6px 28px rgba(14,165,233,.45)',
                borderRadius:10, padding:'15px 36px', fontSize:15.5,
                position:'relative', overflow:'hidden',
              }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 12px 40px rgba(14,165,233,.55)'}}
              onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 6px 28px rgba(14,165,233,.45)'}}
            >
              Get Started
              <svg width="17" height="17" fill="none" viewBox="0 0 17 17">
                <path d="M3 8.5h11M9.5 4l5 4.5-5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* trust strip */}
          <div className="a4" style={{
            display:'flex', gap:28, flexWrap:'wrap', alignItems:'center',
            paddingTop:28, borderTop:'1px solid rgba(255,255,255,.08)',
          }}>
            <span style={{fontSize:11.5,color:'rgba(255,255,255,.35)',fontWeight:500,letterSpacing:'.06em',textTransform:'uppercase'}}>Trusted by</span>
            {['ISO 27001','SOC 2 Type II','GDPR Ready','99.9% SLA'].map(b=>(
              <div key={b} style={{
                display:'flex',alignItems:'center',gap:6,
                padding:'5px 12px', borderRadius:99,
                background:'rgba(255,255,255,.05)',
                border:'1px solid rgba(255,255,255,.10)',
              }}>
                <svg width="11" height="11" fill="none" viewBox="0 0 11 11">
                  <path d="M1.5 5.5l3 3L9.5 2" stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{fontSize:11.5,fontWeight:600,color:'rgba(255,255,255,.65)'}}>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── STATS BAR at bottom of hero ── */}
      <div className="a5" style={{
        position:'relative', zIndex:10,
        margin:'0 60px 0',
        maxWidth:1080,
        alignSelf:'center',
        width:'calc(100% - 120px)',
        background:'rgba(255,255,255,.05)',
        border:'1px solid rgba(255,255,255,.10)',
        borderRadius:20,
        backdropFilter:'blur(20px)',
        padding:'28px 0',
        display:'grid', gridTemplateColumns:'repeat(4,1fr)',
        marginBottom:'-1px',
      }}>
        {[
          [`${c1}+`,   'Projects Managed'],
          [`${c2}%`,   'On-Time Invoice Processing'],
          [`$${c3}B+`, 'Contract Value Tracked'],
          [`${c4}+`,   'Vendors Onboarded'],
        ].map(([v,l],i)=>(
          <div key={l} style={{
            textAlign:'center',
            borderRight: i<3?'1px solid rgba(255,255,255,.08)':'none',
            padding:'4px 0',
          }}>
            <div style={{
              fontFamily:'Inter,sans-serif', fontSize:'clamp(26px,3vw,40px)',
              fontWeight:800, color:'#fff', letterSpacing:'-1px',
              marginBottom:4,
              backgroundImage:'linear-gradient(135deg,#fff 60%,#7dd3fc)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              backgroundClip:'text',
            }}>{v}</div>
            <div style={{fontSize:12.5,color:'rgba(255,255,255,.45)',fontWeight:500}}>{l}</div>
          </div>
        ))}
      </div>

      {/* bottom fade to white (Belt section) */}
      <div style={{
        position:'absolute', bottom:0, left:0, right:0, height:140,
        background:'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.6) 60%, #fff 100%)',
        zIndex:11,
        pointerEvents:'none',
      }}/>
    </section>
  )
}
