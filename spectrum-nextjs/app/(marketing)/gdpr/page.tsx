import LegalPage from '@/components/LegalPage';

export const metadata = {
  title: 'GDPR & Data Rights — Spectrum Connect',
  description: 'Your rights over your personal data under GDPR, UK GDPR, and similar laws — and how to exercise them on Spectrum Connect.',
};

export default function GdprPage() {
  return (
    <LegalPage
      title="GDPR & Data Rights"
      lastUpdated="May 31, 2026"
      effectiveDate="May 31, 2026"
      highlightColor="blue"
      tldr={
        <>
          <strong>The short version.</strong> If you live in the EU, UK, EEA, or anywhere that
          gives you data-protection rights, you can ask us for a copy of your data, ask us to
          correct it, ask us to delete it, or tell us to stop using it for certain things.
          Most of this is one click from your settings page. If something doesn&apos;t fit in
          the product, email{' '}
          <a href="mailto:team.spectrumstudios@gmail.com">team.spectrumstudios@gmail.com</a>{' '}
          and we&apos;ll handle the rest within 30 days.
        </>
      }
    >
      <h2>1. Who this applies to</h2>
      <p>
        This page describes how we honour rights that come from the EU General Data Protection
        Regulation (GDPR), the UK GDPR, the EEA equivalents, and similar comprehensive
        privacy laws such as the California Consumer Privacy Act (CCPA/CPRA), Brazil&apos;s
        LGPD, and Canada&apos;s PIPEDA.
      </p>
      <p>
        We aim to give every user the same set of rights regardless of where you live, on the
        theory that if a right is good enough for an EU resident it&apos;s good enough for a
        Sri Lankan one. The list below applies to everyone with a Spectrum Connect account.
      </p>

      <h2>2. The rights you have</h2>
      <h3>Right to be informed</h3>
      <p>
        You can read what we collect and why in our{' '}
        <a href="/privacy">Privacy Policy</a>. The short answer: we collect what we need to
        run the platform, hold escrow, fight fraud, and meet our own legal obligations.
      </p>

      <h3>Right of access</h3>
      <p>
        You can ask for a copy of the personal data we hold about you. The fastest way is the
        &ldquo;Download my data&rdquo; button in your account settings. It produces a JSON or
        CSV export. If you need a different format or there&apos;s data you can&apos;t see in
        the export, email <a href="mailto:team.spectrumstudios@gmail.com">team.spectrumstudios@gmail.com</a>.
      </p>

      <h3>Right to rectification</h3>
      <p>
        Anything you can edit yourself (name, bio, location, portfolio links, profile photo)
        is on your profile page. For things you can&apos;t edit yourself (a wrong field on a
        completed transaction, a misspelled name on a verification record), email us.
      </p>

      <h3>Right to erasure (&ldquo;right to be forgotten&rdquo;)</h3>
      <p>
        You can close your account from settings. Most of your data goes within 30 days. The
        exceptions are the ones we have to keep by law (transaction and tax records for up
        to 7 years; banned-account audit trails for repeat-offender prevention). When that
        retention clock runs out, the rest is deleted automatically.
      </p>
      <p>
        If you want a stricter, faster deletion than the default flow allows, email us. We
        will tell you exactly what we can erase, what we have to keep, and the legal basis for
        each piece we keep.
      </p>

      <h3>Right to restrict processing</h3>
      <p>
        While we&apos;re working through a complaint or a correction request, you can ask us
        to stop using the contested data for anything except storage. We&apos;ll do that and
        keep the data &ldquo;parked&rdquo; until the issue is resolved.
      </p>

      <h3>Right to data portability</h3>
      <p>
        The export described under &ldquo;access&rdquo; above is also our portability export.
        It&apos;s structured, commonly used, and machine readable, so you can move it to a
        competing service if you want.
      </p>

      <h3>Right to object</h3>
      <p>
        You can object to any processing we do based on legitimate interest. The most common
        version of this is: &ldquo;please stop using my data for analytics or product
        improvement&rdquo;. Toggle the relevant switch in your privacy settings, or tell us
        and we&apos;ll do it manually.
      </p>

      <h3>Rights related to automated decisions</h3>
      <p>
        Spectrum Connect uses some automated systems (Smart Connect ranking, ETF Points
        calculation, basic fraud screens). None of them produces a decision that has a legal
        or similarly significant effect on you without a human in the loop. You can ask for a
        human review of any automated outcome that affects your account, and we&apos;ll do it
        within 14 days.
      </p>

      <h3>Right to withdraw consent</h3>
      <p>
        Where we rely on your consent (marketing email, non-essential cookies, featured
        collections), you can withdraw it at any time without affecting the rest of your
        account. The cookie banner and your email preferences both have a clear off switch.
      </p>

      <h3>Right to complain</h3>
      <p>
        If you think we&apos;re mishandling your data, please tell us first and give us a
        chance to fix it. You can also complain to your national data protection authority.
        EU/EEA residents can find theirs at{' '}
        <a href="https://edpb.europa.eu/about-edpb/about-edpb/members_en" target="_blank" rel="noreferrer noopener">edpb.europa.eu/members</a>.
        UK residents can reach the ICO at{' '}
        <a href="https://ico.org.uk/" target="_blank" rel="noreferrer noopener">ico.org.uk</a>.
      </p>

      <h2>3. How long we take</h2>
      <p>
        We respond to most data-rights requests within 30 days, faster for the simple ones.
        For complex requests (large exports, requests covering multiple jurisdictions) we may
        extend by up to 60 days; we&apos;ll tell you why if that happens.
      </p>
      <p>
        We don&apos;t charge for any of this unless the request is &ldquo;manifestly
        unfounded or excessive&rdquo;, which is GDPR-speak for &ldquo;the tenth time you&apos;ve
        asked for the same export this month&rdquo;.
      </p>

      <h2>4. Verifying it&apos;s really you</h2>
      <p>
        We have to be sure a data request is genuinely from the account holder before we act.
        Most of the time, sending the request from the email address on file is enough. For
        sensitive operations (account closure, large exports), we may also send a confirmation
        link to your registered email or ask for two-factor verification.
      </p>

      <h2>5. International transfers</h2>
      <p>
        We&apos;re a US company with infrastructure in India. We use the European
        Commission&apos;s Standard Contractual Clauses and equivalent UK mechanisms to make
        cross-border transfers lawful. If you&apos;d like a copy of the SCCs, email{' '}
        <a href="mailto:team.spectrumstudios@gmail.com">team.spectrumstudios@gmail.com</a>.
      </p>

      <h2>6. Our Data Protection Officer</h2>
      <p>
        We&apos;re not legally required to appoint a DPO, but the role is filled informally by
        our Head of Legal. You can reach them at the privacy address above.
      </p>

      <h2>7. EU representative</h2>
      <p>
        If we&apos;re required to appoint an Article 27 representative under GDPR, that
        appointment will be published here.
      </p>

      <h2>8. Contact summary</h2>
      <p>
        For any data-rights request:{' '}
        <a href="mailto:team.spectrumstudios@gmail.com">team.spectrumstudios@gmail.com</a>.<br />
        For a security or breach disclosure:{' '}
        <a href="mailto:team.spectrumstudios@gmail.com">team.spectrumstudios@gmail.com</a>.
      </p>
    </LegalPage>
  );
}
