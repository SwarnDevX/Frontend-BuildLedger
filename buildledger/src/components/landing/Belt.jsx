const CLIENTS = [
  'Kiewit Corporation','Balfour Beatty','Turner Construction','AECOM',
  'Skanska USA','Gilbane Building Co.','Jacobs Engineering','PCL Constructors',
  'Walsh Group','Hensel Phelps','Bechtel Group','Fluor Corporation',
  'Clark Construction','DPR Construction','Mortenson','Whiting-Turner',
]
export default function Belt() {
  const doubled = [...CLIENTS,...CLIENTS]
  return (
    <div style={{
      background:'#fff',
      borderTop:'1px solid #f1f5f9',
      borderBottom:'1px solid #f1f5f9',
      padding:'22px 0', overflow:'hidden',
    }}>
      <div style={{
        display:'flex',alignItems:'center',
        width:'max-content',
        animation:'ticker 30s linear infinite',
      }}>
        {doubled.map((n,i)=>(
          <div key={i} style={{
            display:'flex',alignItems:'center',gap:9,
            padding:'0 36px',
            borderRight:'1px solid #f1f5f9',
            whiteSpace:'nowrap',
          }}>
            <div style={{width:6,height:6,borderRadius:'50%',background:'#bae6fd',flexShrink:0}}/>
            <span style={{fontSize:13,fontWeight:600,color:'#94a3b8',letterSpacing:'.03em'}}>{n}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
