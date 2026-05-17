import { useState } from 'react'
import Fade from './Fade'

const CAPS = [
  { icon:'📋', title:'Contract Lifecycle Management', tag:'Core', color:'#0ea5e9',
    desc:'Create, negotiate, and execute contracts digitally with full version history. Automate milestone alerts, manage renewals, and track every contract from award to closeout in one authoritative register.' },
  { icon:'🏢', title:'Vendor Onboarding & Profiles', tag:'Core', color:'#0ea5e9',
    desc:'Guided digital onboarding with document verification — licences, insurance, certifications. Auto-score vendors on capacity and past performance so you qualify the right partners, fast.' },
  { icon:'📦', title:'Delivery & Service Tracking', tag:'Field', color:'#10b981',
    desc:'Log and confirm material deliveries and service completions from any device on site. Every record is timestamped, linked to a contract line, and instantly visible to all stakeholders.' },
  { icon:'💳', title:'Invoice & Payment Processing', tag:'Finance', color:'#8b5cf6',
    desc:'Configurable multi-stage approval workflows from submission to payment release. Vendors track status in real time, finance teams reconcile automatically — no chasing, no spreadsheets.' },
  { icon:'🔍', title:'Compliance & Audit Management', tag:'Compliance', color:'#f59e0b',
    desc:'Continuously monitor contract term adherence and vendor credential expiry. Every action is recorded in an immutable audit trail. Generate compliance evidence packages with a single click.' },
  { icon:'📊', title:'Reporting & Analytics', tag:'Insights', color:'#0284c7',
    desc:'Role-specific dashboards surfacing KPIs on contract performance, vendor reliability, delivery timeliness, and financial health — giving every stakeholder the insight they need, when they need it.' },
]

const TAGS = {
  Core:       ['#eff6ff','#0ea5e9'],
  Field:      ['#ecfdf5','#10b981'],
  Finance:    ['#faf5ff','#8b5cf6'],
  Compliance: ['#fffbeb','#f59e0b'],
  Insights:   ['#f0f9ff','#0284c7'],
}

export default function Capabilities() {
  const [hov,setHov]=useState(null)
  return (
    <section id="platform" style={{padding:'100px 0',background:'#f8fafc'}}>
      <div className="wrap">
        <Fade style={{textAlign:'center',marginBottom:64}}>
          <span className="label-sm" style={{color:'#0ea5e9',marginBottom:12,display:'block'}}>Platform Capabilities</span>
          <h2 className="display-lg" style={{color:'#0f172a',marginBottom:16}}>
            Six integrated modules.<br/>One source of truth.
          </h2>
          <div className="divider-bar"/>
          <p style={{fontSize:17,color:'#64748b',maxWidth:540,margin:'20px auto 0',lineHeight:1.7}}>
            BuildLedger replaces disconnected spreadsheets, email threads, and legacy tools with a fully integrated platform that connects owners, contractors, and vendors across every stage of the project lifecycle.
          </p>
        </Fade>

        <div className="grid-3" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
          {CAPS.map((c,i)=>{
            const [tagBg,tagColor]=TAGS[c.tag]
            const isH = hov===i
            return (
              <Fade key={c.title} d={i*55} scale>
                <div
                  onMouseEnter={()=>setHov(i)}
                  onMouseLeave={()=>setHov(null)}
                  style={{
                    background:'#fff',
                    border:`1px solid ${isH ? c.color+'40' : '#e2e8f0'}`,
                    borderRadius:16, padding:'28px 26px', height:'100%',
                    transition:'all .28s cubic-bezier(.16,1,.3,1)',
                    transform: isH ? 'translateY(-6px)' : 'none',
                    boxShadow: isH ? `0 16px 48px ${c.color}18` : '0 1px 3px rgba(0,0,0,.04)',
                    cursor:'default', position:'relative', overflow:'hidden',
                  }}
                >
                  {/* top accent line */}
                  <div style={{
                    position:'absolute',top:0,left:0,right:0,height:3,
                    background: isH ? `linear-gradient(90deg,${c.color},${c.color}88)` : 'transparent',
                    borderRadius:'16px 16px 0 0',
                    transition:'background .28s',
                  }}/>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
                    <div style={{
                      width:46,height:46,borderRadius:12,
                      background: isH ? c.color+'15' : '#f8fafc',
                      border:`1px solid ${isH?c.color+'30':'#e2e8f0'}`,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:21,transition:'all .28s',
                    }}>{c.icon}</div>
                    <span style={{
                      fontSize:10.5,fontWeight:700,padding:'3px 9px',
                      borderRadius:99,background:tagBg,color:tagColor,
                      letterSpacing:'.04em',
                    }}>{c.tag}</span>
                  </div>
                  <h3 style={{
                    fontFamily:'Inter,sans-serif',fontSize:15.5,fontWeight:700,
                    color:'#0f172a',marginBottom:10,letterSpacing:'-.2px',lineHeight:1.3,
                  }}>{c.title}</h3>
                  <p style={{fontSize:13.5,color:'#64748b',lineHeight:1.68,marginBottom:18}}>{c.desc}</p>
                  <span style={{
                    fontSize:13,fontWeight:600,
                    color: isH ? c.color : '#94a3b8',
                    display:'flex',alignItems:'center',gap:4,
                    transition:'color .2s',
                  }}>
                    Learn more
                    <svg width="13" height="13" fill="none" viewBox="0 0 13 13">
                      <path d="M2 6.5h9M7 3l3.5 3.5L7 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </div>
              </Fade>
            )
          })}
        </div>
      </div>
    </section>
  )
}
