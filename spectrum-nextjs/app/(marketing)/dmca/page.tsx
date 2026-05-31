import LegalPage from '@/components/LegalPage';

export const metadata = {
  title: 'DMCA & Copyright Policy — Spectrum Connect',
  description: 'How to report copyright infringement on Spectrum Connect and what happens next.',
};

export default function DmcaPage() {
  return (
    <LegalPage
      title="DMCA & Copyright Policy"
      lastUpdated="May 31, 2026"
      effectiveDate="May 31, 2026"
      highlightColor="rose"
      tldr={
        <>
          <strong>The short version.</strong> If you own a copyright and someone has uploaded
          your work to Spectrum Connect without permission, send our designated agent a notice
          with the items below and we&apos;ll take it down quickly. If you think we took down
          your work in error, you can file a counter-notice.
        </>
      }
    >
      <h2>1. We take copyright seriously</h2>
      <p>
        Spectrum Connect is a creator-first platform. We respect the rights of copyright
        owners and we expect every user to do the same. We respond to clear notices of
        infringement and we maintain a repeat-infringer policy as required by the Digital
        Millennium Copyright Act (17 U.S.C. § 512).
      </p>

      <h2>2. Filing a takedown notice (Section 512(c))</h2>
      <p>
        If you are a copyright owner (or someone authorised to act on the owner&apos;s behalf)
        and you believe content on Spectrum Connect infringes your copyright, send a written
        notice to our designated agent that includes <strong>all</strong> of the following:
      </p>
      <ol>
        <li>A physical or electronic signature of the person authorised to act for the copyright owner.</li>
        <li>A description of the copyrighted work that has been infringed.</li>
        <li>The exact URL on Spectrum Connect where the allegedly infringing material appears, specific enough that we can find it. (&ldquo;Somewhere on your website&rdquo; doesn&apos;t cut it.)</li>
        <li>Your name, address, telephone number, and email address.</li>
        <li>
          A statement that you have a good-faith belief that the use of the material in the
          manner complained of is not authorised by the copyright owner, its agent, or the law.
        </li>
        <li>
          A statement, made under penalty of perjury, that the information in your notice is
          accurate and that you are the copyright owner or are authorised to act on the
          owner&apos;s behalf.
        </li>
      </ol>

      <h2>3. Our designated agent</h2>
      <p>
        Notices that don&apos;t reach our designated agent may not get a fast response. Send
        them to:
      </p>
      <div className="callout">
        DMCA Designated Agent<br />
        Spectrum Connect, Inc.<br />
        340 Pine Street, Suite 800<br />
        San Francisco, CA 94104, USA<br />
        Email: <a href="mailto:dmca@spectrumconnect.co">dmca@spectrumconnect.co</a>
      </div>
      <p>
        Email is the fastest channel. The address is monitored on business days. Please put
        &ldquo;DMCA Notice&rdquo; in the subject line.
      </p>

      <h2>4. What happens after we receive your notice</h2>
      <p>
        If the notice is complete and looks reasonable, we&apos;ll:
      </p>
      <ul>
        <li>Take down or disable access to the material, usually within 48 business hours.</li>
        <li>Notify the user who uploaded it and forward your notice.</li>
        <li>Make a note in our records, since repeated infringement leads to account termination.</li>
      </ul>
      <p>
        If your notice is incomplete or looks pretextual, we&apos;ll write back and explain
        what we need. We don&apos;t take down content based on vague or unsupported claims.
      </p>

      <h2>5. Filing a counter-notice (Section 512(g))</h2>
      <p>
        If you uploaded something that got taken down and you believe the takedown was wrong,
        you can send us a counter-notice that includes <strong>all</strong> of the following:
      </p>
      <ol>
        <li>Your physical or electronic signature.</li>
        <li>Identification of the material that was removed and the location where it appeared before removal.</li>
        <li>
          A statement, under penalty of perjury, that you have a good-faith belief the
          material was removed by mistake or misidentification.
        </li>
        <li>Your name, address, telephone number, and email address.</li>
        <li>
          A statement that you consent to the jurisdiction of the federal court in the
          district where your address is located (or, if outside the US, the United States
          District Court for the Northern District of California), and that you will accept
          service of process from the person who filed the original notice or their agent.
        </li>
      </ol>
      <p>
        If we receive a valid counter-notice, we&apos;ll forward it to the original
        complainant. Unless they file a court action within 10 business days, we may restore
        the removed material.
      </p>

      <h2>6. Penalty of perjury</h2>
      <p>
        Filing a false DMCA notice or counter-notice is a federal crime in the US (17 U.S.C.
        § 512(f)) and can also create civil liability for damages and attorneys&apos; fees.
        Don&apos;t use this process to silence criticism, suppress competitive work, or
        intimidate other users. We do look at patterns, and we will push back.
      </p>

      <h2>7. Repeat infringers</h2>
      <p>
        We terminate the accounts of users who are the subject of repeat infringement notices.
        &ldquo;Repeat&rdquo; here doesn&apos;t require a court ruling; multiple valid notices
        against the same account, in our reasonable judgment, is enough.
      </p>

      <h2>8. Trademark, name, and likeness</h2>
      <p>
        This policy covers copyright. For trademark complaints, name-and-likeness issues
        (impersonation, deepfakes), or right-of-publicity claims, email{' '}
        <a href="mailto:legal@spectrumconnect.co">legal@spectrumconnect.co</a> with a similar
        level of detail and we&apos;ll route the request to the right team.
      </p>

      <h2>9. International rights</h2>
      <p>
        While this policy is built around the US DMCA, we also respect equivalent
        notice-and-takedown rights under the EU Digital Services Act and the UK&apos;s
        e-Commerce Regulations. Send your notice to the same address with the equivalent
        elements (identification, authority, good-faith statement, contact details) and
        we&apos;ll act on it.
      </p>
    </LegalPage>
  );
}
