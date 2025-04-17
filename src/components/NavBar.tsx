"use client";
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import Link from 'next/link';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="py-4 border-b border-gray-100">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="text-2xl font-bold text-slate-900">
            JURISSMART.
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <Link href="/" className="text-slate-900 hover:text-blue-500 transition-colors">
            Home
          </Link>
          <div className="relative group">
            <Link href="/autolegaldraftgenerator" className="text-slate-900 hover:text-blue-500 transition-colors flex items-center">
            Draft Generator
            </Link>
          </div>
          <Link href="/Chat" className="text-slate-900 hover:text-blue-500 transition-colors">
            Chat
          </Link>
        </div>
        
        <div className="hidden md:block">
          <Button variant="default" className="bg-gradient-to-r from-blue-500 to-blue-400 text-white">
            Register
          </Button>
        </div>
        
        {/* Mobile Navigation Toggle */}
        <div className="md:hidden">
          <button
            className="text-slate-900"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden mt-4 bg-white border-t border-gray-100">
          <div className="container mx-auto px-4 py-2">
            <div className="flex flex-col space-y-3">
              <Link href="/" className="text-slate-900 hover:text-blue-500 py-2 transition-colors">
                Home
              </Link>
              <a href="#features" className="text-slate-900 hover:text-blue-500 py-2 transition-colors">
                Features
              </a>
              <a href="#" className="text-slate-900 hover:text-blue-500 py-2 transition-colors">
                Pricing
              </a>
              <a href="#" className="text-slate-900 hover:text-blue-500 py-2 transition-colors">
                Blog
              </a>
              <Button variant="default" className="bg-gradient-to-r from-blue-500 to-blue-400 text-white w-full">
                Register
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}