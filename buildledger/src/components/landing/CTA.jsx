import Fade from './Fade'

export default function CTA() {
  return (
    <section style={{
      padding:'120px 0', position:'relative', overflow:'hidden',
      background:'linear-gradient(135deg,#04111f 0%,#06172b 40%,#0a2540 100%)',
    }}>
      {/* animated mesh grid */}
      <div style={{
        position:'absolute',inset:0,
        backgroundImage:'linear-gradient(rgba(14,165,233,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,.07) 1px,transparent 1px)',
        backgroundSize:'52px 52px',
        maskImage:'radial-gradient(ellipse 80% 80% at 50% 50%,black 30%,transparent 100%)',
        WebkitMaskImage:'radial-gradient(ellipse 80% 80% at 50% 50%,black 30%,transparent 100%)',
        pointerEvents:'none',
      }}/>
      {/* central glow */}
      <div style={{
        position:'absolute',top:'50%',left:'50%',
        transform:'translate(-50%,-50%)',
        width:700,height:500,
        background:'radial-gradient(ellipse,rgba(14,165,233,.22) 0%,rgba(56,189,248,.08) 40%,transparent 70%)',
        pointerEvents:'none',
        animation:'float 8s ease-in-out infinite',
      }}/>
      {/* side glow left */}
      <div style={{
        position:'absolute',left:'-10%',top:'20%',
        width:400,height:400,
        background:'radial-gradient(ellipse,rgba(14,165,233,.12),transparent 70%)',
        pointerEvents:'none',
      }}/>

      <div className="wrap" style={{position:'relative',zIndex:2,textAlign:'center'}}>
        <Fade>
          <div style={{
            display:'inline-flex',alignItems:'center',gap:8,
            background:'rgba(14,165,233,.12)',border:'1px solid rgba(14,165,233,.28)',
            borderRadius:999,padding:'6px 16px',marginBottom:32,
          }}>
            <span style={{width:7,height:7,borderRadius:'50%',background:'#38bdf8',display:'block',animation:'pulse 2s infinite'}}/>
            <span style={{fontSize:12,fontWeight:700,color:'#7dd3fc',letterSpacing:'.1em'}}>GET STARTED TODAY</span>
          </div>

          <h2 style={{
            fontFamily:'Inter,sans-serif',
            fontSize:'clamp(38px,5.5vw,68px)',
            fontWeight:800,letterSpacing:'-1.5px',
            lineHeight:1.06,color:'#fff',marginBottom:22,
          }}>
            Stop managing contracts<br/>
            <span style={{
              backgroundImage:'linear-gradient(90deg,#7dd3fc,#38bdf8,#0ea5e9)',
              WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
              backgroundClip:'text',
              backgroundSize:'200% auto',
              animation:'shimmer 3s linear infinite',
            }}>in spreadsheets.</span>
          </h2>

          <p style={{
            fontSize:18,color:'rgba(255,255,255,.55)',lineHeight:1.75,
            maxWidth:560,margin:'0 auto 48px',fontWeight:400,
          }}>
            Join thousands of construction companies, contractors, and vendors who use BuildLedger to manage every contract, qualification, delivery, and payment — in one connected platform.
          </p>

          <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap',marginBottom:24}}>
            <button style={{
              display:'inline-flex',alignItems:'center',gap:8,
              background:'linear-gradient(135deg,#0ea5e9,#0284c7)',
              color:'#fff',border:'none',
              padding:'16px 40px',borderRadius:10,
              fontFamily:'Inter,sans-serif',fontSize:16,fontWeight:700,
              cursor:'pointer',
              boxShadow:'0 8px 32px rgba(14,165,233,.5)',
              transition:'all .25s',
            }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 16px 48px rgba(14,165,233,.6)'}}
            onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 8px 32px rgba(14,165,233,.5)'}}
            >
              Start Free Trial
              <svg width="18" height="18" fill="none" viewBox="0 0 18 18">
                <path d="M3 9h12M10 4l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button style={{
              display:'inline-flex',alignItems:'center',gap:8,
              background:'rgba(255,255,255,.08)',color:'rgba(255,255,255,.88)',
              border:'1.5px solid rgba(255,255,255,.22)',
              padding:'16px 36px',borderRadius:10,
              fontFamily:'Inter,sans-serif',fontSize:16,fontWeight:600,
              cursor:'pointer',backdropFilter:'blur(8px)',
              transition:'all .25s',
            }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.15)';e.currentTarget.style.transform='translateY(-3px)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.08)';e.currentTarget.style.transform='none'}}
            >Schedule a Demo</button>
          </div>

          <p style={{fontSize:13,color:'rgba(255,255,255,.28)',fontWeight:400}}>
            No credit card required · 14-day free trial · Cancel anytime
          </p>
        </Fade>
      </div>
    </section>
  )
}
