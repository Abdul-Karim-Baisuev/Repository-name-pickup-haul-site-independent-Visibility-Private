import { Truck, Mountain, Car } from "lucide-react";
import fleetImage from "@/assets/fleet-three-vehicles.jpg";

const vehicles = [
  {
    icon: Truck,
    name: "Toyota Tacoma TRD",
    year: "Off-Road · Bronze Oxide",
    role: "Hauling workhorse",
    description:
      "Up to 1,600 lbs in the bed and up to 3,500 lbs with trailer — full lumber rack for king-size beds, 5-seat sofas, 12 ft lumber, ladders.",
    badge: "Primary",
  },
  {
    icon: Mountain,
    name: "Ford Bronco Sport",
    year: "2025 · Desert Sand",
    role: "Off-road & SUV runs",
    description:
      "Mid-size loads, hillside SoCal access, multi-stop furniture deliveries when the truck is on another job.",
    badge: "Secondary",
  },
  {
    icon: Car,
    name: "Toyota Camry XSE",
    year: "2025 · Cement Gray",
    role: "Same-day courier",
    description:
      "Latest XSE trim — Marketplace pickups, small boxes, documents, fast same-day couriering across LA and OC.",
    badge: "Express",
  },
];

const FleetSection = () => {
  return (
    <section
      id="fleet"
      className="relative py-28 md:py-36 overflow-hidden scroll-mt-24"
    >
      <div className="absolute inset-0 pointer-events-none mix-blend-screen">
        <div className="absolute top-0 left-0 w-[520px] h-[420px] bg-primary/15 rounded-full blur-[160px]" />
        <div className="absolute bottom-0 right-0 w-[480px] h-[380px] bg-[hsl(346_85%_45%)]/15 rounded-full blur-[140px]" />
      </div>

      <div className="container relative z-10 mx-auto px-6">
        <div className="max-w-3xl mb-14 md:mb-16 space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-subtle">
            <span className="size-1.5 rounded-full bg-primary" />
            <span className="text-[10px] font-medium tracking-[0.25em] text-foreground/70 uppercase">
              Our Fleet
            </span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold leading-[0.95] tracking-tight text-balance">
            Three vehicles.<br />
            <span className="text-gradient-primary">One reliable crew.</span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground font-light max-w-xl leading-relaxed">
            Whether it's a king-size bed strapped to the roof rack, a hillside
            delivery, or a same-day Marketplace pickup — we have the right
            vehicle for the job.
          </p>
        </div>

        {/* Hero fleet image — frameless, dissolves into the page */}
        <div className="relative mb-10 md:mb-12 -mx-6 md:mx-0">
          <img
            src={fleetImage}
            alt="PICKUP HAUL fleet — Toyota Camry XSE 2025, Toyota Tacoma TRD Off-Road with bed lumber rack, and Ford Bronco Sport 2025 emerging from darkness"
            loading="lazy"
            width={1536}
            height={1024}
            className="w-full h-[320px] md:h-[560px] object-cover object-center select-none pointer-events-none"
            style={{
              WebkitMaskImage:
                "radial-gradient(ellipse 78% 80% at 50% 55%, #000 45%, transparent 92%)",
              maskImage:
                "radial-gradient(ellipse 78% 80% at 50% 55%, #000 45%, transparent 92%)",
            }}
          />
          {/* Edge fades to seamlessly merge with the page background */}
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />

          <div className="relative -mt-6 md:-mt-10 px-6 md:px-0 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="space-y-1">
              <div className="text-[10px] tracking-[0.25em] uppercase text-primary/90 font-medium">
                Owner-operated
              </div>
              <p className="text-sm md:text-base text-foreground/90 max-w-md leading-relaxed">
                Personally driven or dispatched — every job, every vehicle.
              </p>
            </div>
            <span className="self-start md:self-auto inline-flex text-[10px] tracking-[0.25em] uppercase text-foreground/60 px-3 py-1.5 rounded-full glass-subtle">
              Insured · $1M / $2M
            </span>
          </div>
        </div>

        {/* Vehicle cards */}
        <div className="grid md:grid-cols-3 gap-4 md:gap-5">
          {vehicles.map((v) => (
            <div
              key={v.name}
              className="group glass rounded-2xl p-7 md:p-8 space-y-5 hover:-translate-y-1 transition-all duration-500"
            >
              <div className="flex items-start justify-between">
                <div className="size-12 rounded-xl glass-subtle flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary/40 transition-all duration-500">
                  <v.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-[10px] tracking-[0.25em] uppercase text-primary/80 font-medium px-2.5 py-1 rounded-full glass-subtle">
                  {v.badge}
                </span>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] tracking-[0.25em] uppercase text-foreground/60 font-medium">
                  {v.year}
                </div>
                <h3 className="text-2xl font-semibold tracking-tight">
                  {v.name}
                </h3>
                <div className="text-sm text-primary/90 font-medium">
                  {v.role}
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {v.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FleetSection;
