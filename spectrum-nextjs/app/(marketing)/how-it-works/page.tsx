import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Avatar from '@/components/Avatar';
import Link from 'next/link';

// ---- Icons ----
const Ic = {
  Check: () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>,
  Search: () => <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
  Verify: () => <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5L16 10"/></svg>,
  Users: () => <svg viewBox="0 0 1024 1024" width="24" height="24" fill="currentColor"><path d="M764.077495 365.4687c25.787576-28.703601 41.628106-66.514662 41.628106-108.047547 0-89.337066-72.67538-162.023709-162.023709-162.02371S481.658182 168.084087 481.658182 257.421153h45.226039c0-64.405459 52.403475-116.797671 116.797671-116.797671s116.797671 52.392212 116.79767 116.797671-52.403475 116.797671-116.79767 116.79767c-20.647671 0-40.964628-5.4655-58.741325-15.822099l-22.745613 39.086822c24.666421 14.365111 52.844769 21.961316 81.486938 21.961316 31.034988 0 59.955653-8.924184 84.62105-24.116595 2.73275 4.021822 144.402643 55.220183 154.273921 292.470796 0.507847 12.15659 10.511207 21.674628 22.568481 21.674628 0.330715 0 0.639928-0.011263 0.971667-0.022526 12.477067-0.51911 22.171213-11.052842 21.641864-23.529908-9.692098-233.333227-126.929016-303.970051-163.68138-320.452557z"/><path d="M541.966052 518.12181c29.268786-33.91313 47.104868-77.952485 47.104868-126.15803 0-106.683731-86.809093-193.481562-193.492825-193.481562S202.107796 285.279025 202.107796 391.962756c0 48.204521 17.828915 92.240805 47.090534 126.153935-51.365255 30.577311-153.310445 121.144064-153.310445 358.758155 0 12.488329 10.113939 22.613531 22.613531 22.613531s22.613531-10.125202 22.613531-22.613531c0-244.454669 113.552978-312.788776 143.593774-326.583583 31.432256 22.083159 69.622154 35.163294 110.869374 35.163294 41.246196 0 79.440191-13.080135 110.876542-35.163294 30.045915 13.80607 143.609132 82.134033 143.609132 326.583583 0 12.488329 10.113939 22.613531 22.613531 22.613531 12.498568 0 22.613531-10.125202 22.613531-22.613531-0.001024-237.6059-101.951333-328.172653-153.324779-358.753036zM247.333835 391.962756c0-81.752124 66.492137-148.255523 148.24426-148.255523s148.265762 66.5034 148.265762 148.255523-66.514662 148.265762-148.265762 148.265762-148.244261-66.513638-148.24426-148.265762z"/></svg>,
  Chat: () => <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12c0 4.4-4 8-9 8a10 10 0 0 1-3-.5L3 21l1.5-5A8 8 0 0 1 3 12c0-4.4 4-8 9-8s9 3.6 9 8z"/></svg>,
  Scale: () => <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M5 6h14"/><path d="M5 6l-3 6h6l-3-6zM19 6l-3 6h6l-3-6z"/></svg>,
  Star: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6l-5.9 3.1L7.3 14 2.5 9.5l6.6-.9L12 2.5z"/></svg>,
  Crown: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M3 18h18l-2-9-4 3-3-6-3 6-4-3-2 9z"/></svg>,
  Pct: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 19L19 5"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/></svg>,
  Boost: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4c4 0 6 2 6 6 0 5-7 9-7 9s-4-1.5-5.5-3S5 11 5 11s4-7 9-7z"/><circle cx="15" cy="9" r="1.6"/></svg>,
};

// ---- Mock components ----
function MockDiscovery() {
  return (
    <div className="mock-card" style={{background:'linear-gradient(140deg,#eff6ff,#fff)'}}>
      <div className="mock-head">
        <span>Perfect Match Found</span>
        <span className="mock-pct">95% Match</span>
      </div>
      <div className="mock-ppl">
        <Avatar name="Jessica Lee" size={40}/>
        <div>
          <div className="nm">Jessica Lee <span className="verified"><Ic.Check/></span></div>
          <div className="ro">UX/UI Designer · 9 years exp.</div>
        </div>
      </div>
      <div className="mock-tags">
        <span className="tag-chip">Figma</span>
        <span className="tag-chip">Web Design</span>
        <span className="tag-chip">Mobile Apps</span>
      </div>
      <div style={{marginTop:14,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,textAlign:'center'}}>
        {[['Skills','98%','#f5a623'],['Available','100%','#195ad7'],['Style Fit','92%','#10b981']].map(([l,v,c])=>(
          <div key={l} style={{background:'#fff',padding:10,borderRadius:10,border:'1px solid #eef0f3'}}>
            <div style={{fontSize:11,color:'#6b7280'}}>{l}</div>
            <div style={{fontWeight:700,color:c}}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockTrust() {
  return (
    <div className="mock-card">
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
        <div style={{width:40,height:40,borderRadius:10,background:'#10b98122',color:'#059669',display:'grid',placeItems:'center'}}><Ic.Verify/></div>
        <div>
          <div style={{fontWeight:600,color:'#111827'}}>Trust Profile</div>
          <div style={{fontSize:12.5,color:'#6b7280'}}>Verified &amp; trusted</div>
        </div>
      </div>
      {[['Identity Verified',true],['Portfolio Reviewed',true],['Past Projects','47'],['Response Time','< 2 hrs'],['Satisfaction','98%']].map(([l,v])=>(
        <div key={l as string} className="mock-row">
          <span className="ll">{l as string}</span>
          <span style={v===true?{color:'#10b981'}:{fontWeight:600,color:'#111827'}}>{v===true?<Ic.Check/>:v as string}</span>
        </div>
      ))}
    </div>
  );
}

function MockTeam() {
  return (
    <div className="mock-card">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div style={{fontWeight:600,fontSize:14}}>Production Team</div>
        <div style={{fontSize:11.5,padding:'3px 9px',background:'rgba(255,255,255,0.22)',borderRadius:999,fontWeight:600}}>6 Members</div>
      </div>
      {[['Jake Martinez','Director'],['Emma Wilson','Designer'],['Alex Thompson','Sound'],['Sarah Chen','Editor']].map(([n,r])=>(
        <div key={n} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.15)'}}>
          <Avatar name={n} size={30}/>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600}}>{n}</div>
            <div style={{fontSize:11.5,color:'rgba(255,255,255,0.8)'}}>{r}</div>
          </div>
          <span style={{width:16,height:16,borderRadius:'50%',background:'rgba(255,255,255,0.9)',color:'#b855e8',display:'grid',placeItems:'center',fontSize:9,fontWeight:700}}>✓</span>
        </div>
      ))}
      <div style={{marginTop:12,textAlign:'center',fontSize:13,color:'#fff',display:'flex',justifyContent:'space-between'}}>
        <span>Team Rating</span>
        <span style={{fontWeight:600}}><span style={{color:'#ffd166'}}>★</span> 4.9</span>
      </div>
    </div>
  );
}

function MockCollab() {
  return (
    <div className="mock-card" style={{background:'linear-gradient(140deg,#ecfeff,#fff)'}}>
      <div className="mock-head"><span>Brand Video Project</span><span className="mock-pct" style={{background:'#195ad7'}}>Active</span></div>
      <div className="mock-row"><span className="ll" style={{color:'#10b981'}}><Ic.Check/> Script Approved</span><span className="rr">2 days ago</span></div>
      <div className="mock-row"><span className="ll" style={{color:'#10b981'}}><Ic.Check/> Filming Complete</span><span className="rr">1 day ago</span></div>
      <div className="mock-row"><span className="ll" style={{color:'#195ad7',fontWeight:600}}>Editing in Progress</span><span className="rr" style={{color:'#195ad7',fontWeight:600}}>Active</span></div>
      <div className="mock-row"><span className="ll" style={{color:'#9ca3af'}}>Final Review</span><span className="rr">Upcoming</span></div>
      <div style={{marginTop:12}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:12.5,color:'#6b7280',marginBottom:4}}><span>Progress</span><span style={{color:'#195ad7',fontWeight:600}}>65%</span></div>
        <div style={{height:6,background:'#e5e7eb',borderRadius:999,overflow:'hidden'}}><div style={{height:'100%',width:'65%',background:'#195ad7',borderRadius:999}}/></div>
      </div>
    </div>
  );
}

function MockFair() {
  return (
    <div className="mock-card" style={{background:'linear-gradient(140deg,#fff7ed,#fff)'}}>
      <div style={{textAlign:'center',marginBottom:14}}>
        <div style={{width:46,height:46,borderRadius:'50%',background:'#10b98122',color:'#059669',display:'grid',placeItems:'center',margin:'0 auto 10px'}}><Ic.Check/></div>
        <div style={{fontWeight:600,fontSize:16,color:'#111827'}}>Payment Released</div>
      </div>
      <div className="mock-row"><span className="ll">Project Value</span><span className="rr" style={{fontWeight:700,color:'#111827'}}>$2,500</span></div>
      <div className="mock-row"><span className="ll">Platform Fee (8%)</span><span className="rr" style={{color:'#6b7280'}}>−$200</span></div>
      <div className="mock-row"><span className="ll" style={{fontWeight:600,color:'#111827'}}>You Receive</span><span className="rr" style={{fontWeight:700,color:'#059669',fontSize:16}}>$2,300</span></div>
      <button style={{marginTop:14,width:'100%',padding:'12px',background:'#195ad7',color:'#fff',border:0,borderRadius:10,fontWeight:600,fontSize:14,cursor:'pointer'}}>Leave Review</button>
    </div>
  );
}

// ---- Step component ----
interface StepProps {
  tile: string;
  icon: keyof typeof Ic;
  title: string;
  desc: string;
  bullets: string[];
  mockBg: string;
  mock: React.ReactNode;
  reverse?: boolean;
}
function Step({ tile, icon, title, desc, bullets, mockBg, mock, reverse }: StepProps) {
  const I = Ic[icon];
  return (
    <div className={`flow-step${reverse ? ' reverse' : ''}`}>
      <div>
        <div className={`tile ${tile}`}><I/></div>
        <h3>{title}</h3>
        <p>{desc}</p>
        <ul>{bullets.map((b,i)=>(
          <li key={i}><span className="chk"><Ic.Check/></span>{b}</li>
        ))}</ul>
      </div>
      <div className={mockBg}>{mock}</div>
    </div>
  );
}

function Connector() {
  return <div className="flow-connector"><div className="line"/></div>;
}

function PricingStrip() {
  return (
    <section className="flow-pricing">
      <h2>Simple, Transparent Pricing</h2>
      <div className="sub">Clear, fair fees that work for everyone. No hidden surprises.</div>
      <div className="pgrid">
        <div className="pcard"><div className="ic tile-blue"><Ic.Pct/></div><div className="lab">Platform</div><div className="v">12%</div><div className="u">Per project</div></div>
        <div className="pcard"><div className="ic tile-purple"><Ic.Crown/></div><div className="lab">Pro Plan</div><div className="v">$15</div><div className="u">/month</div></div>
        <div className="pcard"><div className="ic tile-orange"><Ic.Boost/></div><div className="lab">Boosts</div><div className="v">$8</div><div className="u">Per boost</div></div>
        <div className="pcard"><div className="ic tile-green"><Ic.Verify/></div><div className="lab">Verification</div><div className="v">$20</div><div className="u">One-time</div></div>
      </div>
      <div className="strip">
        <div>
          <div className="lead">Small projects? We cap fees at just $2 for anything under $20.</div>
          <div className="sub2">Fair access for every budget.</div>
        </div>
        <Link href="/pricing" className="btn btn-white">See Full Pricing</Link>
      </div>
    </section>
  );
}

export const metadata = {
  title: 'How It Works — Spectrum Connect',
  description: 'From first match to final payment — a clear, transparent journey.',
};

export default function HowItWorksPage() {
  return (
    <div className="flow">
      <Nav/>
      <section className="flow-hero">
        <h1>How Spectrum Connect Works</h1>
        <p>From first match to final payment — a clear, transparent journey designed to make creative collaboration simple, fair, and successful.</p>
      </section>

      <div className="flow-intro">
        <h2>The Flow from A to Z</h2>
        <p>Every successful collaboration follows five simple stages. Here's how yours will work — with trust and fairness built into every step.</p>
      </div>

      <div className="flow-steps">
        <Step tile="tile-blue" icon="Search" title="Smart Discovery"
          desc="Our intelligent matching analyzes your project needs, work style, and goals to surface the people best suited to bring your vision to life."
          bullets={['AI-driven skill and style matching','Filtered results by availability','Compatibility scoring for every match']}
          mockBg="mock-bg-blue" mock={<MockDiscovery/>}/>
        <Connector/>
        <Step tile="tile-green" icon="Verify" title="Verified Trust" reverse
          desc="Every creator and client on Spectrum Connect is verified. Identity checks, portfolio reviews, and track records make trust the baseline, not the exception."
          bullets={['Identity + portfolio verification','Transparent track record','Real reviews from real projects']}
          mockBg="mock-bg-green" mock={<MockTrust/>}/>
        <Connector/>
        <Step tile="tile-purple" icon="Users" title="Team Building"
          desc="Assemble full creative teams — not just individuals. Mix and match specialists into a cohesive crew, or join an existing team that needs your skills."
          bullets={['Curated multi-role teams','Clear roles and responsibilities','Full team chat and coordination']}
          mockBg="mock-bg-purple" mock={<MockTeam/>}/>
        <Connector/>
        <Step tile="tile-cyan" icon="Chat" title="Collaborate in One Place" reverse
          desc="Chat, task management, file sharing, milestone tracking, invoicing — every tool you need is built in, so your work stays in flow, not in tabs."
          bullets={['Integrated messaging and video','Milestones + task tracking','Secure file sharing and approvals']}
          mockBg="mock-bg-blue" mock={<MockCollab/>}/>
        <Connector/>
        <Step tile="tile-orange" icon="Scale" title="Fair & Transparent Completion"
          desc="Finish strong. Funds are released on agreed milestones, fees are visible upfront, and both sides leave reviews to strengthen the community."
          bullets={['Milestone-based escrow payments','Transparent fees, no surprises','Two-way reviews for everyone']}
          mockBg="mock-bg-orange" mock={<MockFair/>}/>
      </div>

      <section className="flow-diff">
        <h2>Why This Flow Is Different</h2>
        <div className="sub">Most marketplaces optimize for transactions. We optimize for trust, fairness, and long-term relationships.</div>
        <div className="diff-grid">
          <div className="diff-card">
            <div className="ic tile-blue"><Ic.Users/></div>
            <h4>Built for teams</h4>
            <p>Hire crews, not solos. Bring together multi-skill teams in one workflow instead of stitching freelancers across tools.</p>
          </div>
          <div className="diff-card">
            <div className="ic tile-blue"><Ic.Scale/></div>
            <h4>Fair distribution</h4>
            <p>Our matching gives skilled creators at every level a real shot — not just the top 1% hoarding every opportunity.</p>
          </div>
          <div className="diff-card">
            <div className="ic tile-blue"><Ic.Star/></div>
            <h4>Quality-first feedback</h4>
            <p>Two-way reviews, verified outcomes, and clear accountability build a community where good work rises to the top.</p>
          </div>
        </div>
      </section>

      <PricingStrip/>

      <section className="flow-final">
        <h2>Ready to Experience the Flow?</h2>
        <p>Join thousands of creators and clients already collaborating on Spectrum Connect. Your next great project starts here.</p>
        <div className="btns">
          <Link href="/signup" className="btn btn-white btn-lg">Get Started Free</Link>
          <Link href="#" className="btn btn-ghost-light btn-lg">See the Journey</Link>
        </div>
      </section>
      <Footer/>
    </div>
  );
}
