
export default function Testimonials() {
    return (
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Trusted by Legal Professionals</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              See how JurisSmart is transforming legal practice for lawyers, law firms, and organizations.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 font-bold text-xl mr-4">
                  RG
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Rahul Gupta</h4>
                  <p className="text-slate-500 text-sm">Corporate Lawyer, Delhi</p>
                </div>
              </div>
              <p className="text-slate-700 mb-4">
                &quot;The document analysis feature has saved me countless hours reviewing contracts. It accurately identifies key clauses and potential issues that need attention.&quot;
              </p>
              <div className="flex text-amber-400">
                <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
              </div>
            </div>
            
            {/* Testimonial 2 */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 font-bold text-xl mr-4">
                  PS
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Priya Sharma</h4>
                  <p className="text-slate-500 text-sm">Legal Consultant, Mumbai</p>
                </div>
              </div>
              <p className="text-slate-700 mb-4">
                &quot;The flowchart generator has been invaluable for explaining complex legal procedures to clients. It makes my job easier and improves client satisfaction.&quot;
              </p>
              <div className="flex text-amber-400">
                <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
              </div>
            </div>
            
            {/* Testimonial 3 */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 font-bold text-xl mr-4">
                  AK
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Amit Kumar</h4>
                  <p className="text-slate-500 text-sm">Law Firm Partner, Bangalore</p>
                </div>
              </div>
              <p className="text-slate-700 mb-4">
                &quot;The AI Legal Chatbot has become our 24/7 first-line response for client inquiries. It handles routine questions efficiently, allowing our team to focus on complex matters.&quot;
              </p>
              <div className="flex text-amber-400">
                <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }