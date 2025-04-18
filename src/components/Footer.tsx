
export default function Footer() {
    return (
      <footer className="bg-slate-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">JUGGERNAUT.</h3>
              <p className="text-slate-400 mb-4">
                AI-powered legal assistance for professionals and individuals.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Features</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">AI Legal Chatbot</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Document Uploader</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Draft Generator</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Legal Notice Creator</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Flowchart Generator</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Legal Checker</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Disclaimer</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-500">
            <p>&copy; {new Date().getFullYear()} JurisSmart. All rights reserved.</p>
          </div>
        </div>
      </footer>
    );
  }