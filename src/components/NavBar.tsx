"use client";
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { ChevronDown, Menu, X } from 'lucide-react';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);

  return (
    <nav className="py-4 border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold bg-clip-text bg-gradient-to-r text-black">
              Juggernaut<span className="text-slate-900">.</span>
            </span>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <Link href="/" className="text-slate-700 hover:text-blue-500 font-medium transition-colors">
            Home
          </Link>
          <Link href="/flowchart" className="text-slate-700 hover:text-blue-500 font-medium transition-colors">
            Flowchart
          </Link>
          <Link href="/documentUploader" className="text-slate-700 hover:text-blue-500 py-3 border-b border-slate-50 transition-colors">
            Docs Upload
          </Link>
          <Link href="/chat" className="text-slate-700 hover:text-blue-500 font-medium transition-colors">
            Chat
          </Link>
          
        </div>
        
        {/* Mobile Navigation Toggle */}
        <div className="md:hidden">
          <button
            className="text-slate-900 focus:outline-none"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden mt-1 bg-white border-t border-slate-100 shadow-lg absolute left-0 right-0 z-50">
          <div className="container mx-auto px-4 py-3">
            <div className="flex flex-col space-y-1">
              <Link href="/" className="text-slate-700 hover:text-blue-500 py-3 border-b border-slate-50 transition-colors">
                Home
              </Link>
              
              
              {isResourcesOpen && (
                <div className="pl-4 py-2 bg-slate-50 rounded-md mb-2">
                  <Link href="/guides" className="block py-2 text-slate-600 hover:text-blue-500">
                    Legal Guides
                  </Link>
                  <Link href="/templates" className="block py-2 text-slate-600 hover:text-blue-500">
                    Document Templates
                  </Link>
                  <Link href="/faq" className="block py-2 text-slate-600 hover:text-blue-500">
                    FAQ
                  </Link>
                </div>
              )}
              
              <Link href="/flowchart" className="text-slate-700 hover:text-blue-500 py-3 border-b border-slate-50 transition-colors">
                Flowchart
              </Link>
              <Link href="/documentUploader" className="text-slate-700 hover:text-blue-500 py-3 border-b border-slate-50 transition-colors">
                Docs Upload
              </Link>
              <Link href="/chat" className="text-slate-700 hover:text-blue-500 py-3 border-b border-slate-50 transition-colors">
                Chat
              </Link>
              
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}