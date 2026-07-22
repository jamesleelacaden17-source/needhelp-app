export const PLATFORM_COMMISSION_RATE = 0.2; // 20% platform commission per completed booking

export const CURRENCY_SYMBOL = "₱";

// Default map center: Vigan City, Ilocos Sur, Philippines
export const DEFAULT_MAP_CENTER: [number, number] = [17.5747, 120.3869];

export const MIN_HOURS = 1;
export const MAX_HOURS = 12;

export type ProviderCategoryId = "CLEANING" | "AIRCON" | "LAUNDRY" | "CAR_SERVICE";

export type Gender = "MALE" | "FEMALE" | "OTHER";

// A provider earns the top-performer title once they've built up a strong
// track record: a high average rating over a meaningful number of jobs.
export const SUPER_BADGE_MIN_RATING = 4.8;
export const SUPER_BADGE_MIN_JOBS = 5;

export function getSuperBadge(
  gender: Gender | null | undefined,
  avgRating: number | null,
  ratingCount: number
): string | null {
  if (avgRating == null || avgRating < SUPER_BADGE_MIN_RATING) return null;
  if (ratingCount < SUPER_BADGE_MIN_JOBS) return null;
  if (gender === "MALE") return "Superman";
  if (gender === "FEMALE") return "Superwoman";
  return "Super Pro";
}

export type PublicProviderSource = {
  id: string;
  name: string;
  lastLat: number | null;
  lastLng: number | null;
  lastLocationAt: Date | null;
  verificationStatus: string;
  profilePhotoPath: string | null;
  gender: string | null;
  ratingSum: number;
  ratingCount: number;
};

// The safe, customer-facing view of a provider — never includes
// passwordHash, email, ID photo path, or other private fields.
export function toPublicProvider(p: PublicProviderSource) {
  const avgRating = p.ratingCount > 0 ? p.ratingSum / p.ratingCount : null;
  return {
    id: p.id,
    name: p.name,
    lastLat: p.lastLat,
    lastLng: p.lastLng,
    lastLocationAt: p.lastLocationAt,
    verificationStatus: p.verificationStatus,
    profilePhotoPath: p.profilePhotoPath,
    avgRating,
    ratingCount: p.ratingCount,
    superBadge: getSuperBadge(p.gender as Gender | null, avgRating, p.ratingCount),
  };
}

export const PROVIDER_CATEGORIES: { id: ProviderCategoryId; label: string; providerLabel: string }[] = [
  { id: "CLEANING", label: "Home Cleaning", providerLabel: "Cleaner" },
  { id: "AIRCON", label: "Aircon Cleaning", providerLabel: "Aircon Technician" },
  { id: "LAUNDRY", label: "Laundry Service", providerLabel: "Laundry Provider" },
];

export const PROPERTY_TYPES = [
  { id: "studio", label: "Studio", price: 500, estimatedHours: 1.5 },
  { id: "1br", label: "1 Bedroom", price: 750, estimatedHours: 2 },
  { id: "2br", label: "2 Bedroom", price: 1000, estimatedHours: 3 },
  { id: "house", label: "House", price: 1500, estimatedHours: 4.5 },
] as const;

type TieredFlatService = {
  id: string;
  category: ProviderCategoryId;
  label: string;
  pricingMode: "tieredFlat";
};

type FlatService = {
  id: string;
  category: ProviderCategoryId;
  label: string;
  pricingMode: "flat";
  price: number;
  estimatedHours: number;
};

type PerUnitService = {
  id: string;
  category: ProviderCategoryId;
  label: string;
  pricingMode: "perUnit";
  unitLabel: string;
  pricePerUnit: number;
  minUnits: number;
  maxUnits: number;
  hoursPerUnit: number;
  baseHours: number;
};

type HourlyService = {
  id: string;
  category: ProviderCategoryId;
  label: string;
  pricingMode: "hourly";
  ratePerHour: number;
};

export type ServiceTypeDef = TieredFlatService | FlatService | PerUnitService | HourlyService;

// Standard Cleaning is quoted as a flat rate by property type.
// Deep Cleaning, Move In/Out, and Post-Construction fall back to hourly billing
// since their scope varies too much to quote flatly.
export const SERVICE_TYPES: ServiceTypeDef[] = [
  // Home Cleaning
  { id: "standard", category: "CLEANING", label: "Standard Cleaning", pricingMode: "tieredFlat" },
  { id: "deep", category: "CLEANING", label: "Deep Cleaning", pricingMode: "hourly", ratePerHour: 180 },
  { id: "move", category: "CLEANING", label: "Move In/Out Cleaning", pricingMode: "hourly", ratePerHour: 200 },
  {
    id: "post_construction",
    category: "CLEANING",
    label: "Post-Construction Cleaning",
    pricingMode: "hourly",
    ratePerHour: 250,
  },

  // Aircon Cleaning — priced per unit serviced
  {
    id: "aircon_cleaning",
    category: "AIRCON",
    label: "Aircon Cleaning (per unit)",
    pricingMode: "perUnit",
    unitLabel: "aircon unit",
    pricePerUnit: 400,
    minUnits: 1,
    maxUnits: 10,
    hoursPerUnit: 0.75,
    baseHours: 0.25,
  },

  // Laundry — priced per kilo, or per piece for dry cleaning
  {
    id: "wash_dry_fold",
    category: "LAUNDRY",
    label: "Wash, Dry & Fold (per kilo)",
    pricingMode: "perUnit",
    unitLabel: "kilo",
    pricePerUnit: 60,
    minUnits: 3,
    maxUnits: 50,
    hoursPerUnit: 0.1,
    baseHours: 1,
  },
  {
    id: "dry_cleaning",
    category: "LAUNDRY",
    label: "Dry Cleaning (per piece)",
    pricingMode: "perUnit",
    unitLabel: "piece",
    pricePerUnit: 150,
    minUnits: 1,
    maxUnits: 30,
    hoursPerUnit: 0.15,
    baseHours: 1,
  },
];

export function servicesForCategory(category: ProviderCategoryId) {
  return SERVICE_TYPES.filter((s) => s.category === category);
}

export function getServiceByLabel(label: string) {
  return SERVICE_TYPES.find((s) => s.label === label);
}

export function calculateBookingPrice(
  serviceTypeId: string,
  options: { propertyType?: string; hours?: number; quantity?: number }
): { price: number; estimatedHours: number } | null {
  const service = SERVICE_TYPES.find((s) => s.id === serviceTypeId);
  if (!service) return null;

  if (service.pricingMode === "tieredFlat") {
    const tier = PROPERTY_TYPES.find((p) => p.id === options.propertyType);
    if (!tier) return null;
    return { price: tier.price, estimatedHours: tier.estimatedHours };
  }

  if (service.pricingMode === "flat") {
    return { price: service.price, estimatedHours: service.estimatedHours };
  }

  if (service.pricingMode === "perUnit") {
    const quantity = options.quantity;
    if (quantity == null || quantity < service.minUnits || quantity > service.maxUnits) return null;
    const price = Math.round(service.pricePerUnit * quantity * 100) / 100;
    const estimatedHours = Math.min(
      12,
      Math.max(1, Math.round((service.baseHours + service.hoursPerUnit * quantity) * 2) / 2)
    );
    return { price, estimatedHours };
  }

  // hourly
  const hours = options.hours;
  if (hours == null || hours < MIN_HOURS || hours > MAX_HOURS) return null;
  const price = Math.round(service.ratePerHour * hours * 100) / 100;
  return { price, estimatedHours: hours };
}
