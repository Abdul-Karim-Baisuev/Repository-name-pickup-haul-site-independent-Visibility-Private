import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GallerySection from "@/components/GallerySection";
import SEO from "@/components/SEO";

const GalleryPage = () => (
  <div className="min-h-screen bg-background">
    <SEO
      title="Gallery · PICKUP HAUL"
      description="Recent jobs and the truck — real cargo across Southern California." canonical="https://www.autobais.app/gallery"
    />
    <Navbar />
    <main className="pt-24">
      <GallerySection />
    </main>
    <Footer />
  </div>
);

export default GalleryPage;
