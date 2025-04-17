"use client";
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DemoSection() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API response
    setTimeout(() => {
      setIsLoading(false);
      if (query.toLowerCase().includes('recording') || query.toLowerCase().includes('call')) {
        setResponse(`
          <div class="p-4 border-l-4 border-blue-500 bg-blue-50 rounded">
            <div class="font-bold text-lg mb-2">Legal Status: PARTIALLY LEGAL</div>
            <p class="mb-2">Recording calls in India is legal under specific conditions:</p>
            <ul class="list-disc pl-5 mb-3">
              <li>If you are a party to the call, you may record it for personal use</li>
              <li>Recording for blackmail or harassment is illegal (Section 503, IPC)</li>
              <li>Recording for extortion is illegal (Section 383, IPC)</li>
              <li>Publishing private conversation without consent may violate privacy laws</li>
            </ul>
            <p class="text-sm italic">Relevant laws: Information Technology Act, 2000; Indian Telegraph Act, 1885</p>
          </div>
        `);
      } else {
        setResponse(`
          <div class="p-4 border-l-4 border-orange-500 bg-orange-50 rounded">
            <p>Please ask a specific legal question. For example: "Is recording a call legal in India?" or "Can I file an FIR online?"</p>
          </div>
        `);
      }
    }, 1500);
  };

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Try Our Features</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Experience the power of our AI-driven legal tools with these interactive demos.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="legal-check" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="legal-check">Is It Legal? Checker</TabsTrigger>
              <TabsTrigger value="chatbot">Legal Chatbot</TabsTrigger>
            </TabsList>
            
            <TabsContent value="legal-check" className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <h3 className="text-xl font-bold mb-4 text-slate-900">Check Legal Compliance</h3>
              <p className="text-slate-600 mb-6">
                Ask a simple yes/no legal question to get immediate guidance with relevant legal provisions.
              </p>
              
              <form onSubmit={handleSubmit} className="mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g., Is recording a call legal in India?"
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700 px-6"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Checking...' : 'Check'}
                  </Button>
                </div>
              </form>
              
              {response && (
                <div className="mt-6" dangerouslySetInnerHTML={{ __html: response }}></div>
              )}
            </TabsContent>
            
            <TabsContent value="chatbot" className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <h3 className="text-xl font-bold mb-4 text-slate-900">Ask Our Legal AI</h3>
              <p className="text-slate-600 mb-6">
                Ask any legal question and get comprehensive answers based on Indian law.
              </p>
              
              <div className="bg-slate-50 rounded-lg p-4 mb-4 h-64 overflow-y-auto flex flex-col">
                <div className="bg-blue-100 rounded-lg p-3 max-w-[80%] mb-4 self-start">
                  <p className="text-sm font-medium text-slate-900">AI Assistant</p>
                  <p className="text-slate-700">Hello! I&apos;m your AI legal assistant. How can I help you today?</p>
                </div>
                
                {query && response && (
                  <>
                    <div className="bg-slate-200 rounded-lg p-3 max-w-[80%] mb-4 self-end">
                      <p className="text-sm font-medium text-slate-900">You</p>
                      <p className="text-slate-700">{query}</p>
                    </div>
                    
                    <div className="bg-blue-100 rounded-lg p-3 max-w-[80%] self-start">
                      <p className="text-sm font-medium text-slate-900">AI Assistant</p>
                      <p className="text-slate-700">Recording calls in India is legal if you&apos;re a party to the call and it&apos;s for personal use. However, recording for blackmail, harassment, or extortion is illegal under IPC Sections 503 and 383. Publishing private conversations without consent may also violate privacy laws.</p>
                    </div>
                  </>
                )}
              </div>
              
              <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a legal question..."
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 px-6"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
}