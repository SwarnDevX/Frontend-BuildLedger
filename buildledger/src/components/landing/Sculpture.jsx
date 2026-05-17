import { useEffect, useRef } from 'react'

export default function Sculpture() {
  const canvasRef = useRef(null)
  const T = useRef(0)
  const rafRef = useRef(null)

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    let W = 0, H = 0

    const resize = () => {
      const r = window.devicePixelRatio || 1
      W = cv.offsetWidth
      H = cv.offsetHeight
      cv.width = W * r
      cv.height = H * r
      ctx.scale(r, r)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(cv)

    function drawSlab(x, y, w, h, depth, ang, neonI) {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(ang)
      // shadow
      ctx.save()
      ctx.translate(8, 10)
      ctx.globalAlpha = 0.12
      ctx.fillStyle = '#4a2080'
      ctx.beginPath()
      ctx.moveTo(-w/2,-h/2); ctx.lineTo(w/2,-h/2)
      ctx.lineTo(w/2+depth*0.3,h/2+depth); ctx.lineTo(-w/2-depth*0.3,h/2+depth)
      ctx.closePath(); ctx.fill()
      ctx.globalAlpha = 1
      ctx.restore()
      // top face
      const tg = ctx.createLinearGradient(-w/2,-h/2,w/2,h/2)
      tg.addColorStop(0,'rgba(252,250,255,0.97)')
      tg.addColorStop(0.4,'rgba(244,240,255,0.95)')
      tg.addColorStop(1,'rgba(232,226,252,0.90)')
      ctx.fillStyle = tg
      ctx.shadowColor = 'rgba(120,90,200,0.18)'
      ctx.shadowBlur = 22
      ctx.beginPath()
      ctx.moveTo(-w/2,-h/2); ctx.lineTo(w/2,-h/2)
      ctx.lineTo(w/2,h/2); ctx.lineTo(-w/2,h/2)
      ctx.closePath(); ctx.fill()
      ctx.shadowBlur = 0
      // front face
      const fg = ctx.createLinearGradient(0,h/2,0,h/2+depth)
      fg.addColorStop(0,'rgba(200,190,240,0.82)')
      fg.addColorStop(1,'rgba(175,162,225,0.50)')
      ctx.fillStyle = fg
      ctx.beginPath()
      ctx.moveTo(-w/2,h/2); ctx.lineTo(w/2,h/2)
      ctx.lineTo(w/2-depth*0.25,h/2+depth); ctx.lineTo(-w/2-depth*0.25,h/2+depth)
      ctx.closePath(); ctx.fill()
      // neon edge
      const nx = ctx.createLinearGradient(-w/2,0,w/2,0)
      nx.addColorStop(0,`rgba(80,0,200,0)`)
      nx.addColorStop(0.12,`rgba(120,0,230,${0.5*neonI})`)
      nx.addColorStop(0.35,`rgba(160,20,255,${0.85*neonI})`)
      nx.addColorStop(0.5,`rgba(200,60,255,${neonI})`)
      nx.addColorStop(0.65,`rgba(160,20,255,${0.85*neonI})`)
      nx.addColorStop(0.88,`rgba(120,0,230,${0.5*neonI})`)
      nx.addColorStop(1,`rgba(80,0,200,0)`)
      ctx.strokeStyle = nx
      ctx.lineWidth = 3
      ctx.shadowColor = `rgba(180,0,255,${0.8*neonI})`
      ctx.shadowBlur = 16
      const ey = h/2+depth, dx = -depth*0.25
      ctx.beginPath(); ctx.moveTo(-w/2+dx,ey); ctx.lineTo(w/2+dx,ey); ctx.stroke()
      ctx.shadowBlur = 0
      // bloom
      const bloomW = w*1.4*neonI, bloomH = 55*neonI
      const bg = ctx.createRadialGradient(dx,ey+5,0,dx,ey+5,bloomW*0.55)
      bg.addColorStop(0,`rgba(160,0,255,${0.35*neonI})`)
      bg.addColorStop(0.4,`rgba(120,0,220,${0.18*neonI})`)
      bg.addColorStop(1,'rgba(80,0,180,0)')
      ctx.fillStyle = bg
      ctx.beginPath()
      ctx.ellipse(dx,ey+bloomH*0.45,bloomW*0.55,bloomH,0,0,Math.PI*2)
      ctx.fill()
      ctx.restore()
    }

    function drawWedge(x, y, size, angle, alpha) {
      ctx.save()
      ctx.translate(x, y); ctx.rotate(angle); ctx.globalAlpha = alpha
      const wg = ctx.createLinearGradient(0,-size,0,size*0.3)
      wg.addColorStop(0,'rgba(248,245,255,0.95)')
      wg.addColorStop(0.5,'rgba(235,230,252,0.80)')
      wg.addColorStop(1,'rgba(215,208,245,0.60)')
      ctx.fillStyle = wg
      ctx.shadowColor = 'rgba(100,80,200,0.15)'; ctx.shadowBlur = 14
      ctx.beginPath()
      ctx.moveTo(0,-size); ctx.lineTo(size*0.28,size*0.3); ctx.lineTo(-size*0.22,size*0.3)
      ctx.closePath(); ctx.fill()
      ctx.shadowBlur = 0
      ctx.strokeStyle = `rgba(180,40,255,${0.6*alpha})`; ctx.lineWidth = 2
      ctx.shadowColor = `rgba(180,40,255,${0.5*alpha})`; ctx.shadowBlur = 8
      ctx.beginPath(); ctx.moveTo(-size*0.22,size*0.3); ctx.lineTo(size*0.28,size*0.3); ctx.stroke()
      ctx.shadowBlur = 0; ctx.globalAlpha = 1
      ctx.restore()
    }

    function drawTorus(x, y, R, tube, angle, alpha) {
      ctx.save()
      ctx.translate(x, y); ctx.rotate(angle); ctx.globalAlpha = alpha
      // floor shadow
      ctx.save(); ctx.rotate(0.2); ctx.scale(1,0.22)
      const sg = ctx.createRadialGradient(0,0,R-tube,0,0,R+tube+20)
      sg.addColorStop(0,'rgba(80,60,160,0.22)'); sg.addColorStop(1,'rgba(80,60,160,0)')
      ctx.strokeStyle = sg; ctx.lineWidth = tube+18
      ctx.beginPath(); ctx.arc(0,0,R,0.2,Math.PI*2-0.2); ctx.stroke()
      ctx.restore()
      // back arc
      const bg = ctx.createLinearGradient(-R,-R*0.4,R,R*0.4)
      bg.addColorStop(0,'rgba(218,212,248,0.50)')
      bg.addColorStop(0.5,'rgba(210,204,244,0.65)')
      bg.addColorStop(1,'rgba(200,194,238,0.45)')
      ctx.strokeStyle = bg; ctx.lineWidth = tube*0.82; ctx.lineCap = 'butt'
      ctx.beginPath(); ctx.arc(0,0,R,0.05,Math.PI*1.95); ctx.stroke()
      // front arc
      const fg = ctx.createLinearGradient(-R,0,R,0)
      fg.addColorStop(0,'rgba(255,253,255,0.98)')
      fg.addColorStop(0.3,'rgba(252,249,255,0.99)')
      fg.addColorStop(0.7,'rgba(250,247,255,0.97)')
      fg.addColorStop(1,'rgba(240,236,254,0.92)')
      ctx.strokeStyle = fg; ctx.lineWidth = tube
      ctx.shadowColor = 'rgba(180,160,255,0.22)'; ctx.shadowBlur = 20
      ctx.beginPath(); ctx.arc(0,0,R,Math.PI*1.0,Math.PI*0.0,false); ctx.stroke()
      ctx.shadowBlur = 0
      // specular
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 6
      ctx.shadowColor = 'rgba(255,255,255,0.5)'; ctx.shadowBlur = 10
      ctx.beginPath(); ctx.arc(0,0,R-12,Math.PI*1.1,Math.PI*1.68,false); ctx.stroke()
      ctx.shadowBlur = 0
      // inner edge
      ctx.strokeStyle = 'rgba(140,125,210,0.30)'; ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.arc(0,0,R+tube/2-4,0.08,Math.PI*1.92); ctx.stroke()
      ctx.globalAlpha = 1
      ctx.restore()
    }

    function drawSphere(x, y, r) {
      // drop shadow
      ctx.save(); ctx.translate(x+4,y+4); ctx.scale(1,0.30)
      const ss = ctx.createRadialGradient(0,0,0,0,0,r+8)
      ss.addColorStop(0,'rgba(80,50,140,0.40)'); ss.addColorStop(1,'rgba(80,50,140,0)')
      ctx.fillStyle = ss
      ctx.beginPath(); ctx.arc(0,0,r+8,0,Math.PI*2); ctx.fill()
      ctx.restore()
      // body
      const sg = ctx.createRadialGradient(x-r*0.30,y-r*0.35,r*0.04,x,y,r)
      sg.addColorStop(0,'#fef3c7'); sg.addColorStop(0.22,'#fde68a')
      sg.addColorStop(0.52,'#fbbf24'); sg.addColorStop(0.78,'#d97706'); sg.addColorStop(1,'#92400e')
      ctx.fillStyle = sg
      ctx.shadowColor = 'rgba(251,191,36,0.65)'; ctx.shadowBlur = 24
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill()
      ctx.shadowBlur = 0
      // specular
      const hl = ctx.createRadialGradient(x-r*0.33,y-r*0.38,0,x-r*0.18,y-r*0.22,r*0.48)
      hl.addColorStop(0,'rgba(255,255,225,0.90)'); hl.addColorStop(1,'rgba(255,255,200,0)')
      ctx.fillStyle = hl
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill()
    }

    function draw() {
      const t = T.current
      ctx.clearRect(0,0,W,H)
      const cx = W*0.55, cy = H*0.46
      // ambient glow
      const ag = ctx.createRadialGradient(cx+30,cy-10,20,cx+30,cy-10,300)
      ag.addColorStop(0,'rgba(196,181,253,0.28)')
      ag.addColorStop(0.5,'rgba(167,139,250,0.10)')
      ag.addColorStop(1,'rgba(167,139,250,0)')
      ctx.fillStyle = ag
      ctx.beginPath(); ctx.ellipse(cx+30,cy-10,300,240,-0.1,0,Math.PI*2); ctx.fill()
      // slabs
      const slabNeon = 0.55+0.45*Math.abs(Math.sin(t*0.55))
      const torusR = 118+Math.sin(t*0.15)*6
      drawSlab(cx-25+Math.cos(t*0.19)*8, cy+145+Math.sin(t*0.28)*10, 272,48,22, 0.15+Math.sin(t*0.22)*0.04, slabNeon)
      const slabBAlpha = 0.6+0.4*Math.sin(t*0.38+1.2)
      if (slabBAlpha > 0.1) {
        ctx.globalAlpha = slabBAlpha
        drawSlab(cx+82+Math.sin(t*0.31)*12, cy+58+Math.cos(t*0.24)*9, 188,34,16, -0.13+Math.sin(t*0.18)*0.06, slabNeon*0.75)
        ctx.globalAlpha = 1
      }
      // neon flood
      const floodI = Math.max(0, Math.sin(t*0.55)*0.85)
      if (floodI > 0.05) {
        const ff = ctx.createRadialGradient(cx,H*0.78,10,cx,H*0.78,W*0.65)
        ff.addColorStop(0,`rgba(160,0,255,${0.28*floodI})`)
        ff.addColorStop(0.3,`rgba(140,0,230,${0.18*floodI})`)
        ff.addColorStop(0.6,`rgba(200,40,255,${0.10*floodI})`)
        ff.addColorStop(1,'rgba(120,0,200,0)')
        ctx.fillStyle = ff
        ctx.beginPath(); ctx.ellipse(cx,H*0.82,W*0.65,H*0.30,0,0,Math.PI*2); ctx.fill()
        const mf = ctx.createRadialGradient(cx+W*0.22,H*0.85,5,cx+W*0.22,H*0.85,W*0.35)
        mf.addColorStop(0,`rgba(255,50,200,${0.20*floodI})`)
        mf.addColorStop(0.5,`rgba(220,0,180,${0.10*floodI})`)
        mf.addColorStop(1,'rgba(180,0,140,0)')
        ctx.fillStyle = mf
        ctx.beginPath(); ctx.ellipse(cx+W*0.22,H*0.88,W*0.35,H*0.18,0,0,Math.PI*2); ctx.fill()
      }
      // wedges
      const wedgeAlpha = 0.35+0.65*Math.abs(Math.sin(t*0.33))
      const w1Angle = t*0.14+Math.PI*0.15
      drawWedge(cx+Math.cos(w1Angle)*(torusR*1.05), cy+Math.sin(w1Angle)*(torusR*0.38), 90, w1Angle+Math.PI*0.5, wedgeAlpha*0.9)
      const w2Angle = t*0.14+Math.PI*0.95
      drawWedge(cx+Math.cos(w2Angle)*(torusR*0.92), cy+Math.sin(w2Angle)*(torusR*0.35), 68, w2Angle+Math.PI*0.4, wedgeAlpha*0.7)
      // ribbon
      const ribbonAlpha = Math.max(0, Math.sin(t*0.38-0.8)*0.65)
      if (ribbonAlpha > 0.03) {
        ctx.save(); ctx.globalAlpha = ribbonAlpha
        const r1 = ctx.createLinearGradient(cx-60,cy-200,cx+80,cy+100)
        r1.addColorStop(0,'rgba(252,250,255,0.0)'); r1.addColorStop(0.2,'rgba(248,245,255,0.92)')
        r1.addColorStop(0.5,'rgba(244,240,255,0.88)'); r1.addColorStop(0.8,'rgba(240,235,252,0.82)')
        r1.addColorStop(1,'rgba(232,226,250,0.0)')
        ctx.strokeStyle = r1; ctx.lineWidth = 52; ctx.lineCap = 'round'
        ctx.shadowColor = 'rgba(160,140,230,0.25)'; ctx.shadowBlur = 18
        ctx.beginPath()
        ctx.moveTo(cx-50+Math.sin(t*0.2)*10, cy-220)
        ctx.bezierCurveTo(cx+100,cy-130, cx-80+Math.sin(t*0.15)*15,cy, cx+60,cy+110)
        ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.restore()
      }
      // torus
      const torusAngle = t*0.20
      const torusAlpha = 0.95-0.25*Math.max(0,Math.sin((t*0.18)%(Math.PI*2)-0.3))
      drawTorus(cx-15+Math.sin(t*0.16)*6, cy-18+Math.cos(t*0.11)*8, torusR, 46, torusAngle, torusAlpha)
      // sphere
      const sAngle = -Math.PI*0.28+torusAngle
      drawSphere(
        (cx-15)+Math.cos(sAngle)*torusR+Math.sin(t*0.16)*6,
        (cy-18)+Math.sin(sAngle)*torusR*0.38+Math.cos(t*0.11)*8,
        19+Math.sin(t*0.45)*1.5
      )
      // construction grid lines
      ctx.strokeStyle = 'rgba(139,92,246,0.055)'; ctx.lineWidth = 0.8
      for (let i=-1; i<5; i++) {
        ctx.beginPath()
        ctx.moveTo(i*W*0.28-30, 0); ctx.lineTo(W*0.55+i*W*0.18, H); ctx.stroke()
      }
      T.current += 0.010
      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}
