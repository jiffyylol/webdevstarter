// Shows 5 gray stars with gold stars on top, cut to the right width.
// A 4.5 rating fills 90% of the stars.
export default function StarRating({ rating, className = 'text-base' }: { rating: number; className?: string }) {
  const percent = Math.max(0, Math.min(100, (rating / 5) * 100));
  return (
    <span className={`relative inline-block leading-none ${className}`} aria-label={`${rating} out of 5 stars`}>
      <span className="text-stone-300">★★★★★</span>
      <span
        className="absolute left-0 top-0 overflow-hidden whitespace-nowrap text-amber-500"
        style={{ width: `${percent}%` }}
      >
        ★★★★★
      </span>
    </span>
  );
}
