'use client'

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare, Search, ArrowRight } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Google Generative AI with your API key
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

export default function Hero() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [searchStage, setSearchStage] = useState(0);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsProcessing(true);
    setSearchStage(1);
    setAiResponse("");

    try {
      const features = [
        {
          name: "AI Legal Chatbot",
          description: "Natural language legal Q&A built with advanced AI, trained on Indian legal context (IPC, CPC, Motor Vehicles Act, etc.).",
          keywords: ["chat", "question", "answer", "ask", "legal", "advice"],
          route: "/chat"
        },
        {
          name: "Legal Document Uploader",
          description: "Upload PDFs (FIRs, judgments, case files) and extract key metadata including party names, dates, provisions cited and judgment summaries.",
          keywords: ["upload", "document", "pdf", "extract", "analyze", "file", "judgment", "FIR"],
          route: "/documentuploader"
        },
        {
          name: "Auto Legal Draft Generator",
          description: "Generate draft contracts and notices from user input. Simply describe what you need and get formatted documents with legal tone.",
          keywords: ["draft", "generate", "contract", "notice", "document", "create", "letter"],
          route: "/autolegaldraftgenerator"
        },
        {
          name: "Legal Remedy Flowchart",
          description: "Input your legal question and get a visual flowchart showing each step of the process with timelines and requirements.",
          keywords: ["flowchart", "process", "steps", "visual", "diagram", "procedure", "timeline"],
          route: "/flowchart"
        },
        {
          name: "Is It Legal? Checker",
          description: "Ask simple legal compliance questions and get clear YES/NO answers with relevant sections and legal justification.",
          keywords: ["legal", "compliance", "check", "allowed", "permitted", "lawful", "illegal"],
          route: "/isitlegal"
        },
        {
          name: "Penalty Predictor",
          description: "Enter case details or alleged offenses to receive an estimate of likely penalties, fines, or jail time based on IPC or other relevant laws.",
          keywords: ["penalty", "punishment", "fine", "jail", "offense", "crime", "sentence"],
          route: "/penaltyPredictor"
        }
      ];

      setSearchStage(2);

      // Use the AI to analyze and respond to the query
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const prompt = `As a legal AI assistant, analyze this user query and determine which of our platform's features would be most helpful. 
      
      User Query: "${query}"
      
      Available Features:
      ${features.map(f => `- ${f.name}: ${f.description}, Route: ${f.route}`).join('\n')}
      
      Instructions:
      1. Provide a brief, helpful response addressing the user's query (max 2 sentences)
      2. Recommend the most relevant feature from our list
      3. Format your answer as: {RESPONSE}|{RECOMMENDED_FEATURE_ROUTE}
      4. Route is already provided and should be the best you think from these: ${features.map((f) => f.route).join(',')}
      
      For example: "I can help with your contract needs. Our Auto Legal Draft Generator would be perfect for this.|/autolegaldraftgenerator"`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      // Parse the response to get the message and route
      const [message, route] = response.split("|");
      
      setAiResponse(message);
      setSearchStage(3);
      
      // Redirect after a short delay to allow user to read the response
      setTimeout(() => {
        setIsOpen(false);
        if (route && route.startsWith("/")) {
          router.push(route.trim());
        } else {
          // Default to chat if no specific route is determined
          router.push("/chat");
        }
        setIsProcessing(false);
        setSearchStage(0);
        setQuery("");
      }, 2500);
      
    } catch (error) {
      console.error("Error processing query:", error);
      setAiResponse("I'm having trouble processing your request. Let me take you to our chat feature where we can help you better.");
      
      setTimeout(() => {
        setIsOpen(false);
        router.push("/chat");
        setIsProcessing(false);
        setSearchStage(0);
        setQuery("");
      }, 2500);
    }
  };

  const getSearchStageText = () => {
    switch (searchStage) {
      case 1: return "Analyzing your query...";
      case 2: return "Finding the best resource for you...";
      case 3: return "Preparing your results...";
      default: return "Processing...";
    }
  };

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
        
        <Button 
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          Tell us your Query!
        </Button>

        {/* Search Modal - Redesigned with subtle white theme and minimal color tints */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white rounded-xl shadow-xl border border-slate-100">
            <DialogHeader className="p-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
              <div className="mb-1 text-blue-500 text-sm font-medium">AI Legal Assistant</div>
              <DialogTitle className="text-2xl font-bold text-slate-900">How can we help you today?</DialogTitle>
              <DialogDescription className="text-slate-600 mt-2">
                Tell us what legal assistance you need, and we'll find the right solution
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSearch} className="p-6 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="E.g., 'How do I file a consumer complaint?'"
                  className="pl-10 pr-4 py-3 border-slate-200 rounded-lg focus:ring-blue-100 focus:border-blue-300 bg-slate-50 text-slate-800"
                  disabled={isProcessing}
                />
              </div>
              
              {!isProcessing && !aiResponse && (
                <div className="mt-4">
                  <Button 
                    type="submit" 
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 py-2 rounded-lg flex items-center justify-center transition-all"
                    disabled={!query.trim()}
                  >
                    Find Legal Solutions 
                    <ArrowRight className="ml-2 text-blue-500" size={16} />
                  </Button>
                </div>
              )}
              
              {isProcessing && (
                <div className="mt-6 flex flex-col items-center">
                  <div className="flex items-center space-x-3 text-slate-600">
                    <Loader2 className="animate-spin text-blue-400" size={20} />
                    <span>{getSearchStageText()}</span>
                  </div>
                </div>
              )}
              
              {aiResponse && (
                <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex">
                    <MessageSquare className="text-blue-400 mr-3 mt-1 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-slate-800">{aiResponse}</p>
                      <p className="text-sm text-blue-400 mt-2">Redirecting you to the right place...</p>
                    </div>
                  </div>
                </div>
              )}
            </form>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
              <p className="text-xs text-slate-400 text-center">
                Your query will be analyzed to direct you to the most helpful legal tool
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}