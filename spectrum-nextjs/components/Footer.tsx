import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="pr-foot">
      <div className="pr-foot-inner">
        <div>
          <div className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/spectrum-logo.svg" alt="Spectrum" className="nb-logo" style={{width:36,height:36,borderRadius:8}} />
            <span className="nm">Spectrum Connect</span>
          </div>
          <p className="about">
            A premium marketplace where creators and clients connect, collaborate,
            and complete amazing projects together.
          </p>
          <div className="socials">
            <a href="#" aria-label="Twitter"><i className="fa-brands fa-x-twitter"></i></a>
            <a href="#" aria-label="Instagram"><i className="fa-brands fa-instagram"></i></a>
            <a href="#" aria-label="LinkedIn"><i className="fa-brands fa-linkedin-in"></i></a>
            <a href="#" aria-label="YouTube"><i className="fa-brands fa-youtube"></i></a>
          </div>
        </div>
        <div>
          <h5>Product</h5>
          <ul>
            <li><Link href="/#features">Features</Link></li>
            <li><Link href="/how-it-works">How It Works</Link></li>
            <li><Link href="/pricing">Pricing</Link></li>
            <li><Link href="/community">Community</Link></li>
          </ul>
        </div>
        <div>
          <h5>Company</h5>
          <ul>
            <li><Link href="/about">About Us</Link></li>
            <li><Link href="/community">Community</Link></li>
            <li><a href="#">Careers</a></li>
            <li><a href="#">Blog</a></li>
          </ul>
        </div>
        <div>
          <h5>Support</h5>
          <ul>
            <li><Link href="/help">Help Center</Link></li>
            <li><a href="mailto:support@spectrumconnect.co">Contact Us</a></li>
            <li><Link href="/terms">Terms of Service</Link></li>
            <li><Link href="/privacy">Privacy Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="pr-foot-bottom">
        <span>© 2026 Spectrum Connect. All rights reserved.</span>
        <div className="links">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/help">Help</Link>
        </div>
      </div>
    </footer>
  );
}
