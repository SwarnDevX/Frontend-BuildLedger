const COLS = [
  ['Platform',  ['Contract Lifecycle','Vendor Onboarding','Delivery Tracking','Invoice & Payments','Compliance & Audit','Analytics & Reports']],
  ['Company',   ['About Us','Leadership','Careers','Newsroom','Partners','Contact Us']],
  ['Resources', ['Documentation','Help Centre','Webinars','Case Studies','Blog','System Status']],
  ['Legal',     ['Privacy Policy','Terms of Service','Security','GDPR','Accessibility','Cookies']],
]

export default function Footer() {
  return (
    <footer style={{background:'#04111f',borderTop:'1px solid rgba(255,255,255,.05)',paddingTop:64}}>
      <div className="wrap">
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr',gap:48,paddingBottom:56,borderBottom:'1px solid rgba(255,255,255,.06)'}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:18}}>
              <div style={{width:32,height:32,borderRadius:9,background:'linear-gradient(135deg,#0ea5e9,#0284c7)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 12px rgba(14,165,233,.4)'}}>
                <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                  <path d="M2 13L5.5 5.5L8.5 9.5L11.5 4L15 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span style={{fontFamily:'Inter,sans-serif',fontSize:18,fontWeight:800,color:'#fff',letterSpacing:'-.03em'}}>
                Build<span style={{color:'#38bdf8'}}>Ledger</span>
              </span>
            </div>
            <p style={{fontSize:13.5,color:'rgba(255,255,255,.35)',lineHeight:1.76,maxWidth:248,marginBottom:24}}>
              The end-to-end platform that connects construction owners, contractors, and vendors — from contract creation to final payment.
            </p>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {['ISO 27001','SOC 2','GDPR'].map(b=>(
                <div key={b} style={{padding:'4px 10px',borderRadius:5,border:'1px solid rgba(14,165,233,.2)',fontSize:10.5,fontWeight:700,color:'rgba(255,255,255,.35)',letterSpacing:'.04em'}}>{b}</div>
              ))}
            </div>
          </div>
          {COLS.map(([h,ls])=>(
            <div key={h}>
              <div style={{fontSize:10.5,fontWeight:700,letterSpacing:'.1em',color:'rgba(255,255,255,.45)',marginBottom:18,textTransform:'uppercase'}}>{h}</div>
              {ls.map(l=>(
                <div key={l} style={{fontSize:13,color:'rgba(255,255,255,.32)',marginBottom:11,cursor:'pointer',transition:'color .18s'}}
                  onMouseEnter={e=>e.target.style.color='rgba(255,255,255,.75)'}
                  onMouseLeave={e=>e.target.style.color='rgba(255,255,255,.32)'}
                >{l}</div>
              ))}
            </div>
          ))}
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,padding:'22px 0'}}>
          <span style={{fontSize:12,color:'rgba(255,255,255,.2)'}}>© 2026 BuildLedger Technologies, Inc. All rights reserved.</span>
          <div style={{display:'flex',gap:16}}>
            {['Privacy','Terms','Cookies','Security'].map(l=>(
              <span key={l} style={{fontSize:12,color:'rgba(255,255,255,.2)',cursor:'pointer',transition:'color .18s'}}
                onMouseEnter={e=>e.target.style.color='rgba(255,255,255,.6)'}
                onMouseLeave={e=>e.target.style.color='rgba(255,255,255,.2)'}
              >{l}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
