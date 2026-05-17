import { useState } from 'react'
import Fade from './Fade'

const ROLES = [
  {
    tab:'Project Managers', icon:'🏗️', color:'#0ea5e9',
    headline:'Full project visibility —\nfrom award to closeout.',
    body:'Create contracts, assign qualified vendors, monitor deliveries against milestones, and approve invoices — all from a single command centre with real-time status across every project.',
    points:['Centralised contract register with version control','Vendor assignment with prequalification score','Live delivery & service completion tracking','Multi-level invoice approval with full audit chain','Automated deadline alerts for milestones & renewals'],
    kpi:[['Contracts','18','#0ea5e9'],['On Track','14','#10b981'],['At Risk','2','#f59e0b']],
  },
  {
    tab:'Vendors & Contractors', icon:'🔧', color:'#10b981',
    headline:'Qualify faster.\nDeliver confidently.\nGet paid on time.',
    body:'A professional self-service portal that takes you from document submission and qualification through contract acceptance, delivery confirmation, and invoice payment — without a single email chase.',
    points:['Guided digital onboarding with document checklist','Receive & accept contract invitations directly','Log deliveries and service completions from any device','Submit invoices and track approval status in real time','Build your performance score to unlock more contracts'],
    kpi:[['Active','5','#0ea5e9'],['Pending','$38K','#10b981'],['Score','91','#f59e0b']],
  },
  {
    tab:'Finance Officers', icon:'💰', color:'#8b5cf6',
    headline:'Every dollar tracked —\nfrom budget to final payment.',
    body:'Monitor contract values, committed costs, and payment status across all live projects in one consolidated view. Eliminate manual reconciliation and generate audit-ready reports on demand.',
    points:['Budget vs actuals dashboard across all projects','Multi-stage invoice approval and payment release','Payment method, clearing status, and date tracking','Automated alerts when spend exceeds approved thresholds','One-click export for financial audits and board reports'],
    kpi:[['Budget','$3.1M','#0ea5e9'],['Committed','$2.4M','#f59e0b'],['Variance','-2.8%','#10b981']],
  },
  {
    tab:'Compliance Officers', icon:'✅', color:'#f59e0b',
    headline:'Stay audit-ready at\nevery project stage.',
    body:'Continuously monitor contract term adherence, track vendor licence and insurance expiry, and surface compliance gaps before they become disputes — backed by an immutable audit trail.',
    points:['Automated contract term compliance monitoring','Vendor licence, insurance & certification expiry alerts','Immutable timestamped audit log on every action','Configurable compliance rules by project type & region','Single-click compliance evidence package for auditors'],
    kpi:[['Reviews','9','#0ea5e9'],['Cleared','8','#10b981'],['Pending','1','#f59e0b']],
  },
]

const FEED=[
  ['Office Complex Ph.3','Contract Awarded','1h ago','#10b981'],
  ['Highway Widening B12','Invoice Approved','3h ago','#0ea5e9'],
  ['Warehouse Estate','Delivery Confirmed','5h ago','#0ea5e9'],
  ['Hospital Block D','Vendor Prequalified','1d ago','#8b5cf6'],
]

export default function WhoWeServe() {
  const [role,setRole]=useState(0)
  const r=ROLES[role]
  return (
    <section id="who-we-serve" style={{padding:'100px 0', background:'#fff'}}>
      <div className="wrap">
        <Fade style={{textAlign:'center',marginBottom:52}}>
          <span className="label-sm" style={{color:'#0ea5e9',marginBottom:12,display:'block'}}>Who We Serve</span>
          <h2 className="display-lg" style={{color:'#0f172a',marginBottom:16}}>
            A single platform,<br/>purpose-built for every role
          </h2>
          <div className="divider-bar"/>
          <p style={{fontSize:17,color:'#64748b',maxWidth:520,margin:'20px auto 0',lineHeight:1.7}}>
            Whether you manage projects, supply services, control budgets, or enforce compliance — BuildLedger gives you exactly the tools and data your role demands.
          </p>
        </Fade>

        {/* Tab bar with animated indicator */}
        <Fade d={100}>
          <div style={{
            display:'flex',justifyContent:'center',gap:8,
            marginBottom:56,flexWrap:'wrap',
          }}>
            {ROLES.map((rt,i)=>(
              <button key={rt.tab}
                onClick={()=>setRole(i)}
                style={{
                  padding:'10px 22px',borderRadius:999,fontSize:13.5,fontWeight:600,
                  cursor:'pointer',fontFamily:'Inter,sans-serif',
                  background: role===i ? r.color : '#f8fafc',
                  color: role===i ? '#fff' : '#64748b',
                  border: role===i ? `1.5px solid ${r.color}` : '1.5px solid #e2e8f0',
                  boxShadow: role===i ? `0 4px 14px ${r.color}40` : 'none',
                  transition:'all .25s cubic-bezier(.16,1,.3,1)',
                  transform: role===i ? 'translateY(-2px)' : 'none',
                }}
              >{rt.icon} {rt.tab}</button>
            ))}
          </div>
        </Fade>

        <div key={role} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:72,alignItems:'start'}}>
          {/* Left */}
          <Fade>
            <div style={{
              display:'inline-flex',alignItems:'center',gap:6,
              padding:'4px 12px',borderRadius:99,
              background:`${r.color}14`,border:`1px solid ${r.color}30`,
              marginBottom:20,
            }}>
              <span style={{fontSize:16}}>{r.icon}</span>
              <span style={{fontSize:11.5,fontWeight:700,color:r.color,letterSpacing:'.08em'}}>
                {r.tab.toUpperCase()}
              </span>
            </div>
            <h3 style={{
              fontFamily:'Inter,sans-serif',fontSize:'clamp(22px,2.8vw,32px)',
              fontWeight:700,letterSpacing:'-.5px',lineHeight:1.2,
              color:'#0f172a',marginBottom:18,whiteSpace:'pre-line',
            }}>{r.headline}</h3>
            <p style={{fontSize:15.5,color:'#64748b',lineHeight:1.76,marginBottom:28}}>{r.body}</p>
            <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:12,marginBottom:36}}>
              {r.points.map((p,pi)=>(
                <li key={p} style={{
                  display:'flex',gap:12,alignItems:'flex-start',
                  opacity:0,animation:`fadeUp .5s cubic-bezier(.16,1,.3,1) ${pi*60}ms both`,
                }}>
                  <div style={{
                    width:20,height:20,borderRadius:'50%',flexShrink:0,marginTop:1,
                    background:`${r.color}14`,border:`1.5px solid ${r.color}40`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                  }}>
                    <svg width="10" height="10" fill="none" viewBox="0 0 10 10">
                      <path d="M1.5 5l2.5 2.5L8.5 2" stroke={r.color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span style={{fontSize:14.5,color:'#475569',lineHeight:1.5}}>{p}</span>
                </li>
              ))}
            </ul>
            <button className="btn btn-blue" style={{
              background:r.color,
              boxShadow:`0 4px 16px ${r.color}40`,
              padding:'12px 26px',fontSize:14.5,borderRadius:8,
            }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 8px 24px ${r.color}55`}}
            onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow=`0 4px 16px ${r.color}40`}}
            >Learn More →</button>
          </Fade>

          {/* Right: mock dashboard */}
          <Fade d={130} scale>
            <div style={{
              background:'#fff',
              border:'1px solid #e2e8f0',
              borderRadius:18,overflow:'hidden',
              boxShadow:'0 20px 60px rgba(15,23,42,.10)',
              transition:'box-shadow .3s',
            }}>
              {/* Mac chrome */}
              <div style={{
                background:'linear-gradient(180deg,#f8fafc,#f1f5f9)',
                padding:'11px 18px',borderBottom:'1px solid #e2e8f0',
                display:'flex',alignItems:'center',gap:6,
              }}>
                {['#ef4444','#f59e0b','#22c55e'].map(c=>(
                  <div key={c} style={{width:10,height:10,borderRadius:'50%',background:c}}/>
                ))}
                <div style={{
                  flex:1,margin:'0 12px',
                  background:'rgba(15,23,42,.04)',border:'1px solid #e2e8f0',
                  borderRadius:6,padding:'4px 10px',
                  display:'flex',alignItems:'center',gap:6,
                }}>
                  <svg width="9" height="9" fill="none" viewBox="0 0 9 9">
                    <path d="M1 4.5a3.5 3.5 0 107 0 3.5 3.5 0 00-7 0zM7.5 7.5l1.2 1.2" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  <span style={{fontSize:10.5,color:'#94a3b8',fontFamily:'monospace'}}>app.buildledger.io/dashboard</span>
                </div>
              </div>

              <div style={{padding:'20px'}}>
                {/* KPI row */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
                  {r.kpi.map(([l,v,c])=>(
                    <div key={l} style={{
                      background:c+'08',borderRadius:10,
                      padding:'14px 12px',border:`1px solid ${c}20`,
                      transition:'all .2s',
                    }}>
                      <div style={{fontSize:9.5,color:'#94a3b8',marginBottom:5,fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em'}}>{l}</div>
                      <div style={{fontSize:23,fontWeight:800,color:c,letterSpacing:'-.5px',fontFamily:'Inter,sans-serif'}}>{v}</div>
                    </div>
                  ))}
                </div>
                {/* Mini chart bar */}
                <div style={{
                  marginBottom:14,padding:'10px 12px',
                  background:'#f8fafc',borderRadius:10,border:'1px solid #f1f5f9',
                }}>
                  <div style={{fontSize:10,color:'#94a3b8',marginBottom:8,fontWeight:600}}>PROJECT PROGRESS</div>
                  {[['Office Complex Ph.3','68',r.color],['Highway B12','45','#10b981'],['Hospital Block D','91','#f59e0b']].map(([n,pct,c])=>(
                    <div key={n} style={{marginBottom:8}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                        <span style={{fontSize:11,color:'#475569',fontWeight:500}}>{n}</span>
                        <span style={{fontSize:11,fontWeight:700,color:c}}>{pct}%</span>
                      </div>
                      <div style={{height:5,background:'#e2e8f0',borderRadius:99,overflow:'hidden'}}>
                        <div style={{
                          height:'100%',width:pct+'%',borderRadius:99,
                          background:`linear-gradient(90deg,${c}99,${c})`,
                          animation:'lineGrow .8s cubic-bezier(.16,1,.3,1) both',
                        }}/>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Feed */}
                <div style={{borderRadius:10,border:'1px solid #f1f5f9',overflow:'hidden'}}>
                  <div style={{padding:'8px 14px',background:'#f8fafc',borderBottom:'1px solid #f1f5f9'}}>
                    <span style={{fontSize:10,fontWeight:700,color:'#94a3b8',letterSpacing:'.08em',textTransform:'uppercase'}}>Recent Activity</span>
                  </div>
                  {FEED.map(([pr,ac,ti,c])=>(
                    <div key={pr} style={{
                      display:'flex',justifyContent:'space-between',alignItems:'center',
                      padding:'9px 14px',borderBottom:'1px solid #f8fafc',
                      transition:'background .15s',
                    }}>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:'#1e293b'}}>{pr}</div>
                        <div style={{fontSize:10.5,color:'#94a3b8',marginTop:1}}>{ac}</div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:10,fontWeight:700,color:c,background:c+'14',padding:'2px 8px',borderRadius:99}}>{ac.split(' ')[0]}</span>
                        <span style={{fontSize:10,color:'#cbd5e1'}}>{ti}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Fade>
        </div>
      </div>
    </section>
  )
}
