import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Pricing — Spectrum Connect',
  description: 'Simple, transparent pricing. No hidden fees.',
};

const Ic = {
  Check: () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>,
  Handshake: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 17l-2 2-2-2-3-3 4-4 3 3"/><path d="M13 7l2-2 2 2 3 3-4 4-3-3"/><path d="M9 13l2 2 4-4"/></svg>,
  Doc: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M9 13h6M9 17h4"/></svg>,
  CheckCircle: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>,
  Receipt: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3v18l3-2 3 2 3-2 3 2 3-2V3z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>,
  Shield: () => <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>,
  User: () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>,
  Briefcase: () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>,
  Verify: () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5L16 10"/></svg>,
  Zap: () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>,
  Scale: () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M5 6h14"/><path d="M5 6l-3 6h6l-3-6zM19 6l-3 6h6l-3-6z"/></svg>,
  Chat: () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12c0 4.4-4 8-9 8a10 10 0 0 1-3-.5L3 21l1.5-5A8 8 0 0 1 3 12c0-4.4 4-8 9-8s9 3.6 9 8z"/></svg>,
  ShieldSm: () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6z"/></svg>,
  Headset: () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14a2 2 0 0 1 2-2h1v6H6a2 2 0 0 1-2-2v-2zM20 14a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2v-2z"/></svg>,
  Crown: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M3 18h18l-2-9-4 3-3-6-3 6-4-3-2 9z"/></svg>,
  Boost: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4c4 0 6 2 6 6 0 5-7 9-7 9s-4-1.5-5.5-3S5 11 5 11s4-7 9-7z"/><circle cx="15" cy="9" r="1.6"/></svg>,
  BadgeV: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.5 2L18 3l1 3.5L22 8l-2 3 2 3-3 1.5L18 19l-3.5-1L12 21l-2.5-3L6 19l-1-3.5L2 14l2-3-2-3 3-1.5L6 3l3.5 1z"/><path d="M9 12l2 2 4-4"/></svg>,
  Eye: () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>,
  Ban: () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M5 5l14 14"/></svg>,
  HandshakeSm: () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 17l-2 2-2-2-3-3 4-4 3 3"/><path d="M13 7l2-2 2 2 3 3-4 4-3-3"/></svg>,
  Info: () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg>,
};

// Inline styles kept from original
const s = {
  prSec: { padding: '80px 24px' } as React.CSSProperties,
  prInner: { maxWidth: 1000, margin: '0 auto' } as React.CSSProperties,
  prHead: { textAlign: 'center' as const, marginBottom: 40 },
  icTile: { width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg,#195ad7,#4178e7)', display: 'grid', placeItems: 'center', color: '#fff', margin: '0 auto 20px' } as React.CSSProperties,
  icTileG: { background: 'linear-gradient(135deg,#10b981,#059669)' } as React.CSSProperties,
  h2: { fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', color: '#111827', margin: '0 0 12px' } as React.CSSProperties,
  sub: { fontSize: 16, color: '#6b7280', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 } as React.CSSProperties,
};

export default function PricingPage() {
  return (
    <div style={{background:'#fff',color:'#1f2937',fontFamily:"'Inter',system-ui,sans-serif"}}>
      <Nav/>

      {/* Hero */}
      <section style={{background:'linear-gradient(135deg,#195ad7,#4178e7)',color:'#fff',padding:'80px 24px',textAlign:'center'}}>
        <h1 style={{fontSize:52,fontWeight:700,letterSpacing:'-0.025em',margin:'0 0 18px',lineHeight:1.05}}>Pricing That&apos;s Fair and Clear</h1>
        <p style={{fontSize:18,color:'rgba(255,255,255,0.9)',maxWidth:620,margin:'0 auto',lineHeight:1.55}}>No hidden fees, no confusion — just simple pricing built for real work.</p>
      </section>

      {/* How the Platform Fee Works */}
      <section style={{...s.prSec}}>
        <div style={s.prInner}>
          <div style={s.prHead}>
            <div style={s.icTile}><Ic.Handshake/></div>
            <h2 style={s.h2}>How the Platform Fee Works</h2>
            <p style={s.sub}>A small fee keeps the platform running and ensures everyone gets matched fairly, verified, and supported.</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20,marginBottom:40}}>
            {[
              {ic:<Ic.Doc/>,bg:'#d1fae5',col:'#059669',t:'1. Project Agreed',d:'You and your collaborator agree on the project scope and budget.'},
              {ic:<Ic.CheckCircle/>,bg:'#dbeafe',col:'#195ad7',t:'2. Work Completed',d:'The project is delivered and both parties are satisfied.'},
              {ic:<Ic.Receipt/>,bg:'#f3e8ff',col:'#9333ea',t:'3. Small Fee Applied',d:'A fair platform fee is split between both parties.'},
            ].map(({ic,bg,col,t,d})=>(
              <div key={t} style={{background:'#f9fafb',borderRadius:14,padding:24,border:'1px solid #eef0f3'}}>
                <div style={{width:44,height:44,borderRadius:10,background:bg,color:col,display:'grid',placeItems:'center',marginBottom:14}}>{ic}</div>
                <h3 style={{fontSize:16,fontWeight:600,color:'#111827',margin:'0 0 8px'}}>{t}</h3>
                <p style={{fontSize:14,color:'#6b7280',margin:0,lineHeight:1.5}}>{d}</p>
              </div>
            ))}
          </div>

          {/* Fee breakdown */}
          <div style={{background:'#f9fafb',borderRadius:18,padding:32,border:'1px solid #eef0f3'}}>
            <h3 style={{textAlign:'center',fontSize:20,fontWeight:700,color:'#111827',margin:'0 0 24px'}}>The Platform Fee Breakdown</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
              {[{bg:'#195ad7',ic:<Ic.User/>,lab:'Creator Pays',sub:'Of the project value',pct:'8%',col:'#195ad7'},
                {bg:'#10b981',ic:<Ic.Briefcase/>,lab:'Client Pays',sub:'Of the project value',pct:'4%',col:'#10b981'}
              ].map(({bg,ic,lab,sub,pct,col})=>(
                <div key={lab} style={{background:'#fff',borderRadius:12,padding:20,border:'1px solid #eef0f3',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:36,height:36,borderRadius:8,background:bg,color:'#fff',display:'grid',placeItems:'center'}}>{ic}</div>
                    <div><div style={{fontWeight:600,fontSize:14,color:'#111827'}}>{lab}</div><div style={{fontSize:12,color:'#6b7280'}}>{sub}</div></div>
                  </div>
                  <div style={{fontSize:28,fontWeight:700,color:col}}>{pct}</div>
                </div>
              ))}
            </div>
            <div style={{textAlign:'center',background:'#fff',borderRadius:12,padding:20,border:'1px solid #eef0f3'}}>
              <div style={{fontSize:12,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,marginBottom:6}}>Total Platform Fee</div>
              <div style={{fontSize:48,fontWeight:700,color:'#111827',lineHeight:1}}>12<sup style={{fontSize:24}}>%</sup></div>
              <div style={{fontSize:13,color:'#6b7280',marginTop:6}}>Split fairly between both parties</div>
            </div>
          </div>
        </div>
      </section>

      {/* Small Projects Protected */}
      <section style={{...s.prSec,background:'#f0fdf4'}}>
        <div style={{maxWidth:700,margin:'0 auto',background:'#fff',borderRadius:20,padding:40,border:'1px solid #bbf7d0',textAlign:'center',boxShadow:'0 8px 30px rgba(16,185,129,0.08)'}}>
          <div style={{...s.icTile,...s.icTileG}}><Ic.Shield/></div>
          <h2 style={s.h2}>Small Projects Protected</h2>
          <p style={{...s.sub,margin:'0 auto 28px'}}>Everyone deserves access to great collaboration, no matter the project size.</p>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:20,marginBottom:24}}>
            {[{lab:'Project Under',v:'$20'},{lab:'Total Fee Capped At',v:'$2'}].map(({lab,v},i)=>(
              <>
                {i===1 && <div style={{fontSize:20,color:'#6b7280',fontWeight:600}}>→</div>}
                <div key={lab} style={{background:'#f9fafb',borderRadius:12,padding:'16px 28px',border:'1px solid #e5e7eb'}}>
                  <div style={{fontSize:12,color:'#6b7280',marginBottom:4}}>{lab}</div>
                  <div style={{fontSize:32,fontWeight:700,color:'#111827'}}>{v}</div>
                </div>
              </>
            ))}
          </div>
          <div style={{background:'#f0fdf4',borderRadius:10,padding:'14px 18px',fontSize:13,color:'#15803d',fontWeight:500}}>No matter how small the project, the platform fee will never exceed $2 total.</div>
        </div>
      </section>

      {/* Optional Upgrades */}
      <section style={{...s.prSec,background:'#f9fafb'}}>
        <div style={s.prInner}>
          <div style={s.prHead}>
            <h2 style={s.h2}>Optional Upgrades</h2>
            <p style={s.sub}>Helpful extras if you want them. Not required to succeed on the platform.</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
            {[
              {grad:'linear-gradient(135deg,#a855f7,#ec4899)',ic:<Ic.Crown/>,badge:'Optional',badgeCol:'#9333ea',badgeBg:'#f3e8ff',name:'Pro',price:'$15',unit:'/month',
               items:['Unlimited outreach to creators and clients','Advanced matching preferences','Enhanced team building tools','Priority support'],ctaCol:'#9333ea'},
              {grad:'linear-gradient(135deg,#f97316,#ef4444)',ic:<Ic.Boost/>,badge:'Optional',badgeCol:'#ea580c',badgeBg:'#ffedd5',name:'Boosts',price:'$8',unit:'/boost',
               items:['Highlight your profile or project','7 days of increased visibility','Appear in featured sections','No commitment required'],ctaCol:'#ea580c'},
              {grad:'linear-gradient(135deg,#10b981,#059669)',ic:<Ic.BadgeV/>,badge:'One-time',badgeCol:'#059669',badgeBg:'#d1fae5',name:'Verification',price:'$20',unit:'once',
               items:['Official verified badge','Higher trust from clients','Improved match priority','Lifetime verification'],ctaCol:'#059669'},
            ].map(({grad,ic,badge,badgeCol,badgeBg,name,price,unit,items,ctaCol})=>(
              <div key={name} style={{background:'#fff',borderRadius:16,padding:28,border:'1px solid #eef0f3',display:'flex',flexDirection:'column',gap:16}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{width:48,height:48,borderRadius:12,background:grad,color:'#fff',display:'grid',placeItems:'center'}}>{ic}</div>
                  <span style={{fontSize:12,fontWeight:600,padding:'3px 10px',borderRadius:999,background:badgeBg,color:badgeCol}}>{badge}</span>
                </div>
                <div>
                  <div style={{fontSize:18,fontWeight:700,color:'#111827',marginBottom:4}}>{name}</div>
                  <div style={{fontSize:30,fontWeight:700,color:'#111827',lineHeight:1}}>{price}<span style={{fontSize:14,fontWeight:400,color:'#6b7280'}}>{unit}</span></div>
                </div>
                <ul style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:10,flex:1}}>
                  {items.map(item=>(
                    <li key={item} style={{display:'flex',alignItems:'flex-start',gap:8,fontSize:13.5,color:'#374151'}}>
                      <span style={{width:16,height:16,borderRadius:'50%',background:'#10b98122',color:'#059669',display:'grid',placeItems:'center',flex:'none',marginTop:1}}><Ic.Check/></span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href={`/creator/upgrade?plan=${name.toLowerCase().replace(' plan','').replace('ication','y')}`} style={{display:'block',textAlign:'center',padding:'11px',borderRadius:10,background:badgeBg,color:ctaCol,fontWeight:600,fontSize:14,textDecoration:'none'}}>Get Started</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{background:'linear-gradient(135deg,#195ad7,#4178e7)',color:'#fff',padding:'90px 24px',textAlign:'center'}}>
        <div style={{...s.icTile,background:'rgba(255,255,255,0.2)'}}><Ic.Handshake/></div>
        <h2 style={{fontSize:40,fontWeight:700,letterSpacing:'-0.02em',margin:'0 0 16px',color:'#fff'}}>No Hidden Fees. No Confusion. Just Fair Work.</h2>
        <p style={{fontSize:17,color:'rgba(255,255,255,0.9)',maxWidth:580,margin:'0 auto 32px',lineHeight:1.55}}>Start collaborating with transparent pricing that works for everyone.</p>
        <div style={{display:'flex',justifyContent:'center',gap:14,flexWrap:'wrap',marginBottom:20}}>
          <Link href="/signup" className="btn btn-white btn-lg">Get Started Free</Link>
          <Link href="/how-it-works" className="btn btn-ghost-light btn-lg">See How It Works</Link>
        </div>
        <div style={{fontSize:13,color:'rgba(255,255,255,0.7)'}}>Free to join · No credit card required · Start in minutes</div>
      </section>

      <Footer/>
    </div>
  );
}
