'use client';

import { useState } from 'react';

/** Share buttons: X, LinkedIn, and copy-link. */
export default function ShareRow({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const x = `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`;
  const li = `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  };

  // 44px on touch screens (keeps the circle round against the global 44px
  // min touch-target rule), tighter on desktop.
  const btn = 'w-11 h-11 sm:w-9 sm:h-9 rounded-full border border-gray-200 text-gray-500 hover:text-cobalt hover:border-cobalt flex items-center justify-center transition active:scale-95';

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-gray-400 mr-1">Share</span>
      <a href={x} target="_blank" rel="noreferrer" aria-label="Share on X" className={btn}><i className="fa-brands fa-x-twitter text-sm" /></a>
      <a href={li} target="_blank" rel="noreferrer" aria-label="Share on LinkedIn" className={btn}><i className="fa-brands fa-linkedin-in text-sm" /></a>
      <button onClick={copy} aria-label="Copy link" className={btn}>
        <i className={`fa-solid ${copied ? 'fa-check text-emerald-500' : 'fa-link'} text-sm`} />
      </button>
      {copied && <span className="text-xs text-emerald-600 font-medium">Copied!</span>}
    </div>
  );
}
