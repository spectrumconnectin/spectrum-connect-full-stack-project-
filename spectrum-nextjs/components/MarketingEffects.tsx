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

    if (!('IntersectionObserver' in window)) {
      revealEls.forEach((el) => el.classList.add('in'));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('in');
              io.unobserve(e.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
      );
      revealEls.forEach((el) => io.observe(el));
      return () => io.disconnect();
    }
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
