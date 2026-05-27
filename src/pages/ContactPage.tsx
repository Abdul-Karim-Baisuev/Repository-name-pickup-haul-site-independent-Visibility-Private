import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactSection from "@/components/ContactSection";
import SEO from "@/components/SEO";

const ContactPage = () => (
  <div className="min-h-screen bg-background">
    <SEO
      title="Contact Dispatch · PICKUP HAUL"
      description="Text, email or call — we reply within 15 minutes, 7 days a week." canonical="https://www.autobais.app/contact"
    />
    <Navbar />
    <main className="pt-24">
      <ContactSection />
    </main>
    <Footer />
  </div>
);

export default ContactPage;
