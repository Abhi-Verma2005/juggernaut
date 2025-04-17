"use client";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import useMessageStore from "@/store/messages";
import { 
  MessageCircle, 
  X, 
  Send, 
  Minimize2, 
  Maximize2,
  User,
  Brain,
  Clipboard,
  Check,
  Loader2
} from "lucide-react";

export default function AIChat() {
  const { 
    messages, 
    input, 
    setInput, 
    sendMessage, 
    isLoading,  
    setIsFocused
  } = useMessageStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const DEFAULT_HEIGHT = '44px';

  // Auto-scroll to bottom when messages change or loading state changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const copyToClipboard = (text: string, messageId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
    
    // Reset textarea height
    if (textAreaRef.current) {
      textAreaRef.current.style.height = DEFAULT_HEIGHT;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
      
      // Reset textarea height
      if (textAreaRef.current) {
        textAreaRef.current.style.height = DEFAULT_HEIGHT;
      }
    }
  };

  const handleInput = () => {
    const textarea = textAreaRef.current;
    if (textarea) {
      textarea.style.height = DEFAULT_HEIGHT;
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  };

  return (
    <>
      {/* Chat button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-blue-500 text-white p-4 rounded-full shadow-lg hover:from-blue-700 hover:to-blue-600 transition-all z-50"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
      
      {/* Chat interface */}
      {isOpen && (
        <div 
          className={`fixed ${isMinimized ? 'bottom-6 right-6 h-14 w-80' : 'bottom-6 right-6 h-[500px] w-[350px]'} 
            bg-white rounded-xl shadow-xl flex flex-col z-50 border border-slate-100 transition-all overflow-hidden`}
        >
          {/* Chat header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
            {isMinimized ? (
              <div className="flex items-center">
                <Brain className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="font-semibold text-slate-900">Legal Assistant</h3>
              </div>
            ) : (
              <div className="flex items-center">
                <Brain className="w-5 h-5 text-blue-500 mr-2" />
                <div>
                  <h3 className="font-semibold text-slate-900">Legal AI Assistant</h3>
                  <p className="text-xs text-blue-500">Online</p>
                </div>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Chat messages */}
          {!isMinimized && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex mb-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`relative max-w-[80%] rounded-lg p-3 ${
                      msg.sender === 'user' 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-none' 
                        : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center mb-1">
                        {msg.sender === 'user' ? (
                          <User size={16} className="mr-1 text-white" />
                        ) : (
                          <Brain className="w-4 h-4 text-blue-500 mr-1" />
                        )}
                        <span className="text-xs opacity-70 mx-1">
                          {msg.sender === 'user' ? 'You' : 'Assistant'} • {formatTime(msg.timestamp.toString())}
                        </span>
                      </div>
                      
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                      
                      <button 
                        className={`absolute bottom-2 right-2 p-1 rounded-md transition-all ${
                          msg.sender === 'user'
                            ? 'text-white hover:text-blue-200'
                            : 'text-blue-400 hover:text-blue-600'
                        }`}
                        onClick={() => copyToClipboard(msg.text, msg.id)}
                      >
                        {copiedMessageId === msg.id ? (
                          <Check size={16} className="text-green-500" />
                        ) : (
                          <Clipboard size={16}/>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex mb-4 justify-start">
                  <div className="flex max-w-[80%] rounded-lg p-4 bg-white text-slate-800 border border-slate-100 rounded-bl-none shadow-sm">
                    <div className="flex items-center space-x-2">
                      <Brain className="w-4 h-4 text-blue-500" />
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
          
          {/* Message input */}
          {!isMinimized && (
            <div className="p-[2px] border-t border-slate-100">
              <div 
                className="p-3 relative"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {/* Gradient border */}
                <div 
                  className={`absolute inset-0 rounded-lg border-[2px] border-transparent
                  bg-gradient-to-r from-blue-600 via-blue-500 to-blue-500 transition-all duration-300
                  ${isHovered ? 'opacity-100' : 'opacity-75'}`}
                />
                
                <form onSubmit={handleSubmit} className="relative">
                  <div className="relative">
                    <textarea
                      ref={textAreaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      onKeyDown={handleKeyDown}
                      onInput={handleInput}
                      placeholder="Ask me about legal matters..."
                      className="w-full px-3 py-2 text-base font-light text-slate-800 placeholder:text-slate-400
                        outline-none focus:ring-0 focus:border-transparent rounded-lg resize-none 
                        bg-slate-50 pr-10"
                      style={{ height: DEFAULT_HEIGHT }}
                    />
                    <Button 
                      type="submit" 
                      disabled={isLoading || !input.trim()}
                      className={`absolute right-2 bottom-2 p-1.5 rounded-md transition-all duration-200
                        ${isLoading || !input.trim() 
                          ? "bg-slate-200 text-slate-400" 
                          : "bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600"}`}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </form>
                
                {/* Character count - optional */}
                {input.trim().length > 0 && (
                  <div className="text-xs text-blue-500 font-medium text-right mt-1 pr-1">
                    {input.length} characters
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}