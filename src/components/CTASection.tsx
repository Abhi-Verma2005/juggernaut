
import { Button } from "@/components/ui/button";

export default function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-500 text-white">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Legal Practice?</h2>
        <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto opacity-90">
          Join thousands of legal professionals using JurisSmart to save time, 
          reduce costs, and deliver better results.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-6 text-lg rounded-full">
            Start Free Trial
          </Button>
          
          <Button variant="outline" className="border-white text-white hover:bg-blue-700 px-8 py-6 text-lg rounded-full">
            Schedule Demo
          </Button>
        </div>
      </div>
    </section>
  );
}