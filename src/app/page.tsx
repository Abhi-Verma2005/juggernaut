
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import FlowchartDemo from "@/components/FlowChart";
import DemoSection from "@/components/DemoSection";
import Testimonials from "@/components/Testimonials";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import AIChat from "@/components/AIChat";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Hero />
      <Features />
      <FlowchartDemo />
      <DemoSection />
      <Testimonials />
      <CTASection />
      <Footer />
      <AIChat />
    </div>
  );
};

export default Index;