import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

import truckFront from "@/assets/truck-front.jpg";
import truckSide from "@/assets/truck-side.jpg";
import truckRear from "@/assets/truck-rear.jpg";
import truckTailgate from "@/assets/truck-tailgate.jpg";
import truckBedStraps from "@/assets/truck-bed-straps.jpg";
import equipmentStraps from "@/assets/equipment-straps.jpg";
import toolsLayout from "@/assets/tools-layout.jpg";
import jobBathtub from "@/assets/job-tacoma-loaded-bathtub.jpg";
import jobConstruction from "@/assets/job-delivery-construction-site.jpg";
import jobIndoor from "@/assets/job-indoor-delivery-kohler.jpg";
import jobToolsDaylight from "@/assets/job-tools-unloading-daylight.jpg";
import jobNightTailgate from "@/assets/job-night-tailgate-autobais.jpg";
import assemblyBedFrame from "@/assets/assembly-bed-frame-motors.jpg";
import assemblyLaptop from "@/assets/assembly-instructions-laptop.jpg";
import assemblyReading from "@/assets/assembly-reading-instructions.jpg";
import assemblyKitchenIsland from "@/assets/assembly-kitchen-island.jpg";
import assemblyDiningChairs from "@/assets/assembly-dining-chairs.jpg";
import toolsFlatlayFull from "@/assets/tools-flatlay-full.jpg";
import toolsFlatlayOrganized from "@/assets/tools-flatlay-organized.jpg";
import jobDeliveryVestHouse from "@/assets/job-delivery-vest-house.jpg";
import jobPatioSofaRack from "@/assets/job-patio-sofa-rack.jpg";
import jobDollyPatioSofa from "@/assets/job-dolly-patio-sofa.jpg";
import jobTailgateSwivelChair from "@/assets/job-tailgate-swivel-chair.jpg";
import equipmentGorillaDolly from "@/assets/equipment-gorilla-dolly.jpg";

type Photo = {
  src: string;
  alt: string;
  category: "Recent Job" | "The Truck" | "Assembly & Install";
};

const photos: Photo[] = [
  { src: jobDeliveryVestHouse, alt: "Safety-vest delivery to a SoCal home — patio sofa unloaded at the door", category: "Recent Job" },
  { src: jobPatioSofaRack, alt: "Better Homes & Gardens patio sofa stacked on the Tacoma bed rack", category: "Recent Job" },
  { src: jobTailgateSwivelChair, alt: "Tacoma tailgate down — Mainstays swivel chair on the dolly, ready to roll", category: "Recent Job" },
  { src: jobDollyPatioSofa, alt: "Heavy-duty dolly moving a patio sofa box from the Tacoma to the door", category: "Recent Job" },
  { src: equipmentGorillaDolly, alt: "Gorilla convertible hand truck — pickup at Sherwin-Williams", category: "The Truck" },
  { src: assemblyKitchenIsland, alt: "Assembled white kitchen island — installed in client's kitchen", category: "Assembly & Install" },
  { src: assemblyDiningChairs, alt: "Set of gray dining chairs assembled and placed", category: "Assembly & Install" },
  { src: assemblyBedFrame, alt: "Adjustable bed frame mid-assembly — motors and control unit laid out", category: "Assembly & Install" },
  { src: assemblyReading, alt: "Reviewing the assembly instructions before installing the frame", category: "Assembly & Install" },
  { src: assemblyLaptop, alt: "On-site assembly with the bed frame and laptop reference", category: "Assembly & Install" },
  { src: jobBathtub, alt: "Loaded Toyota Tacoma — bathtub & toilet delivery", category: "Recent Job" },
  { src: jobToolsDaylight, alt: "Daylight unloading — tools and hardware out of the Tacoma", category: "Recent Job" },
  { src: jobNightTailgate, alt: "Night tailgate setup — cart strapped, AutoBais workspace open", category: "Recent Job" },
  { src: jobConstruction, alt: "Delivery to a construction site in SoCal", category: "Recent Job" },
  { src: jobIndoor, alt: "Indoor delivery — Kohler & MAAX boxes placed inside", category: "Recent Job" },
  { src: toolsFlatlayOrganized, alt: "Full on-board tool kit — drills, saws, ratchet straps, clamps, hardware", category: "The Truck" },
  { src: toolsFlatlayFull, alt: "Power tools and ratchet tie-downs ready for the next job", category: "The Truck" },
  { src: truckFront, alt: "Toyota Tacoma TRD — front view", category: "The Truck" },
  { src: truckSide, alt: "Pickup truck — side view", category: "The Truck" },
  { src: truckRear, alt: "Pickup truck with rack — rear view", category: "The Truck" },
  { src: truckBedStraps, alt: "Truck bed with tie-down straps", category: "The Truck" },
  { src: equipmentStraps, alt: "Professional tie-down equipment", category: "The Truck" },
  { src: toolsLayout, alt: "Tools layout — quick-grab kit", category: "The Truck" },
  { src: truckTailgate, alt: "Open truck bed — mobile workspace", category: "The Truck" },
];

const GallerySection = () => {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const previewPhotos = photos.slice(0, 8);

  const openPhoto = (i: number) => {
    setGalleryOpen(true);
    setLightbox(i);
  };

  const goPrev = () =>
    setLightbox((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
  const goNext = () =>
    setLightbox((i) => (i === null ? null : (i + 1) % photos.length));

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  return (
    <>
      <section id="gallery" className="relative py-28 md:py-36 overflow-hidden scroll-mt-24">
        <div className="absolute inset-0 pointer-events-none mix-blend-screen">
          <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[160px]" />
        </div>

        <div className="container relative z-10 mx-auto px-6">
          <div className="max-w-3xl mb-16 md:mb-20 space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-subtle">
              <span className="size-1.5 rounded-full bg-primary" />
              <span className="text-[10px] font-medium tracking-[0.25em] text-foreground/70 uppercase">
                Field Log
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold leading-[0.95] tracking-tight text-balance">
              Recent jobs.<br />
              <span className="text-gradient-primary">Real cargo.</span>
            </h2>
            <p className="text-base md:text-lg text-muted-foreground font-light max-w-xl leading-relaxed">
              Real deliveries across SoCal — Toyota Tacoma TRD Off-Road, fully equipped
              for any job.
            </p>
            <a
              href="/gallery"
              className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.25em] uppercase text-primary hover:text-primary/80 transition-colors"
            >
              Open full page →
            </a>
          </div>

          <div className="relative max-w-3xl mx-auto">
            {/* Frame */}
            <div className="relative rounded-3xl border border-white/10 glass-subtle p-4 md:p-5 shadow-elevated">
              <div className="absolute -inset-px rounded-3xl pointer-events-none ring-1 ring-inset ring-primary/15" />

              <button
                type="button"
                onClick={() => setGalleryOpen(true)}
                className="block w-full focus:outline-none focus:ring-2 focus:ring-primary rounded-2xl group"
                aria-label={`Open full gallery — ${photos.length} photos`}
              >
                <div className="grid grid-cols-4 grid-rows-2 gap-1.5 md:gap-2 rounded-2xl overflow-hidden">
                  {previewPhotos.map((photo, i) => (
                    <div
                      key={i}
                      className="relative aspect-square overflow-hidden bg-background/40"
                    >
                      <img
                        src={photo.src}
                        alt={photo.alt}
                        className="w-full h-full object-cover scale-[0.7] group-hover:scale-[0.78] transition-transform duration-700"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 ring-1 ring-inset ring-white/5" />
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-[10px] tracking-[0.25em] uppercase text-foreground/60">
                    {photos.length} photos · click to view
                  </span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium tracking-wider uppercase group-hover:bg-primary/90 transition-colors">
                    Open gallery
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Full gallery modal */}
      {galleryOpen && lightbox === null && (
        <div
          className="fixed inset-0 z-40 bg-background/95 backdrop-blur-xl overflow-y-auto animate-fade-in"
          onClick={() => setGalleryOpen(false)}
        >
          <button
            className="fixed top-6 right-6 size-11 rounded-full glass-subtle flex items-center justify-center text-foreground hover:bg-white/10 transition-colors z-10"
            onClick={() => setGalleryOpen(false)}
            aria-label="Close gallery"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="container mx-auto px-6 py-20" onClick={(e) => e.stopPropagation()}>
            <div className="max-w-3xl mx-auto mb-10 space-y-3 text-center">
              <span className="text-[10px] tracking-[0.3em] uppercase text-foreground/60">
                Field Log · {photos.length} photos
              </span>
              <h3 className="text-3xl md:text-5xl font-bold leading-tight">
                Recent jobs. <span className="text-gradient-primary">Real cargo.</span>
              </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {photos.map((photo, i) => (
                <button
                  key={i}
                  type="button"
                  className="relative group cursor-pointer overflow-hidden rounded-2xl border border-white/5 focus:outline-none focus:ring-2 focus:ring-primary aspect-[4/5]"
                  onClick={() => setLightbox(i)}
                  aria-label={`Open photo: ${photo.alt}`}
                >
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-3 left-3">
                    <span className="text-[9px] tracking-[0.2em] uppercase text-foreground/80 px-2 py-1 rounded-full glass-subtle">
                      {photo.category}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                    <p className="text-xs md:text-sm text-foreground/90 line-clamp-2 leading-snug">
                      {photo.alt}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-6 right-6 size-11 rounded-full glass-subtle flex items-center justify-center text-foreground hover:bg-white/10 transition-colors z-10"
            onClick={() => setLightbox(null)}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <button
            className="absolute left-4 md:left-8 size-12 rounded-full glass-subtle flex items-center justify-center text-foreground hover:bg-white/10 transition-colors z-10"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <img
            src={photos[lightbox].src}
            alt={photos[lightbox].alt}
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-elevated"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            className="absolute right-4 md:right-8 size-12 rounded-full glass-subtle flex items-center justify-center text-foreground hover:bg-white/10 transition-colors z-10"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Next photo"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full glass-subtle text-xs tracking-[0.2em] uppercase text-foreground/80 font-heading tabular-nums">
            {String(lightbox + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
          </div>
        </div>
      )}
    </>
  );
};

export default GallerySection;
