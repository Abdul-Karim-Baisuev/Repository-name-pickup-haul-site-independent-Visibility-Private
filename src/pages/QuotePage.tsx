import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import QuoteSection from "@/components/QuoteSection";
import CustomPaymentSection from "@/components/CustomPaymentSection";
import SEO from "@/components/SEO";

const QuotePage = () => (
  <div className="min-h-screen bg-background">
    <SEO
      title="Request a Quote · PICKUP HAUL"
      description="Build your delivery request: addresses, multiple stops, date — and pay your agreed estimate." canonical="https://www.autobais.app/quote"
    />
    <Navbar />
    <main className="pt-24">
      <QuoteSection />
      <CustomPaymentSection />
    </main>
    <Footer />
  </div>
);

export default QuotePage;
