import LegalPage from '@/components/LegalPage';

export const metadata = {
  title: 'Terms of Service — Spectrum Connect',
  description: 'The agreement between you and Spectrum Connect when you use our platform.',
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      lastUpdated="May 31, 2026"
      effectiveDate="May 31, 2026"
      highlightColor="amber"
      tldr={
        <>
          <strong>The short version.</strong> Use Spectrum Connect honestly. Pay and get paid
          through the platform. Treat the people you work with like real humans. If we have to
          tell you off, we&apos;ll try to tell you why. The whole agreement is below.
        </>
      }
    >
      <h2>1. Who this agreement is between</h2>
      <p>
        These Terms are a contract between you and Spectrum Connect, Inc., a Delaware corporation
        with its principal place of business in San Francisco, California (&ldquo;Spectrum
        Connect&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). They cover your use of
        spectrumconnect.co, our APIs, and anything else we offer that links to these Terms (the
        &ldquo;Platform&rdquo;).
      </p>
      <p>
        By creating an account, clicking &ldquo;I agree&rdquo;, or just using the Platform, you
        accept these Terms and the policies they link to. If you don&apos;t agree with any
        of them, please don&apos;t use the Platform.
      </p>

      <h2>2. Who can sign up</h2>
      <p>You can use Spectrum Connect if all of the following are true:</p>
      <ul>
        <li>You&apos;re at least 18 years old, or the legal age of majority where you live, whichever is older.</li>
        <li>You have the legal capacity to enter into a binding contract.</li>
        <li>Nothing in your local law prevents you from using a service like ours.</li>
        <li>You aren&apos;t on a US sanctions list or located in a sanctioned country.</li>
      </ul>
      <p>
        If you&apos;re signing up on behalf of a company, you also confirm that you have authority
        to bind that company to these Terms, and &ldquo;you&rdquo; in this document means both you
        and the company.
      </p>

      <h2>3. Your account</h2>
      <p>
        Your account is yours. You&apos;re responsible for keeping your password secret, for any
        activity that happens under your login, and for telling us right away if you think
        someone else has gotten in. We strongly recommend turning on two-factor authentication
        once it&apos;s available in your account settings.
      </p>
      <p>
        One person, one account on each side. You can have one creator account and one client
        account, and you can run both from the same login. Creating multiple accounts to game
        reviews, dodge a suspension, or earn extra ETF Points is grounds for losing all of them.
      </p>

      <h2>4. What Spectrum Connect actually does</h2>
      <p>
        We run a marketplace. We help creators and clients find each other, agree on a price,
        track milestones, hold funds in escrow, and resolve disputes if something goes wrong. We
        also run a trust system (Spectrum ID, ETF Points) and a matching engine (Smart Connect).
      </p>
      <p>
        We are <strong>not</strong> a party to any contract for services between you and the
        people you work with. That contract is between the two of you. We&apos;re not your
        employer, your agent, or your union, and we don&apos;t guarantee any particular outcome
        for a project. What we do is make the surface area safer to work on.
      </p>

      <h2>5. Fees, escrow and payouts</h2>
      <p>
        The platform fee is 12% on completed work, split as 8% from the creator and 4% from the
        client. On projects under $20 the total fee is capped at $2 and split in the same 2:1
        ratio. These rates are versioned in your transaction history so a future change
        won&apos;t retroactively rewrite anything you&apos;ve already done.
      </p>
      <p>
        When a client funds a milestone, the money sits in escrow with us, not with the creator.
        Funds release only when the client approves the milestone or our dispute process
        directs us to release them. Clients have five business days to either approve a
        delivered milestone or open a dispute. If neither happens, we may release the funds
        automatically; this isn&apos;t a free hand for creators to deliver junk, it&apos;s a
        backstop against unresponsive clients.
      </p>
      <p>
        Payouts are made through our payment partners. You&apos;re responsible for any taxes on
        money you earn through the Platform, including income tax, sales tax, VAT, or
        equivalent. We&apos;ll provide whatever reports are useful, but we can&apos;t file your
        return for you.
      </p>

      <h2>6. Going around the platform</h2>
      <p>
        Don&apos;t do it. If two people meet through Spectrum Connect, the work, the payment,
        and the dispute resolution all stay on Spectrum Connect for at least the first 24
        months after introduction. Taking the relationship off-platform to dodge fees is the
        single fastest way to lose your account, and our payments and trust systems can&apos;t
        protect you once you leave.
      </p>
      <p>
        If you genuinely want to hire someone you met here as a full-time employee,
        we&apos;re happy to talk about a conversion fee instead of fighting about it. Email{' '}
        <a href="mailto:legal@spectrumconnect.co">legal@spectrumconnect.co</a>.
      </p>

      <h2>7. Content and intellectual property</h2>
      <p>
        You keep ownership of whatever you upload (portfolio work, profile content,
        deliverables, messages, reviews). By posting it on the Platform you give us a
        non-exclusive, worldwide, royalty-free licence to host it, display it where the
        Platform requires, and use it to operate, secure and improve the service. That licence
        ends when you delete the content, except for backups which expire on the schedule in
        our Privacy Policy.
      </p>
      <p>
        For paid work specifically: once a client has fully paid for a deliverable, all
        intellectual property in that deliverable transfers to the client unless the two of
        you agreed otherwise in writing. Creators may still display the work in their portfolio
        unless the client asked for confidentiality up front.
      </p>
      <p>
        If you think someone has uploaded content that infringes your copyright, follow the
        process in our <a href="/dmca">DMCA Policy</a>.
      </p>

      <h2>8. What you may not do</h2>
      <p>The detailed list lives in our <a href="/acceptable-use">Acceptable Use Policy</a>.
        The short version: no fraud, no harassment, no illegal content, no scraping or
        reverse-engineering the Platform, no spam, and no payments outside Spectrum Connect for
        introductions made on Spectrum Connect.</p>

      <h2>9. Reviews and reputation</h2>
      <p>
        Reviews on Spectrum Connect must reflect real, paid projects. You can&apos;t buy
        reviews, trade reviews, ask friends to leave reviews, or threaten anyone with a
        retaliatory review. We remove reviews that violate this policy, and we may remove
        accounts that try to game the system more than once.
      </p>

      <h2>10. Disputes between you and the people you work with</h2>
      <p>
        If something goes wrong on a project, the fastest path is the in-product dispute
        button. Either party can open a dispute within 30 days of a milestone delivery or
        within 60 days of project completion. Our dispute team reviews the evidence both sides
        upload and makes a written decision. That decision is final inside the Platform, which
        means we won&apos;t reopen the same dispute under the same facts. It doesn&apos;t
        replace any consumer protection rights you may have under your local law.
      </p>

      <h2>11. Disclaimer of warranties</h2>
      <p>
        The Platform is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the
        maximum extent the law allows, we disclaim all warranties, express or implied,
        including merchantability, fitness for a particular purpose, and non-infringement. We
        don&apos;t promise the Platform will be uninterrupted or error-free, or that any
        particular creator or client will deliver what you hoped for.
      </p>

      <h2>12. Limitation of liability</h2>
      <p>
        To the maximum extent the law allows, Spectrum Connect won&apos;t be liable for any
        indirect, incidental, special, consequential or punitive damages, or for lost profits,
        lost data, or lost goodwill. Our total liability to you for any claim relating to the
        Platform is capped at the greater of: (a) the platform fees you paid us in the 12
        months before the claim arose, or (b) US$100.
      </p>
      <p>
        Some jurisdictions don&apos;t allow these limits. In that case the limits apply to the
        fullest extent the law lets us apply them, and we keep the rest of these Terms in force.
      </p>

      <h2>13. Indemnification</h2>
      <p>
        You agree to defend and indemnify Spectrum Connect (and our officers, employees, and
        contractors) against third-party claims that come out of your use of the Platform, your
        content, or your breach of these Terms. We&apos;ll let you know promptly about any
        claim and let you control the defence, but we get to participate at our own expense.
      </p>

      <h2>14. Changes to the Terms</h2>
      <p>
        We&apos;ll update these Terms when the Platform changes or when our lawyers ask us to.
        If a change materially affects your rights, we&apos;ll email you at least 14 days
        before it takes effect, and we&apos;ll post a notice in the product. If you keep using
        the Platform after the new version is in force, that counts as agreement. If you
        don&apos;t agree, your option is to close your account before the effective date.
      </p>

      <h2>15. Closing your account</h2>
      <p>
        You can close your account from your settings page at any time. Any funds in escrow at
        the time of closure are either resolved through the normal dispute process or, if
        nothing is contested, paid out per the existing milestone agreements. Obligations that
        accrued before you closed (especially payment obligations) survive closure. So do
        sections of these Terms that, by their nature, should keep going after the relationship
        ends.
      </p>
      <p>
        We can suspend or close your account if you&apos;ve broken these Terms, if a payment
        provider tells us to, or if we&apos;re required to by law. If the suspension is for
        something you can fix, we&apos;ll tell you what it is and give you a reasonable chance
        to fix it before going further.
      </p>

      <h2>16. Governing law and where disputes get heard</h2>
      <p>
        These Terms are governed by the laws of the State of Delaware, USA, without regard to
        its conflict-of-laws rules. Any dispute that isn&apos;t resolved through the
        in-product process goes to the state or federal courts located in New Castle County,
        Delaware, and you consent to personal jurisdiction there. If your local law gives you
        mandatory consumer rights that override this clause, those rights still apply; this
        section just sets the default forum.
      </p>

      <h2>17. Miscellaneous</h2>
      <p>
        These Terms, together with the Privacy Policy, Cookie Policy, Acceptable Use Policy,
        DMCA Policy and Refund Policy, are the entire agreement between us. If a court finds
        any part unenforceable, the rest stays in force. Our not enforcing a provision once
        doesn&apos;t mean we&apos;ve given up the right to enforce it later. You can&apos;t
        assign these Terms without our written consent; we can assign them to an affiliate or
        in connection with a merger or sale of the business.
      </p>

      <h2>18. How to reach us</h2>
      <p>
        For legal questions: <a href="mailto:legal@spectrumconnect.co">legal@spectrumconnect.co</a>.<br />
        For everything else: <a href="mailto:support@spectrumconnect.co">support@spectrumconnect.co</a>.<br />
        By post: Spectrum Connect, Inc., Legal Department, 340 Pine Street, Suite 800, San
        Francisco, CA 94104, USA.
      </p>

      <div className="callout">
        <em>
          We&apos;re not your lawyer and these Terms aren&apos;t legal advice for your own
          business. If you&apos;re using Spectrum Connect for serious commercial work, please
          have your own counsel look at them.
        </em>
      </div>
    </LegalPage>
  );
}
