import LegalPage from '@/components/LegalPage';

export const metadata = {
  title: 'Cookie Policy — Spectrum Connect',
  description: 'What cookies Spectrum Connect uses, why, and how to control them.',
};

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      lastUpdated="May 31, 2026"
      effectiveDate="May 31, 2026"
      highlightColor="amber"
      tldr={
        <>
          <strong>The short version.</strong> We use a small number of cookies. The essential
          ones keep you logged in. The optional ones help us see what to fix. You decide what
          to allow from the banner at the bottom of the page, and you can change your mind at
          any time.
        </>
      }
    >
      <h2>1. What a cookie actually is</h2>
      <p>
        A cookie is a tiny piece of text a website stores on your device. We use cookies (and
        a handful of similar things like <code>localStorage</code> and pixel tags) to make the
        site work and to understand how people use it. None of what we use is the
        cross-site-tracking kind that follows you around the web showing you ads.
      </p>

      <h2>2. The categories we use</h2>

      <h3>Strictly necessary</h3>
      <p>
        These can&apos;t be turned off without breaking the site. They keep you logged in,
        remember your dark/light preference, hold your CSRF token, and make sure your shopping
        cart, dispute draft, or proposal-in-progress survives a page reload.
      </p>
      <ul>
        <li><code>auth_token</code> — your authenticated session, set as an HttpOnly cookie (not readable by page scripts).</li>
        <li><code>user_role</code> — whether you&apos;re in the creator or client surface.</li>
        <li>Anti-CSRF cookies set by our framework.</li>
      </ul>

      <h3>Functional</h3>
      <p>
        Optional. These remember your preferences so the product feels less amnesiac, like
        which sub-tab you had open on the projects page or whether you&apos;ve dismissed a
        coachmark.
      </p>

      <h3>Analytics</h3>
      <p>
        Optional. We count page views, button clicks, and how long actions take, in aggregate.
        We use this to find which screens confuse people and which features get used. We
        don&apos;t use analytics cookies to build advertising profiles, and we don&apos;t share
        them with third-party ad networks.
      </p>

      <h3>Marketing</h3>
      <p>
        Off by default and rarely used. If we ever run a campaign that needs a conversion
        pixel from someone like LinkedIn or Reddit, we&apos;ll list the cookies it sets here
        before we turn it on, and the consent banner will let you decline.
      </p>

      <h2>3. Choosing what to allow</h2>
      <p>
        The first time you visit, you&apos;ll see a consent banner at the bottom of the screen.
        Three options: accept all, accept only what&apos;s strictly necessary, or open the
        details and pick category by category.
      </p>
      <p>
        Your choice lives in a cookie called <code>spectrum_cookie_consent</code>. To revisit
        the prompt, click the &ldquo;Cookie settings&rdquo; link in the footer, or clear your
        browser&apos;s storage for spectrumconnect.co.
      </p>
      <p>
        You can also block cookies in your browser settings, but blocking strictly-necessary
        cookies will stop you from being able to log in.
      </p>

      <h2>4. Third-party services that may set cookies</h2>
      <p>
        We try to keep this list short and current. Today it includes:
      </p>
      <ul>
        <li><strong>Stripe</strong> when you reach a payment step. Their cookies are essential to making the charge work and to fraud prevention.</li>
        <li><strong>Google</strong> when you choose Sign in with Google. Cookies from accounts.google.com are set by Google, not us.</li>
        <li><strong>Vercel</strong>, our hosting provider, may set a single anonymous cookie to route requests consistently.</li>
      </ul>

      <h2>5. Do Not Track</h2>
      <p>
        Browsers used to send a &ldquo;Do Not Track&rdquo; signal that nobody really honoured.
        Most browsers have moved on. We don&apos;t rely on DNT, but our consent banner is the
        authoritative way to tell us what you want, and we respect it.
      </p>

      <h2>6. Updates</h2>
      <p>
        If we add or remove a cookie category, we&apos;ll update this page and re-trigger the
        consent banner so you can refresh your choice. Small changes (a renamed cookie, a
        version bump on an existing service) won&apos;t reset your consent.
      </p>

      <h2>7. Questions</h2>
      <p>
        Email <a href="mailto:team.spectrumstudios@gmail.com">team.spectrumstudios@gmail.com</a> and
        we&apos;ll get back to you.
      </p>
    </LegalPage>
  );
}
