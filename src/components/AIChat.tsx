"use client";
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  MessageCircle, 
  X, 
  Send, 
  Minimize2, 
  Maximize2 
} from "lucide-react";

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{type: 'user' | 'bot', content: string}[]>([
    {type: 'bot', content: 'Hello! I\'m your legal AI assistant. How can I help you today?'}
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    // Add user message
    setMessages([...messages, {type: 'user', content: message}]);
    
    // Simulate bot response
    setTimeout(() => {
      let response = '';
      if (message.toLowerCase().includes('legal') || message.toLowerCase().includes('law')) {
        response = "I can help with your legal questions. Could you provide more specific details about your legal concern?";
      } else if (message.toLowerCase().includes('contract') || message.toLowerCase().includes('agreement')) {
        response = "For contract-related matters, I'd need to know what type of agreement you're interested in and the parties involved.";
      } else {
        response = "I'm your legal AI assistant. Could you ask me a question related to legal matters?";
      }
      setMessages(prev => [...prev, {type: 'bot', content: response}]);
    }, 1000);
    
    setMessage('');
  };

  return (
    <>
      {/* Chat button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all z-50"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
      
      {/* Chat interface */}
      {isOpen && (
        <div 
          className={`fixed ${isMinimized ? 'bottom-6 right-6 h-14 w-80' : 'bottom-6 right-6 h-[500px] w-[350px]'} 
            bg-white rounded-xl shadow-xl flex flex-col z-50 border border-gray-200 transition-all`}
        >
          {/* Chat header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            {isMinimized ? (
              <div className="flex items-center">
                <MessageCircle className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="font-semibold text-gray-900">Legal Assistant</h3>
              </div>
            ) : (
              <h3 className="font-semibold text-gray-900">Legal AI Assistant</h3>
            )}
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-gray-500 hover:text-gray-700"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Chat messages */}
          {!isMinimized && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-lg px-4 py-2 
                      ${msg.type === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-800'}`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Message input */}
          {!isMinimized && (
            <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
              <div className="flex items-center">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask me about legal matters..."
                  className="flex-1 border border-gray-300 rounded-l-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button 
                  type="submit" 
                  className="rounded-l-none rounded-r-md"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </>
  );
}