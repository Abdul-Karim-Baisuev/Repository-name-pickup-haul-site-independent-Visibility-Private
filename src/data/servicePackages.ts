import { Truck, Package, Hammer, Bed, Tv, Briefcase, Sofa, Home } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AddOn = {
  id: string;
  label: string;
  price: number; // dollars
};

export type ServicePackage = {
  id: string;
  name: string;
  category: "Hauling" | "Assemble & Install";
  price: number; // dollars
  priceId: string;
  description: string;
  features: string[];
  icon: LucideIcon;
  popular?: boolean;
  badge?: "Most Booked" | "Best Value";
  addOns?: AddOn[];
};

// Common add-ons reused across packages
const HAULING_ADDONS: AddOn[] = [
  { id: "stairs", label: "Stairs / 2nd floor", price: 50 },
  { id: "extra-mover", label: "Extra mover", price: 60 },
  { id: "lift-gate", label: "Heavy item (>150 lb)", price: 40 },
];

const ASSEMBLY_ADDONS: AddOn[] = [
  { id: "haul-packaging", label: "Haul away packaging", price: 30 },
  { id: "extra-item", label: "Extra small item", price: 40 },
];

export const servicePackages: ServicePackage[] = [
  // Hauling
  {
    id: "small-move",
    name: "Small Move",
    category: "Hauling",
    price: 249,
    priceId: "price_1TRytjDapJqiWEujlwNhnCtw",
    description: "Studio or 1-bedroom local move within Los Angeles.",
    features: ["Truck + driver", "Loading & unloading", "Furniture blankets", "Local LA area"],
    icon: Package,
    popular: true,
    badge: "Most Booked",
    addOns: HAULING_ADDONS,
  },
  {
    id: "furniture-pickup",
    name: "Furniture Pickup & Delivery",
    category: "Hauling",
    price: 179,
    priceId: "price_1TRyuUDapJqiWEujpOLJnQRP",
    description: "Pickup from IKEA, Costco, Wayfair or any LA store.",
    features: ["Store pickup", "Careful loading", "Delivery to your door", "Up to 1 store"],
    icon: Sofa,
    badge: "Best Value",
    addOns: HAULING_ADDONS,
  },
  {
    id: "junk-removal",
    name: "Junk Removal",
    category: "Hauling",
    price: 299,
    priceId: "price_1TRyurDapJqiWEujedg3VnCv",
    description: "Household junk, old furniture or appliances.",
    features: ["Heavy lifting included", "Up to ½ cubic yard", "Responsible disposal", "Dump fees included"],
    icon: Truck,
    addOns: HAULING_ADDONS,
  },
  {
    id: "construction-haul",
    name: "Construction Haul",
    category: "Hauling",
    price: 349,
    priceId: "price_1TRyvGDapJqiWEujbYNyfr1G",
    description: "Construction debris, drywall, lumber or renovation waste.",
    features: ["Truck load + dump fees", "Job site pickup", "Debris hauling", "SoCal coverage"],
    icon: Hammer,
    addOns: HAULING_ADDONS,
  },
  // Assemble & Install
  {
    id: "ikea-bed-assembly",
    name: "IKEA Bed / Wardrobe Assembly",
    category: "Assemble & Install",
    price: 149,
    priceId: "price_1TRyw7DapJqiWEuj6MzvSNVP",
    description: "Professional assembly of IKEA bed frame or wardrobe.",
    features: ["PAX, MALM, HEMNES & similar", "All tools provided", "Leveling & alignment", "Cleanup of packaging"],
    icon: Bed,
    addOns: ASSEMBLY_ADDONS,
  },
  {
    id: "tv-wall-mount",
    name: "TV Wall Mount",
    category: "Assemble & Install",
    price: 129,
    priceId: "price_1TRywVDapJqiWEujL5bDWTWr",
    description: "TV wall mount installation up to 65 inch.",
    features: ["Mount hardware included", "Cable management", "Leveling", "Drywall or wood stud"],
    icon: Tv,
    addOns: [
      { id: "tv-large", label: "TV over 65\"", price: 50 },
      { id: "soundbar", label: "Soundbar mount", price: 40 },
    ],
  },
  {
    id: "office-desk-setup",
    name: "Office Desk + Chair Setup",
    category: "Assemble & Install",
    price: 99,
    priceId: "price_1TRywvDapJqiWEujacZgDA2c",
    description: "Office desk and chair assembly and setup.",
    features: ["Standard desks & chairs", "All tools provided", "Cable routing", "Workspace ready"],
    icon: Briefcase,
    badge: "Best Value",
    addOns: ASSEMBLY_ADDONS,
  },
  {
    id: "full-apartment-setup",
    name: "Full Apartment Furniture Setup",
    category: "Assemble & Install",
    price: 399,
    priceId: "price_1TRyxGDapJqiWEuj2iWCY98P",
    description: "Full furniture setup for a 1-2 bedroom apartment.",
    features: ["Bed, wardrobe, desk, dressers", "Multiple items", "Move-in ready", "Cleanup included"],
    icon: Home,
    addOns: ASSEMBLY_ADDONS,
  },
];

export const MIN_DEPOSIT_USD = 150;
export const DEPOSIT_PERCENT = 0.4;

/** Compute deposit in cents from a total in cents, enforcing minimum. */
export function computeDepositCents(totalCents: number): number {
  const raw = Math.round(totalCents * DEPOSIT_PERCENT);
  return Math.max(raw, MIN_DEPOSIT_USD * 100);
}
