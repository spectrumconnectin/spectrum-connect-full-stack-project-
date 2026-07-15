'use client';

/** Client-side print-to-PDF — pairs with the `@media print` rules in globals.css. */
export default function DownloadPdfButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      data-no-print
      onClick={() => window.print()}
      className={className || 'flex-shrink-0 inline-flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-5 py-3 rounded-xl font-bold text-sm hover:bg-gray-50 active:scale-[0.98] transition'}
    >
      <i className="fa-solid fa-download" /> Download PDF
    </button>
  );
}
