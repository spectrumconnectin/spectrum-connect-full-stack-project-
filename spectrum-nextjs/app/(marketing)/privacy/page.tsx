import LegalPage from '@/components/LegalPage';

export const metadata = {
  title: 'Privacy Policy — Spectrum Connect',
  description: 'How Spectrum Connect collects, uses, and protects your personal data.',
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="May 31, 2026"
      effectiveDate="May 31, 2026"
      highlightColor="blue"
      tldr={
        <>
          <strong>The short version.</strong> We collect what we need to run the platform and
          to keep it safe. We don&apos;t sell your data, ever. You can read your data, export
          it, or ask us to delete it from the settings page.
        </>
      }
    >
      <h2>1. Who&apos;s responsible for your data</h2>
      <p>
        Spectrum Connect, Inc. is the &ldquo;controller&rdquo; of your personal data for the
        purposes of GDPR, UK GDPR, and similar laws. We&apos;re based at 340 Pine Street, Suite
        800, San Francisco, CA 94104, USA. If you&apos;d rather talk to someone specifically
        about data protection, our Data Protection contact is{' '}
        <a href="mailto:team.spectrumstudios@gmail.com">team.spectrumstudios@gmail.com</a>.
      </p>

      <h2>2. What we collect</h2>
      <p>Three buckets, roughly:</p>
      <h3>What you give us</h3>
      <ul>
        <li>Account basics: name, email, password (we never store this in plain text), and the username you pick.</li>
        <li>Profile content: bio, location, skills, portfolio links, profile photo, hourly rate, work history.</li>
        <li>Identity and payment: phone number, ID documents you upload for verification, and the billing or payout details our payment processors need.</li>
        <li>Communications: messages you send to other users, proposals, project briefs, deliverables, and any support tickets.</li>
      </ul>
      <h3>What we collect from using the product</h3>
      <ul>
        <li>Activity: projects you post or apply to, milestones, reviews, ETF Points events.</li>
        <li>Device and network: IP address, browser type, operating system, screen size, timezone, and language.</li>
        <li>Logs: which pages you loaded and when, what API calls your client made, what errors fired.</li>
      </ul>
      <h3>What we get from third parties</h3>
      <ul>
        <li>If you sign in with Google, we get the email address and basic profile data Google shares with us. Same for any other social login we add later.</li>
        <li>Payment processors (Stripe and similar) tell us whether a charge succeeded or failed, plus risk signals to fight fraud, but we don&apos;t see full card numbers.</li>
      </ul>

      <h2>3. Why we collect it (legal bases for EU/UK users)</h2>
      <p>If you&apos;re in the EU, UK, or EEA, here&apos;s the legal basis we rely on for each kind of processing:</p>
      <ul>
        <li><strong>Contract</strong> — running your account, processing payments, delivering the features you signed up for.</li>
        <li><strong>Legitimate interest</strong> — keeping the Platform secure, preventing fraud, improving the product, analytics on aggregate usage.</li>
        <li><strong>Consent</strong> — non-essential cookies, marketing emails, sharing your work in featured collections.</li>
        <li><strong>Legal obligation</strong> — tax, accounting, anti-money-laundering and sanctions checks, responding to court orders.</li>
      </ul>
      <p>You can withdraw any consent at any time. See section 8 for how.</p>

      <h2>4. How we use it</h2>
      <p>
        To match creators with projects (Smart Connect uses your skills, history, and ETF level
        as ranking inputs). To process payments and hold funds in escrow. To surface trust
        signals other users see when deciding to work with you. To answer your support
        questions. To investigate complaints and disputes. To build better features (we look at
        what people actually use and where they get stuck). To meet our own legal obligations.
      </p>
      <p>
        We do <strong>not</strong> sell your personal data, full stop. We don&apos;t use your
        messages or project content to train large language models. If we ever wanted to do
        either of those things, we&apos;d ask for separate, explicit consent and we&apos;d let
        you say no without breaking your account.
      </p>

      <h2>5. Who we share it with</h2>
      <p>We share data with the following kinds of recipients, only for the purposes described:</p>
      <ul>
        <li>
          <strong>Other users</strong>, when you choose to be visible to them. Your profile,
          portfolio, and trust signals are visible to clients reviewing proposals; your name
          and avatar show up in conversation threads.
        </li>
        <li>
          <strong>Payment processors</strong> like Stripe, who handle card data, escrow holding
          accounts, and payouts. Their privacy notices govern what they do with that data.
        </li>
        <li>
          <strong>Cloud infrastructure providers</strong> who host our servers and databases
          (AWS in the Mumbai region, plus MongoDB Atlas). They&apos;re under contractual data
          protection obligations.
        </li>
        <li>
          <strong>Communication tools</strong> for transactional email (currently Brevo) and
          customer support.
        </li>
        <li>
          <strong>Analytics</strong>, in aggregated or anonymised form only. We don&apos;t hand
          identifiable user data to ad networks.
        </li>
        <li>
          <strong>Law enforcement and courts</strong>, when we receive a valid legal demand. We
          push back on overbroad requests and tell you about it where the law allows.
        </li>
        <li>
          <strong>A successor company</strong> if Spectrum Connect is ever acquired or merged.
          You&apos;d be told before that transfer takes effect.
        </li>
      </ul>

      <h2>6. International transfers</h2>
      <p>
        Spectrum Connect is a US company with infrastructure in India (ap-south-1). If you
        upload data from the EU, UK, or anywhere else, that data may travel to the US or
        India for processing. We rely on the European Commission&apos;s Standard Contractual
        Clauses and similar mechanisms to make those transfers lawful, and we apply the
        protections in this policy regardless of where the data ends up sitting.
      </p>

      <h2>7. How long we keep it</h2>
      <p>
        While your account is open, we keep your data so the Platform works. When you close
        your account:
      </p>
      <ul>
        <li>Most of your profile data is deleted within 30 days.</li>
        <li>Things tied to financial records (transactions, tax forms, invoices) are kept for up to 7 years to satisfy tax and anti-fraud law.</li>
        <li>Audit logs of suspended or banned accounts may be kept longer for repeat-offender prevention.</li>
        <li>Encrypted backups roll off on a 90-day cycle.</li>
      </ul>
      <p>
        If you want everything gone faster than this schedule allows, ask us and we&apos;ll
        tell you exactly what we can and can&apos;t delete, and why.
      </p>

      <h2>8. Your rights</h2>
      <p>Depending on where you live, you have some or all of the following rights. EU/UK/EEA users have all of them. California users have most of them under the CCPA/CPRA.</p>
      <ul>
        <li><strong>Access</strong> the data we hold about you.</li>
        <li><strong>Correct</strong> data that&apos;s inaccurate.</li>
        <li><strong>Delete</strong> your data (subject to the legal-retention bits above).</li>
        <li><strong>Export</strong> your data in a portable format.</li>
        <li><strong>Object</strong> to processing based on legitimate interest.</li>
        <li><strong>Restrict</strong> processing while we work out a dispute.</li>
        <li><strong>Withdraw consent</strong> for anything based on consent (marketing emails, non-essential cookies).</li>
        <li><strong>Complain</strong> to your local data protection authority. EU/UK users can lodge a complaint with their national regulator. We&apos;d like the chance to fix it first, but you don&apos;t have to ask us first.</li>
      </ul>
      <p>
        To exercise any of these rights, email{' '}
        <a href="mailto:team.spectrumstudios@gmail.com">team.spectrumstudios@gmail.com</a> from the
        address linked to your account, or use the in-product Data Rights tools (see our{' '}
        <a href="/gdpr">GDPR &amp; Data Rights</a> page). We respond within 30 days, faster
        when we can.
      </p>

      <h2>9. How we protect your data</h2>
      <p>
        TLS for all traffic between your browser and our servers. AES-256 at rest for sensitive
        data. Access to production systems is on a need-to-know basis with logging. Passwords
        are hashed with bcrypt. We run regular dependency scans, security reviews, and we
        publish a responsible-disclosure address at{' '}
        <a href="mailto:team.spectrumstudios@gmail.com">team.spectrumstudios@gmail.com</a> for
        researchers.
      </p>
      <p>
        No system is bulletproof. If we have a breach affecting your data we&apos;ll notify you
        and (where required) the regulator within the timeframes the law sets, including the 72
        hours required by GDPR.
      </p>

      <h2>10. Cookies and similar tech</h2>
      <p>
        We use a small set of cookies. Essential ones keep you logged in and keep the site
        working. Optional ones help us understand how people use the product. There&apos;s a
        consent banner at the bottom of the screen the first time you visit, and you can change
        your choices any time at <a href="/cookies">/cookies</a>.
      </p>

      <h2>11. Children</h2>
      <p>
        Spectrum Connect is for adults (18+). We don&apos;t knowingly collect data from
        children under 18. If you&apos;re a parent or guardian who&apos;s found an account that
        you think belongs to a minor, please email us and we&apos;ll close it and delete
        the data.
      </p>

      <h2>12. Changes to this policy</h2>
      <p>
        We&apos;ll post any material change here at least 14 days before it takes effect, and
        we&apos;ll email you if the change affects your rights or our use of your data. Small
        clarifications might land without notice, but we date this page so you can see when it
        moved.
      </p>

      <h2>13. Contact</h2>
      <p>
        For privacy questions: <a href="mailto:team.spectrumstudios@gmail.com">team.spectrumstudios@gmail.com</a>.<br />
        For everything else: <a href="mailto:team.spectrumstudios@gmail.com">team.spectrumstudios@gmail.com</a>.<br />
        By post: Spectrum Connect, Inc., Data Privacy Officer, 340 Pine Street, Suite 800, San
        Francisco, CA 94104, USA.
      </p>
    </LegalPage>
  );
}
