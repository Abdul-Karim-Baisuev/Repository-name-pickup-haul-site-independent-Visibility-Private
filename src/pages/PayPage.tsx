import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CustomPaymentSection from "@/components/CustomPaymentSection";
import SEO from "@/components/SEO";

const PayPage = () => (
  <div className="min-h-screen bg-background">
    <SEO
      title="Pay Your Estimate · PICKUP HAUL"
      description="Pay your agreed estimate — 40% deposit to lock your slot or pay in full." canonical="https://www.autobais.app/pay"
    />
    <Navbar />
    <main className="pt-24">
      <CustomPaymentSection />
    </main>
    <Footer />
  </div>
);

export default PayPage;
