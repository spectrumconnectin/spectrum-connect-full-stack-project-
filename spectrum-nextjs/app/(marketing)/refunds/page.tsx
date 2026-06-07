import LegalPage from '@/components/LegalPage';

export const metadata = {
  title: 'Refund Policy — Spectrum Connect',
  description: 'When and how Spectrum Connect issues refunds for milestones, projects, and platform fees.',
};

export default function RefundsPage() {
  return (
    <LegalPage
      title="Refund Policy"
      lastUpdated="May 31, 2026"
      effectiveDate="May 31, 2026"
      highlightColor="green"
      tldr={
        <>
          <strong>The short version.</strong> Money you put into escrow but never released is
          fully refundable. Money you&apos;ve already released is only refundable through the
          dispute process. Platform fees are refunded in the same proportion as the underlying
          payment. We aim to settle every refund within 10 business days.
        </>
      }
    >
      <h2>1. How money moves on Spectrum Connect</h2>
      <p>
        When a client funds a milestone, the money sits in our escrow account, not the
        creator&apos;s account. Funds release to the creator only when the client clicks
        &ldquo;Release&rdquo;, or when our dispute team directs us to release them. This is
        the foundation of how refunds work, so it&apos;s worth understanding.
      </p>

      <h2>2. Refunds before release</h2>
      <p>
        If a milestone is funded but not yet released, the client can cancel and get a full
        refund as long as the creator hasn&apos;t yet started work. &ldquo;Started work&rdquo;
        is judged in good faith, usually by whether there&apos;s a delivery, an upload, or a
        documented message confirming kickoff.
      </p>
      <p>
        Once the creator has clearly started, cancellation moves into the dispute flow so both
        sides can present what was done and what wasn&apos;t. Most cases close in a few days
        with either a partial refund, a full refund, or a release to the creator.
      </p>

      <h2>3. Refunds after release</h2>
      <p>
        Released funds are presumed to belong to the creator. To get any of that money back,
        the client needs to open a dispute. Disputes can be filed within <strong>30 days of
        the milestone release</strong> or, if the whole project hasn&apos;t closed yet,
        whichever is longer. After 30 days the milestone is final.
      </p>
      <p>
        Our dispute team reviews the evidence and decides. Possible outcomes:
      </p>
      <ul>
        <li>Full refund to the client.</li>
        <li>Partial refund split between the parties.</li>
        <li>No refund (work delivered matches what was agreed).</li>
        <li>Release the disputed amount to the creator after agreed corrections.</li>
      </ul>

      <h2>4. Platform fees in a refund</h2>
      <p>
        When we refund a payment, we reverse the proportion of platform fee tied to it. If a
        $500 milestone is fully refunded, the $40 creator-side fee and the $20 client-side
        fee come back too. On partial refunds the fee reversal is scaled to the refund
        ratio. We never &ldquo;keep&rdquo; the platform fee on money that&apos;s been clawed
        back from the creator.
      </p>
      <p>
        Payment-processing fees (the percentage Stripe or another partner takes for handling
        the charge) are passed through to you only when the underlying processor refunds them
        to us. Most of the time they do. For very small disputes, that fee may be deducted
        from the refunded amount, but we&apos;ll always tell you up front when that applies.
      </p>

      <h2>5. Subscription and add-on refunds</h2>
      <p>
        Spectrum Connect doesn&apos;t currently sell subscriptions. If we add a paid tier in
        the future, the renewal cycle and refund window for it will be spelled out at the
        point of purchase and added to this page.
      </p>
      <p>
        One-off add-ons (profile boosts, featured placements) are refundable within 24 hours
        of purchase if the boost hasn&apos;t started running, and non-refundable after that
        since the impressions can&apos;t be returned.
      </p>

      <h2>6. ETF Points and cash-out</h2>
      <p>
        ETF Points earned from genuine activity can&apos;t be reversed by a refund. If we
        refund the underlying milestone, we may claw back the points awarded for it (this
        protects against farming refunds for free points). Cash-outs of ETF Points are subject
        to the eligibility checks in the ETF Framework, and once a cash-out has been paid out
        it&apos;s not reversible except through a fraud claim.
      </p>

      <h2>7. Chargebacks</h2>
      <p>
        If you raise a chargeback with your card issuer instead of using our dispute flow, we
        treat it as a notice that something went wrong. We&apos;ll temporarily freeze the
        related escrow balance and try to talk to both sides. If you win the chargeback, the
        funds go back to you and we reverse fees as above. If you lose, the chargeback amount
        plus the issuer&apos;s reversal fee may be passed back to you.
      </p>
      <p>
        Chargebacks for projects you accepted in full are considered abuse and can lead to
        account suspension. Talk to us first; almost everything is fixable through the
        in-product flow.
      </p>

      <h2>8. Timing</h2>
      <p>
        We aim to:
      </p>
      <ul>
        <li>Acknowledge a refund or dispute request within 1 business day.</li>
        <li>Issue a decision on undisputed cancellations within 3 business days.</li>
        <li>Resolve standard disputes within 10 business days.</li>
        <li>Push refunded money back to the original payment method within 2 business days of the decision. Banks then take 5 to 10 days to land the funds depending on the country.</li>
      </ul>

      <h2>9. When we won&apos;t refund</h2>
      <p>
        A few situations where a refund isn&apos;t available:
      </p>
      <ul>
        <li>The deliverable matches what was agreed and the client just changed their mind after release.</li>
        <li>The client and creator moved payment off-platform and now want our dispute team to step in.</li>
        <li>The work is rejected only because the brief was ambiguous; in those cases we encourage a revision round instead of a clawback.</li>
        <li>The dispute is filed after the 30-day window above.</li>
      </ul>

      <h2>10. Your statutory rights</h2>
      <p>
        Nothing in this policy takes away rights you have under consumer-protection law in your
        country. If your local law gives you a longer cooling-off period or stronger refund
        rights than this policy, those rights apply.
      </p>

      <h2>11. How to start a refund</h2>
      <p>
        Easiest path: open the milestone in the product and click &ldquo;Request refund&rdquo;
        or &ldquo;Open dispute&rdquo;. Both buttons start the same workflow and put your case
        in front of our team. If you can&apos;t access the product or your account is locked,
        email{' '}
        <a href="mailto:team.spectrumstudios@gmail.com">team.spectrumstudios@gmail.com</a>{' '}
        with the project ID and a short explanation.
      </p>
    </LegalPage>
  );
}
