import { CURRENCY_SYMBOL } from "@/lib/config";

export default function PriceBreakdown({
  price,
  distanceKm,
  travelFee,
  className = "text-sm font-semibold text-zinc-900",
}: {
  price: number;
  distanceKm?: number | null;
  travelFee?: number | null;
  className?: string;
}) {
  if (!travelFee) {
    return <span className={className}>{CURRENCY_SYMBOL}{price.toFixed(2)}</span>;
  }
  const basePrice = price - travelFee;
  return (
    <span className={className}>
      {CURRENCY_SYMBOL}{price.toFixed(2)}
      <span className="ml-1 font-normal text-zinc-400">
        ({CURRENCY_SYMBOL}{basePrice.toFixed(2)} + {CURRENCY_SYMBOL}
        {travelFee.toFixed(2)} travel
        {distanceKm != null ? ` · ${distanceKm.toFixed(1)}km` : ""})
      </span>
    </span>
  );
}
