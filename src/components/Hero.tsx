
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <div className="relative overflow-hidden bg-white">
      <div className="absolute inset-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-white"></div>
      <div className="relative container mx-auto px-4 py-20 md:py-32 flex flex-col items-center text-center">
        <div className="inline-flex items-center justify-center px-4 py-1 mb-6 bg-slate-100 rounded-full">
          <span className="mr-2 text-sm">✨</span>
          <span className="text-sm font-medium text-slate-900">AI for Legal Professionals</span>
        </div>
        
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 leading-tight">
          <span className="text-slate-900">AI in the </span>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-teal-400">Legal World</span>
        </h1>
        
        <p className="text-slate-700 text-xl max-w-2xl mb-10">
          Transforming legal practices through AI-driven research and intelligent document processing. Your virtual legal consultant.
        </p>
        
        <Button className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all">
          Get started for FREE!
        </Button>
      </div>
    </div>
  );
}
