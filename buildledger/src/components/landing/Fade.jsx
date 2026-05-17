import { useEffect, useRef, useState } from 'react'

export default function Fade({ children, d = 0, y = 28, x = 0, scale = false, style = {}, className = '' }) {
  const ref = useRef(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setOn(true) },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} className={className} style={{
      opacity: on ? 1 : 0,
      transform: on ? 'none' : `translateY(${y}px) translateX(${x}px) scale(${scale ? .94 : 1})`,
      transition: `opacity .75s cubic-bezier(.16,1,.3,1) ${d}ms, transform .75s cubic-bezier(.16,1,.3,1) ${d}ms`,
      ...style,
    }}>{children}</div>
  )
}
