"use client";
import { MessageCircle, FileText, FileUp, GitBranch, CheckSquare, Link, Scale, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const features = [
  {
    icon: <MessageCircle size={40} className="text-blue-500" />,
    title: "AI Legal Chatbot",
    description: "Natural language legal Q&A built with advanced AI, trained on Indian legal context (IPC, CPC, Motor Vehicles Act, etc.).",
    color: "bg-blue-50",
    link: '/chat'
  },
  {
    icon: <FileUp size={40} className="text-green-500" />,
    title: "Legal Document Uploader",
    description: "Upload PDFs (FIRs, judgments, case files) and extract key metadata including party names, dates, provisions cited and judgment summaries.",
    color: "bg-green-50",
    link: "/documentuploader"
  },
  {
    icon: <FileText size={40} className="text-purple-500" />,
    title: "Auto Legal Draft Generator",
    description: "Generate draft contracts and notices from user input. Simply describe what you need and get formatted documents with legal tone.",
    color: "bg-purple-50",
    link: "/autolegaldraftgenerator"
  },
  {
    icon: <GitBranch size={40} className="text-amber-500" />,
    title: "Legal Remedy Flowchart",
    description: "Input your legal question and get a visual flowchart showing each step of the process with timelines and requirements.",
    color: "bg-amber-50",
    link: "/flowchart"
  },
  {
    icon: <CheckSquare size={40} className="text-teal-500" />,
    title: "\"Is It Legal?\" Checker",
    description: "Ask simple legal compliance questions and get clear YES/NO answers with relevant sections and legal justification.",
    color: "bg-teal-50",
    link: "/isitlegal"
  },
  {
    icon: <Link size={40} className="text-red-500" />,
    title: "Penalty Predictor",
    description: "Enter case details or alleged offenses to receive an estimate of likely penalties, fines, or jail time based on IPC or other relevant laws.",
    color: "bg-red-50",
    link: "/penaltyPredictor"
  },
  {
    icon: <Scale size={40} className="text-indigo-500" />,
    title: "Judgment Outcome Predictor",
    description: "Get AI-powered predictions on case outcomes, including probability of success, likely verdict, and applicable legal reasoning.",
    color: "bg-indigo-50",
    link: "/judicialprediction"
  }
];

export default function Features() {
  const router = useRouter();
  const [hoveredCard, setHoveredCard] = useState(0);

  const handleCardClick = (link: string) => {
    router.push(link);
  };

  return (
    <section id="features" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Transforming Legal Work with AI</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Our comprehensive suite of AI-powered tools helps legal professionals save time, 
            improve accuracy, and deliver better client outcomes.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className={`${feature.color} p-8 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer relative overflow-hidden group`}
              onClick={() => handleCardClick(feature.link)}
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(0)}
            >
              <div className="mb-5">{feature.icon}</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-600">{feature.description}</p>
              
              <div className={`absolute bottom-4 right-4 transition-all duration-300 transform ${hoveredCard === index ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
                <div className="bg-white p-2 rounded-full shadow-md">
                  <ArrowRight size={20} className="text-slate-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}