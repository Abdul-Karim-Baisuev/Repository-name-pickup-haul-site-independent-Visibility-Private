import { Package, Truck, Trash2, Hammer, Wrench, type LucideIcon } from "lucide-react";

import imgMoving from "@/assets/service-moving-help.jpg";
import imgDelivery from "@/assets/service-delivery.jpg";
import imgAssembly from "@/assets/service-assembly-install.jpg";
import imgConstruction from "@/assets/service-construction-materials.jpg";
import imgJunk from "@/assets/service-junk-removal.jpg";

export type ServiceSlug =
  | "moving-help"
  | "delivery"
  | "assembly-install"
  | "construction-materials"
  | "junk-removal";

export interface ServiceContent {
  slug: ServiceSlug;
  icon: LucideIcon;
  meta: string;
  // Card (used in ServicesSection)
  title: string;
  shortDescription: string;
  image: string;
  imageAlt: string;
  // SEO
  seoTitle: string; // < 60 chars
  seoDescription: string; // < 160 chars
  keywords: string;
  // Social previews (OG / Twitter)
  social: {
    ogTitle: string; // punchier than seoTitle, < 70 chars
    ogDescription: string; // < 200 chars, social-friendly
    image: string; // JPG fallback, root-relative path under /og/ (served from public/)
    imageWebp?: string; // optional optimized WebP variant, served to browsers that support it
    imageAlt: string;
  };
  // Page
  hero: {
    eyebrow: string;
    headline: string;
    headlineAccent: string;
    intro: string;
  };
  highlights: { title: string; description: string }[];
  includes: string[];
  vehicle: string; // recommended vehicle from the fleet for this service
  faqs: { q: string; a: string }[];
  cta: {
    eyebrow: string;
    title: string;
    titleAccent: string;
    description: string;
    primaryLabel: string;
    secondaryLabel: string;
  };
}

export const services: ServiceContent[] = [
  {
    slug: "moving-help",
    icon: Truck,
    meta: "Same-day",
    title: "Moving Help",
    shortDescription:
      "Apartment and office moves. Careful loading, fast delivery across town and beyond.",
    image: imgMoving,
    imageAlt: "Heavy-duty dolly moving a patio sofa from the Tacoma to a SoCal home",
    seoTitle: "Moving Help in Los Angeles & SoCal | PICKUP HAUL",
    seoDescription:
      "Same-day moving help across Southern California. Apartments, offices, single items. Insured Toyota Tacoma, professional tie-downs.",
    keywords:
      "moving help Los Angeles, apartment movers SoCal, small move help, Van Nuys movers, moving with pickup truck",
    social: {
      ogTitle: "Same-Day Moving Help in Los Angeles & SoCal",
      ogDescription:
        "Apartment, office and single-item moves across Southern California. Insured Toyota Tacoma, blankets, straps, careful handling.",
      image: "/og/moving-help.jpg",
      imageWebp: "/og/moving-help.webp",
      imageAlt: "Toyota Tacoma loaded with wrapped moving boxes outside a Los Angeles apartment building",
    },
    hero: {
      eyebrow: "Moving Help",
      headline: "Stress-free moves,",
      headlineAccent: "handled with care.",
      intro:
        "From a studio apartment to a small office — we move your belongings safely and on time across all of Southern California.",
    },
    highlights: [
      { title: "Same-day availability", description: "Most jobs scheduled within hours." },
      { title: "Careful handling", description: "Blankets, straps, and proper tie-downs every time." },
      { title: "Flat, honest pricing", description: "Clear quote before we load — no surprises." },
    ],
    includes: [
      "Loading and unloading",
      "Furniture protection blankets",
      "Professional ratchet tie-downs",
      "Single-item or full apartment moves",
      "Service across LA, OC, IE",
    ],
    vehicle: "Toyota Tacoma TRD with roof rack — king beds, 5-seat sofas, long items",
    faqs: [
      {
        q: "Do you help with stairs and elevators?",
        a: "Yes. Just let us know floor and access details when requesting your quote so we can plan accordingly — stairs, narrow hallways, elevator reservations are all handled.",
      },
      {
        q: "How big a move can you handle?",
        a: "Up to about a 1-bedroom apartment per trip in our Toyota Tacoma. Larger moves can be split across runs at a discounted multi-trip rate.",
      },
      {
        q: "How much does a small move in Los Angeles cost?",
        a: "Most apartment and studio moves in LA fall between $120 and $350 depending on distance, access, and the amount of items. We give you a flat quote upfront — no hourly meter.",
      },
      {
        q: "Do you provide moving blankets and tie-downs?",
        a: "Yes — every job includes furniture protection blankets, professional ratchet straps, and shrink wrap as needed at no extra charge.",
      },
      {
        q: "Can you move me the same day I book?",
        a: "In most cases yes. Same-day moving help is available across LA, Orange County and the Inland Empire when you call dispatch directly at (747) 370-6885.",
      },
    ],
    cta: {
      eyebrow: "Book your move",
      title: "Need to move",
      titleAccent: "this week?",
      description: "Most apartment and studio moves are quoted within minutes and scheduled the same day across LA, OC, and the Inland Empire.",
      primaryLabel: "Get Moving Quote",
      secondaryLabel: "Call Dispatch",
    },
  },
  {
    slug: "delivery",
    icon: Package,
    meta: "White-glove",
    title: "Delivery Service",
    shortDescription:
      "Furniture, appliances, marketplace orders, and any oversized items delivered to your door.",
    image: imgDelivery,
    imageAlt: "Safety-vest delivery to a SoCal home — patio sofa unloaded at the door",
    seoTitle: "Furniture & Marketplace Delivery in California | PICKUP HAUL",
    seoDescription:
      "White-glove pickup & delivery in Southern California. Furniture, appliances, Facebook Marketplace, IKEA, Costco. Insured truck.",
    keywords:
      "furniture delivery Los Angeles, marketplace pickup delivery, IKEA delivery SoCal, appliance delivery California, Costco haul",
    social: {
      ogTitle: "White-Glove Delivery in Southern California",
      ogDescription:
        "Furniture, appliances, Marketplace, IKEA, Costco — picked up and delivered to your door across SoCal. Insured Toyota Tacoma.",
      image: "/og/delivery.jpg",
      imageWebp: "/og/delivery.webp",
      imageAlt: "Pickup Haul crew delivering a wrapped sofa from a Toyota Tacoma to a California home",
    },
    hero: {
      eyebrow: "Delivery",
      headline: "White-glove delivery",
      headlineAccent: "to your door.",
      intro:
        "Bought something big? We'll pick it up and deliver it safely — Facebook Marketplace, IKEA, Costco, appliance stores, anywhere in SoCal.",
    },
    highlights: [
      { title: "Marketplace pickups", description: "Cash, Zelle, or card on your behalf." },
      { title: "Up to 3,500 lbs with trailer", description: "1,600 lbs in bed; trailer for furniture, appliances, oversized boxes." },
      { title: "On-time arrivals", description: "Live ETA and contact during the run." },
    ],
    includes: [
      "Pickup and delivery to door",
      "Padding and secure tie-downs",
      "Help carrying inside on request",
      "Same-day & scheduled options",
      "Coverage across SoCal",
    ],
    vehicle: "Tacoma + roof rack for furniture · Camry for small Marketplace pickups",
    faqs: [
      {
        q: "Can you pick up from Facebook Marketplace or OfferUp?",
        a: "Yes — share the seller's address and item details, and we'll coordinate the pickup, payment handoff, and delivery to your door.",
      },
      {
        q: "Do you deliver from IKEA, Costco, or Wayfair stores?",
        a: "Absolutely. We meet you at the store or pick up the order on your behalf and deliver to homes and businesses across SoCal.",
      },
      {
        q: "Do you carry items upstairs?",
        a: "We can help carry inside and up a flight of stairs at no extra charge. Heavier or multi-flight jobs may include a small additional fee — quoted upfront.",
      },
      {
        q: "What size items can you deliver?",
        a: "Sofas, mattresses, dressers, refrigerators, washers/dryers, dining sets — anything up to 1,600 lbs in the Tacoma bed (6 ft with rack extension), or up to 3,500 lbs when we add a trailer.",
      },
      {
        q: "How fast can you deliver in Los Angeles?",
        a: "Same-day delivery is available across LA, OC, and the Inland Empire when booked before 2pm. Most pickups happen within 2–4 hours of confirmation.",
      },
    ],
    cta: {
      eyebrow: "Schedule a delivery",
      title: "Bought something",
      titleAccent: "big? We'll grab it.",
      description: "Marketplace, IKEA, Costco, appliance stores — pickup and delivery handled today across Southern California.",
      primaryLabel: "Request Delivery",
      secondaryLabel: "Call Dispatch",
    },
  },
  {
    slug: "assembly-install",
    icon: Wrench,
    meta: "Included",
    title: "Assembly & Install",
    shortDescription:
      "Basic assembly and install for what we deliver — bed frames, tables, desks, shelves, and similar items.",
    image: imgAssembly,
    imageAlt: "Adjustable bed frame mid-assembly — motors and control unit laid out",
    seoTitle: "Furniture Assembly & Install in SoCal | PICKUP HAUL",
    seoDescription:
      "Basic furniture assembly and install for items we deliver — bed frames, desks, tables, shelves. Tools and hardware on board.",
    keywords:
      "furniture assembly Los Angeles, IKEA assembly SoCal, bed frame install, desk assembly Van Nuys, delivery and setup",
    social: {
      ogTitle: "Assembly & Install — Delivered, Set Up, Ready",
      ogDescription:
        "We assemble and install most flat-pack furniture we deliver — bed frames, desks, tables, shelves. Tools and hardware on board.",
      image: "/og/assembly-install.jpg",
      imageWebp: "/og/assembly-install.webp",
      imageAlt: "Hands using a power drill to assemble a bed frame in a modern California bedroom",
    },
    hero: {
      eyebrow: "Assembly & Install",
      headline: "Delivered,",
      headlineAccent: "set up, ready to use.",
      intro:
        "Skip the toolbox. We assemble and install most flat-pack furniture we deliver — so you can enjoy it right away.",
    },
    highlights: [
      { title: "Tools on board", description: "Drills, drivers, and hardware basics included." },
      { title: "Most flat-pack brands", description: "IKEA, Wayfair, Amazon, Article and similar." },
      { title: "Tidy finish", description: "Packaging removed and area swept on request." },
    ],
    includes: [
      "Bed frames and headboards",
      "Desks, tables, and chairs",
      "Bookshelves and dressers",
      "Wall shelves and basic mounts",
      "Cleanup of packaging",
    ],
    vehicle: "Toyota Camry XSE for small flat-pack runs · tools on board for any fleet vehicle",
    faqs: [
      {
        q: "Do you assemble items I bought elsewhere?",
        a: "Our assembly add-on is bundled with delivery. For standalone assembly of items already at your home, contact dispatch — we'll fit it in when our schedule allows.",
      },
      {
        q: "Which brands of furniture do you assemble?",
        a: "Most flat-pack brands including IKEA, Wayfair, Amazon Basics, Article, West Elm, Pottery Barn, Costco furniture, and similar. Just share the product name when booking.",
      },
      {
        q: "How long does furniture assembly take?",
        a: "Simple desks and chairs take 20–40 minutes. Bed frames, dressers, and shelving units typically take 45–90 minutes. We give you a realistic time estimate with the quote.",
      },
      {
        q: "Can you mount a TV or heavy wall items?",
        a: "Light wall shelves and floating units, yes. Heavy TV mounts and stud-anchored hardware are case-by-case — share the model and wall type in your quote request.",
      },
      {
        q: "Do you remove the packaging when you're done?",
        a: "Yes — boxes, foam, plastic wrap, and assembly debris are removed and recycled. We leave the room ready to use.",
      },
    ],
    cta: {
      eyebrow: "Skip the toolbox",
      title: "Want it",
      titleAccent: "delivered & assembled?",
      description: "Add assembly to your delivery and we'll set up your bed frame, desk, or shelving the same trip — tools and hardware on board.",
      primaryLabel: "Bundle Assembly",
      secondaryLabel: "Call Dispatch",
    },
  },
  {
    slug: "construction-materials",
    icon: Hammer,
    meta: "Heavy-duty",
    title: "Construction Materials Delivery",
    shortDescription:
      "Lumber, tile, bagged concrete, tools, and equipment hauled right to your job site.",
    image: imgConstruction,
    imageAlt: "Toyota Tacoma delivering materials to a SoCal construction site",
    seoTitle: "Construction Material Delivery California | PICKUP HAUL",
    seoDescription:
      "Lumber, tile, bagged concrete, tools and equipment delivered to job sites across Southern California. Up to 1,600 lbs in bed, 3,500 lbs with trailer.",
    keywords:
      "construction material delivery Los Angeles, lumber delivery SoCal, tile delivery, bagged concrete hauling, job site delivery California",
    social: {
      ogTitle: "Construction Material Delivery — Up to 3,500 lbs with Trailer",
      ogDescription:
        "Lumber, tile, bagged concrete, tools and equipment delivered to your SoCal job site. Pickup from any supplier, on schedule.",
      image: "/og/construction-materials.jpg",
      imageWebp: "/og/construction-materials.webp",
      imageAlt: "Toyota Tacoma loaded with lumber and concrete at a SoCal construction site",
    },
    hero: {
      eyebrow: "Construction",
      headline: "Job-site delivery,",
      headlineAccent: "right when you need it.",
      intro:
        "Lumber from Home Depot, tile from a yard, bagged concrete, tools — picked up and delivered to your active job site, on schedule.",
    },
    highlights: [
      { title: "Up to 3,500 lbs with trailer", description: "1,600 lbs in bed; trailer rated for heavy materials." },
      { title: "Job-site friendly", description: "We work around active crews and tight access." },
      { title: "Pickup from any supplier", description: "Home Depot, Lowe's, local yards." },
    ],
    includes: [
      "Lumber and sheet goods",
      "Tile, stone, and pavers",
      "Bagged concrete and aggregate",
      "Tools and equipment",
      "Multiple stops on request",
    ],
    vehicle: "Ford Bronco Sport for off-road job sites · Tacoma TRD with rack for 12 ft lumber & heavy loads",
    faqs: [
      {
        q: "Can you load and unload at the supplier?",
        a: "Yes. We handle loading at the store or yard and unload at your job site. Forklift loading at the supplier always speeds things up — just let them know we're picking up.",
      },
      {
        q: "How much lumber or drywall can a Toyota Tacoma haul?",
        a: "Up to 1,600 lbs and 6 ft length flat in the Tacoma bed (longer with the bed extender), or up to 3,500 lbs when we tow a trailer. Typical loads: ~30 2x4x8 studs, 60+ bags of concrete, or a partial pallet of drywall per run.",
      },
      {
        q: "Do you deliver from Home Depot, Lowe's, or local yards?",
        a: "All of the above. We pick up from any Home Depot, Lowe's, Ganahl, Anawalt, tile yards, and specialty suppliers across SoCal.",
      },
      {
        q: "Do you do recurring contractor runs?",
        a: "Many contractors book us weekly or per-project. Ask dispatch about repeat-customer pricing and standing-route discounts.",
      },
      {
        q: "Can you make multiple stops in one trip?",
        a: "Yes — pick up from two suppliers and drop at one site, or split a load across two job sites. Just list the stops in your quote request.",
      },
    ],
    cta: {
      eyebrow: "Job-site delivery",
      title: "Materials needed",
      titleAccent: "on site today?",
      description: "Lumber, tile, bagged concrete, tools — picked up from any SoCal supplier and dropped exactly where your crew needs it.",
      primaryLabel: "Request Job-Site Run",
      secondaryLabel: "Call Dispatch",
    },
  },
  {
    slug: "junk-removal",
    icon: Trash2,
    meta: "Eco-disposal",
    title: "Junk Removal",
    shortDescription:
      "Construction debris, yard waste, old furniture — removed fast and disposed of properly.",
    image: imgJunk,
    imageAlt: "Loaded Toyota Tacoma hauling away an old bathtub and toilet",
    seoTitle: "Junk Removal in Los Angeles & SoCal | PICKUP HAUL",
    seoDescription:
      "Fast junk removal across Southern California. Construction debris, yard waste, old furniture, e-waste. Eco-friendly disposal.",
    keywords:
      "junk removal Los Angeles, debris hauling SoCal, furniture disposal Van Nuys, yard waste removal, e-waste pickup California",
    social: {
      ogTitle: "Junk Removal in SoCal — Same-Day Pickup",
      ogDescription:
        "Old furniture, debris, yard waste, e-waste — hauled away same-day across Southern California. Eco-friendly disposal, flat-rate quotes.",
      image: "/og/junk-removal.jpg",
      imageWebp: "/og/junk-removal.webp",
      imageAlt: "Toyota Tacoma loaded with junk and debris ready for eco-disposal in SoCal",
    },
    hero: {
      eyebrow: "Junk Removal",
      headline: "Out of sight,",
      headlineAccent: "off your hands.",
      intro:
        "Old furniture, construction debris, yard waste, e-waste — we haul it away and dispose of it responsibly across SoCal.",
    },
    highlights: [
      { title: "Same-day pickup", description: "Most jobs scheduled within a few hours." },
      { title: "Eco-friendly disposal", description: "Recycling and donation when possible." },
      { title: "Flat-rate quotes", description: "Clear price by load size — no surprises." },
    ],
    includes: [
      "Furniture and mattresses",
      "Construction debris",
      "Yard waste and branches",
      "Appliances and e-waste",
      "Garage and estate cleanouts",
    ],
    vehicle: "Toyota Tacoma TRD — bed + roof rack for bulky loads",
    faqs: [
      {
        q: "What can't you take?",
        a: "Hazardous materials such as paint, chemicals, asbestos, fuels, batteries, and tires. For those we'll point you to a proper local drop-off facility.",
      },
      {
        q: "How much does junk removal cost in Los Angeles?",
        a: "Flat rates start around $95 for a quarter-truck load and go up to ~$295 for a full Tacoma load. You get the price upfront — no weight surprises after the fact.",
      },
      {
        q: "Do I need to move items outside first?",
        a: "No — we'll come in and carry items out for you. Garages, attics, backyards, upstairs apartments. Just point and we'll handle the rest.",
      },
      {
        q: "Where does the junk actually go?",
        a: "We sort on the way out: usable furniture and appliances go to local donation centers, e-waste and metals to certified recyclers, and only what's truly unusable goes to landfill.",
      },
      {
        q: "Can you remove an old mattress or appliance same-day?",
        a: "Yes — single-item pickups (mattress, fridge, washer, sofa) are usually scheduled within a few hours across LA, OC, and the Inland Empire.",
      },
    ],
    cta: {
      eyebrow: "Same-day haul-away",
      title: "Got junk to",
      titleAccent: "make disappear?",
      description: "Old furniture, debris, yard waste, e-waste — flat-rate quote, eco-friendly disposal, gone the same day across SoCal.",
      primaryLabel: "Get Removal Quote",
      secondaryLabel: "Call Dispatch",
    },
  },
];

export const getServiceBySlug = (slug: string): ServiceContent | undefined =>
  services.find((s) => s.slug === slug);
