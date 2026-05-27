import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import GallerySection from "@/components/GallerySection";
import AdvantagesSection from "@/components/AdvantagesSection";
import FleetSection from "@/components/FleetSection";
import PricingSection from "@/components/PricingSection";
import ServicePackagesSection from "@/components/ServicePackagesSection";
import CustomPaymentSection from "@/components/CustomPaymentSection";
import InsuranceSection from "@/components/InsuranceSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import ContactSection from "@/components/ContactSection";
import QuoteSection from "@/components/QuoteSection";
import Footer from "@/components/Footer";
import FloatingSocials from "@/components/FloatingSocials";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <QuoteSection />
      <GallerySection />
      <ServicesSection />
      <AdvantagesSection />
      <FleetSection />
      <ServicePackagesSection />
      <PricingSection />
      <CustomPaymentSection />
      <InsuranceSection />
      <TestimonialsSection />
      <ContactSection />
      <Footer />
      <FloatingSocials />
    </div>
  );
};

export default Index;
