'use client';

import { useEffect } from 'react';

/**
 * MarketingEffects
 * Replaces marketing.js — wires up:
 *  1. Scroll-reveal  (.mk-reveal, .mk-reveal-x, .mk-reveal-r)
 *  2. Navbar elevation on scroll (.nav → adds .scrolled)
 *  3. Smooth anchor scrolling for #hash links
 *
 * Drop this once into any marketing layout or page.
 */
export default function MarketingEffects() {
  useEffect(() => {
    // 1. Scroll reveal via IntersectionObserver
    const revealEls = document.querySelectorAll<HTMLElement>(
      '.mk-reveal, .mk-reveal-x, .mk-reveal-r, .mk-stagger'
    );

    const reveal = (el: Element) => el.classList.add('in');

    // Anything that hides content until JS says otherwise needs a way to fail
    // visible. No observer, or a script that never got to run its callback,
    // must not leave the page blank.
    if (!('IntersectionObserver' in window)) {
      revealEls.forEach(reveal);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          // A fractional threshold is unreachable for an element taller than
          // the viewport: 12% of a section three screens tall is still below
          // the fold, so the section would sit at opacity 0 forever. Those
          // reveal on first contact instead.
          const tallerThanViewport =
            e.boundingClientRect.height > window.innerHeight * 0.8;
          if (tallerThanViewport || e.intersectionRatio >= 0.12) {
            reveal(e.target);
            io.unobserve(e.target);
          }
        });
      },
      // Both thresholds are needed: 0 so tall elements report on contact, 0.12
      // so normal ones still wait until they are meaningfully on screen.
      { threshold: [0, 0.12], rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => io.observe(el));

    // Last resort. If anything is still hidden a few seconds in, the reveal
    // has failed for a reason we did not predict — show the content rather
    // than let the page keep a section invisible.
    const failsafe = window.setTimeout(() => {
      revealEls.forEach((el) => {
        if (!el.classList.contains('in')) reveal(el);
      });
    }, 4000);

    return () => {
      io.disconnect();
      window.clearTimeout(failsafe);
    };
  }, []);

  useEffect(() => {
    // 2. Navbar elevation on scroll
    const nav = document.querySelector<HTMLElement>('.nav');
    if (!nav) return;

    const onScroll = () => {
      if (window.scrollY > 8) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    // 3. Smooth anchor scroll for #hash links
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href') || '';
      if (!href.startsWith('#')) return;
      const id = href.slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        const top = el.getBoundingClientRect().top + window.scrollY - 72;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return null;
}
