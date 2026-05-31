import LegalPage from '@/components/LegalPage';

export const metadata = {
  title: 'Acceptable Use Policy — Spectrum Connect',
  description: 'What you can and can\'t do on Spectrum Connect, and what happens if you cross the line.',
};

export default function AcceptableUsePage() {
  return (
    <LegalPage
      title="Acceptable Use Policy"
      lastUpdated="May 31, 2026"
      effectiveDate="May 31, 2026"
      highlightColor="rose"
      tldr={
        <>
          <strong>The short version.</strong> Be honest. Be civil. Pay through the platform.
          Don&apos;t use Spectrum Connect to do illegal things, to harass people, or to game
          our trust systems. Break the rules and the consequences scale: a warning, then a
          suspension, then a permanent ban.
        </>
      }
    >
      <h2>1. What this policy is</h2>
      <p>
        This Acceptable Use Policy is the long version of what we promised in our{' '}
        <a href="/terms">Terms of Service</a>. It applies to every part of Spectrum Connect:
        public profiles, private messages, project briefs, deliverables, reviews, support
        tickets, our API, and anything else you touch on the platform.
      </p>

      <h2>2. Don&apos;t do these things</h2>

      <h3>Illegal or harmful</h3>
      <ul>
        <li>Anything that breaks applicable law in the US, the EU, or where you or the other party live.</li>
        <li>Sexual content involving minors. No exceptions, no edge cases. We report this directly to NCMEC and to law enforcement.</li>
        <li>Threats of violence, doxxing, stalking, or organising any of the above against another person.</li>
        <li>Hate speech that targets a person or group for who they are.</li>
        <li>Selling or distributing controlled substances, weapons, or items that need a regulated permit.</li>
        <li>Money laundering, terrorism financing, or sanctions evasion. We screen against the usual lists.</li>
      </ul>

      <h3>Fraud and dishonesty</h3>
      <ul>
        <li>Impersonating another person, company, or Spectrum Connect employee.</li>
        <li>Fake portfolios or résumés. Display your real work and credit collaborators.</li>
        <li>Fake reviews. We can&apos;t stop a few from slipping through, but we will roll them back when we find them and we look hard.</li>
        <li>Buying, selling, or trading reviews, ratings, or ETF Points.</li>
        <li>Creating multiple accounts to dodge a suspension, game search ranking, or harvest extra ETF Points.</li>
        <li>Submitting an AI-generated portfolio piece as your own work without disclosure.</li>
      </ul>

      <h3>Going around the platform</h3>
      <p>
        Once you&apos;ve been introduced to someone through Spectrum Connect, the work, the
        payment, and the dispute resolution belong here for at least the first 24 months.
        That means:
      </p>
      <ul>
        <li>Don&apos;t share PayPal, Venmo, Wise, or bank details inside the platform messaging system before a hire.</li>
        <li>Don&apos;t agree to take a project off-platform &ldquo;to save the fee&rdquo;. (You also lose escrow, dispute support, and ETF.)</li>
        <li>Don&apos;t use Spectrum Connect purely to find leads you then convert into off-platform deals.</li>
      </ul>
      <p>
        If you have a legitimate reason to convert a Spectrum Connect engagement to an
        off-platform one (full-time hire, retainer that needs custom invoicing), email{' '}
        <a href="mailto:legal@spectrumconnect.co">legal@spectrumconnect.co</a>. We almost
        always say yes; we just need to know.
      </p>

      <h3>Abuse of other users</h3>
      <ul>
        <li>Harassment, sustained insults, sexual messages to people who haven&apos;t invited them.</li>
        <li>Retaliating against a reviewer or a dispute participant.</li>
        <li>Sharing private information about another user without their permission.</li>
        <li>Mass-messaging the same template to dozens of profiles a day. Personalise or don&apos;t bother.</li>
      </ul>

      <h3>Abuse of the platform itself</h3>
      <ul>
        <li>Scraping, crawling, or harvesting data from Spectrum Connect except through our public API and within its rate limits.</li>
        <li>Reverse-engineering, decompiling, or attempting to extract source code.</li>
        <li>Probing for security vulnerabilities outside our responsible-disclosure programme. (For the record, the programme is at <a href="mailto:security@spectrumconnect.co">security@spectrumconnect.co</a>; we appreciate ethical reports.)</li>
        <li>Uploading malware, phishing pages, or content designed to compromise other users.</li>
        <li>Stress-testing our rate limits or overloading our infrastructure on purpose.</li>
      </ul>

      <h3>Content rules</h3>
      <ul>
        <li>Don&apos;t upload work that infringes someone else&apos;s copyright, trademark, or other rights. See our <a href="/dmca">DMCA Policy</a> for how owners can report infringement.</li>
        <li>Don&apos;t post personal data of third parties without a legal basis.</li>
        <li>Don&apos;t use the platform to spread misinformation about elections, public health, or other matters where harm is concrete.</li>
        <li>Don&apos;t paste prompts or links designed to manipulate other users&apos; AI assistants, including Miya.</li>
      </ul>

      <h2>3. Project and deliverable rules</h2>
      <p>
        Some things that look unusual but are fine:
      </p>
      <ul>
        <li>Adult content from verified adult creators with clearly opted-in clients, subject to your jurisdiction&apos;s laws.</li>
        <li>Long-running retainers that span multiple projects.</li>
        <li>Friendly, candid private messages between people who&apos;ve already worked together.</li>
      </ul>
      <p>
        Some things that look fine but aren&apos;t:
      </p>
      <ul>
        <li>&ldquo;Hire&rdquo;-then-cancel patterns used to harvest creator&apos;s portfolio in proposals.</li>
        <li>Identical project briefs posted to many creators with no intent to hire.</li>
        <li>Using Spectrum Connect&apos;s name, logo, or trademarks in your own marketing without permission.</li>
      </ul>

      <h2>4. How we enforce this</h2>
      <p>
        We&apos;d rather warn and educate than ban. For first or low-severity issues:
      </p>
      <ul>
        <li>Private warning, with a link to the rule we think you broke.</li>
        <li>Removal of the offending content or review.</li>
      </ul>
      <p>
        For repeated, serious, or obviously bad-faith issues:
      </p>
      <ul>
        <li>Temporary suspension (24 hours to 30 days, depending).</li>
        <li>Loss of trust signals: lowered visibility in Smart Connect, ETF Points clawback if the points were earned from the conduct in question.</li>
        <li>Permanent account closure. Any escrow funds are released according to the dispute process.</li>
      </ul>
      <p>
        For things that look criminal we may freeze the account immediately and refer the
        matter to law enforcement. If your account is suspended you can appeal in writing to{' '}
        <a href="mailto:appeals@spectrumconnect.co">appeals@spectrumconnect.co</a>; we&apos;ll
        respond within 14 days.
      </p>

      <h2>5. Reporting bad behaviour</h2>
      <p>
        Most pages have a small &ldquo;Report&rdquo; control. Use it. Reports come into our
        trust &amp; safety queue and are read by a real person. You can also email{' '}
        <a href="mailto:trust@spectrumconnect.co">trust@spectrumconnect.co</a> with the URL of
        the content and a one-line description of the problem.
      </p>
      <p>
        We aim to acknowledge any safety report within 24 hours and to action it within 72.
        Egregious cases (CSAM, credible threats) get acted on faster, day or night.
      </p>

      <h2>6. We can update this policy</h2>
      <p>
        The internet keeps inventing new ways to be awful, so this list is going to grow.
        We&apos;ll update this page when something new comes up and we&apos;ll note the
        change at the top. If a change materially restricts what you can do on the platform,
        we&apos;ll give you at least 14 days&apos; notice.
      </p>
    </LegalPage>
  );
}
