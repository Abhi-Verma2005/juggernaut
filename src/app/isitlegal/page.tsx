"use client";
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Scale, Loader2, AlertTriangle, FileCheck, Calendar, BookOpen, Ban, CheckCircle, HelpCircle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const IsItLegalPage = () => {
  const [incidentDescription, setIncidentDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);
  const [progressValue, setProgressValue] = useState(0);
  const [error, setError] = useState(null);
  const [legalAssessment, setLegalAssessment] = useState(null);

  const assessLegality = async () => {
    if (!incidentDescription) {
      setError("Please describe the incident or situation");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setProcessingStage(1);
      setProgressValue(25);
      
      // Initialize the Gemini API client
      const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "YOUR_API_KEY";
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      // Create prompt for legal assessment
      const prompt = createLegalAssessmentPrompt(incidentDescription);
      
      setProcessingStage(2);
      setProgressValue(50);
      
      try {
        // Make the API call to Gemini
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        setProgressValue(75);
        
        // Parse the JSON response
        try {
          // Look for a JSON block in the text
          const jsonMatch = text.match(/```json([\s\S]*?)```/) || 
                         text.match(/{[\s\S]*}/) ||
                         text.match(/\[[\s\S]*\]/);
          
          let parsedResponse;
          if (jsonMatch) {
            // Clean up the JSON string to parse it
            const jsonStr = jsonMatch[0].replace(/```json|```/g, '').trim();
            parsedResponse = JSON.parse(jsonStr);
          } else {
            // If no JSON block found, create a structured response from the text
            parsedResponse = {
              status: "Unknown",
              explanation: text,
              simpleSummary: "This assessment requires further legal analysis.",
              legalBasis: "Based on relevant Indian legal provisions",
              examples: ["Similar case example would be shown here"],
              nextSteps: ["Consult with a legal professional"]
            };
          }
          
          // Add a simple summary if not provided
          if (!parsedResponse.simpleSummary) {
            const statusMap = {
              "VALID": "This situation appears to be legally valid according to Indian law.",
              "VOID": "This situation appears to be legally void according to Indian law.",
              "VOIDABLE": "This situation appears to be voidable under certain conditions according to Indian law."
            };
            parsedResponse.simpleSummary = statusMap[parsedResponse.status] || "This assessment requires further legal analysis.";
          }
          
          setLegalAssessment(parsedResponse);
        } catch (jsonError) {
          console.error("Failed to parse JSON from Gemini response:", jsonError);
          // Fallback: use the text as is
          setLegalAssessment({
            status: "Unknown",
            explanation: text,
            simpleSummary: "This assessment requires further legal analysis.",
            legalBasis: "Based on relevant Indian legal provisions",
            examples: ["Similar case example would be shown here"],
            nextSteps: ["Consult with a legal professional"]
          });
        }
        
        setProcessingStage(3);
        setProgressValue(100);
      } catch (apiError) {
        console.error("Error calling Gemini API:", apiError);
        setError("Failed to generate assessment. Please try again.");
      }
    } catch (err) {
      console.error("Error generating legal assessment:", err);
      setError("Failed to generate assessment. Please try again.");
    } finally {
      setTimeout(() => {
        setIsLoading(false);
        setProcessingStage(0);
        setProgressValue(0);
      }, 500);
    }
  };

  const createLegalAssessmentPrompt = (description) => {
    const prompt = `
    You are an expert legal advisor specializing in Indian law. Analyze the following situation and determine whether it is legally VALID, VOID, or VOIDABLE according to Indian law. 

    Respond with a JSON object that contains the following properties:
    1. "status" - Must be exactly one of these three values: "VALID", "VOID", or "VOIDABLE"
    2. "simpleSummary" - A very brief, 1-2 sentence plain language summary of the assessment
    3. "explanation" - A detailed explanation of your assessment and reasoning
    4. "legalBasis" - The specific Indian laws, sections, or precedents that support your assessment
    5. "examples" - An array of 2-3 similar historical cases or examples
    6. "nextSteps" - An array of recommended actions the person should take

    Format your response like this:
    {
      "status": "VALID" or "VOID" or "VOIDABLE",
      "simpleSummary": "Very brief 1-2 sentence summary in plain language",
      "explanation": "Detailed explanation of why this situation has this legal status...",
      "legalBasis": "Relevant sections of Indian law that apply...",
      "examples": ["Example case 1 with outcome", "Example case 2 with outcome", "Example case 3 with outcome"],
      "nextSteps": ["Recommended action 1", "Recommended action 2", "Recommended action 3"]
    }

    The situation to assess:
    ${description}
    `;
    
    return prompt;
  };

  const getProcessingStageText = () => {
    switch (processingStage) {
      case 1: return "Analyzing situation...";
      case 2: return "Applying Indian legal framework...";
      case 3: return "Finalizing assessment...";
      default: return "Processing...";
    }
  };

  const getStatusBadge = (status) => {
    if (!status) return null;
    
    switch(status.toUpperCase()) {
      case "VALID":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-0 text-base px-3 py-1">Valid</Badge>;
      case "VOID":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-0 text-base px-3 py-1">Void</Badge>;
      case "VOIDABLE":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-0 text-base px-3 py-1">Voidable</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-800 border-0 text-base px-3 py-1">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status) => {
    if (!status) return <HelpCircle className="h-10 w-10 text-slate-400" />;
    
    switch(status.toUpperCase()) {
      case "VALID":
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case "VOID":
        return <Ban className="h-12 w-12 text-red-500" />;
      case "VOIDABLE":
        return <AlertTriangle className="h-12 w-12 text-amber-500" />;
      default:
        return <HelpCircle className="h-12 w-12 text-slate-400" />;
    }
  };

  const getStatusColor = (status) => {
    if (!status) return "bg-slate-50";
    
    switch(status.toUpperCase()) {
      case "VALID": return "bg-green-50 border-green-100";
      case "VOID": return "bg-red-50 border-red-100";
      case "VOIDABLE": return "bg-amber-50 border-amber-100";
      default: return "bg-slate-50 border-slate-100";
    }
  };

  const getStatusTextColor = (status) => {
    if (!status) return "text-slate-800";
    
    switch(status.toUpperCase()) {
      case "VALID": return "text-green-800";
      case "VOID": return "text-red-800";
      case "VOIDABLE": return "text-amber-800";
      default: return "text-slate-800";
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="flex items-center mb-8 space-x-2">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Scale className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Is It Legal?</h1>
            <p className="text-slate-500 mt-1">Get expert assessment on legal situations under Indian law</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-lg">
                <CardTitle className="text-xl font-medium flex items-center text-slate-800">
                  <BookOpen className="h-5 w-5 mr-2 text-indigo-500" />
                  Describe Your Situation
                </CardTitle>
                <CardDescription>Provide details for legal assessment</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 pb-2">
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="situation" className="text-slate-700 font-medium">Incident or Situation</Label>
                    <Textarea
                      id="situation"
                      placeholder="Describe the legal situation or incident in detail. Include relevant dates, parties involved, agreements made, and any other important context..."
                      className="mt-1.5 min-h-40 border-slate-300 bg-white resize-none"
                      value={incidentDescription}
                      onChange={(e) => setIncidentDescription(e.target.value)}
                    />
                    <p className="text-xs text-slate-500 mt-1.5">Be specific and provide all relevant details for accurate assessment</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-lg">
                <Button
                  onClick={assessLegality}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  disabled={!incidentDescription || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Assess Legality
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
            
            <div className="mt-6">
              <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Legal Disclaimer</AlertTitle>
                <AlertDescription className="text-amber-700 text-sm">
                  This assessment is for informational purposes only and does not constitute legal advice. Always consult with a qualified lawyer for specific legal guidance.
                </AlertDescription>
              </Alert>
            </div>
            
            {isLoading && (
              <Card className="mt-6 shadow-sm border-slate-200">
                <CardContent className="pt-6 pb-4">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-slate-700">
                        {getProcessingStageText()}
                      </span>
                    </div>
                    <Progress value={progressValue} className="h-2 bg-slate-100" />
                    <p className="text-xs text-slate-500">This may take a moment...</p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {error && (
              <Alert variant="destructive" className="mt-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          
          <div className="lg:col-span-2">
            {legalAssessment ? (
              <div className="space-y-6">
                {/* New prominent legal status card */}
                <Card className={`shadow-md border-2 ${getStatusColor(legalAssessment.status)}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
                      <div className="shrink-0">
                        {getStatusIcon(legalAssessment.status)}
                      </div>
                      <div className="text-center md:text-left">
                        <div className="mb-2">
                          <span className="text-3xl font-bold uppercase tracking-tight inline-flex items-center gap-2 mb-1">
                            <span className={getStatusTextColor(legalAssessment.status)}>
                              {legalAssessment.status}
                            </span>
                          </span>
                        </div>
                        <p className="text-lg text-slate-700">{legalAssessment.simpleSummary}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Tabs defaultValue="assessment" className="w-full">
                  <TabsList className="grid grid-cols-3 w-full mb-2 bg-slate-100">
                    <TabsTrigger value="assessment" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm">
                      <Scale className="h-4 w-4 mr-2" />
                      Assessment
                    </TabsTrigger>
                    <TabsTrigger value="examples" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm">
                      <FileCheck className="h-4 w-4 mr-2" />
                      Similar Cases
                    </TabsTrigger>
                    <TabsTrigger value="next-steps" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      Next Steps
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="assessment" className="mt-0">
                    <Card className="shadow-sm border-slate-200">
                      <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 px-6">
                        <CardTitle className="text-lg font-medium text-slate-800">Legal Analysis</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="bg-white p-4 rounded-md border border-slate-200">
                          <h3 className="text-md font-medium text-slate-800 mb-2">Explanation</h3>
                          <p className="text-sm text-slate-700">{legalAssessment.explanation}</p>
                        </div>
                        
                        <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                          <h3 className="text-md font-medium text-slate-800 mb-2">Legal Basis</h3>
                          <p className="text-sm text-slate-700">{legalAssessment.legalBasis}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="examples" className="mt-0">
                    <Card className="shadow-sm border-slate-200">
                      <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 px-6">
                        <CardTitle className="text-lg font-medium text-slate-800">Similar Cases & Examples</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {legalAssessment.examples.map((example, index) => (
                            <div key={index} className="bg-white p-4 rounded-md border border-slate-200">
                              <h3 className="text-md font-medium text-slate-800 mb-2">Example {index + 1}</h3>
                              <p className="text-sm text-slate-700">{example}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="next-steps" className="mt-0">
                    <Card className="shadow-sm border-slate-200">
                      <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 px-6">
                        <CardTitle className="text-lg font-medium text-slate-800">Recommended Next Steps</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="bg-white p-4 rounded-md border border-slate-200">
                          <ul className="space-y-3">
                            {legalAssessment.nextSteps.map((step, index) => (
                              <li key={index} className="flex items-start">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50 text-xs font-medium text-indigo-600">
                                  {index + 1}
                                </span>
                                <span className="ml-3 text-sm text-slate-700">{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
                
                <Alert className="bg-indigo-50 border-indigo-100 text-indigo-800">
                  <AlertTriangle className="h-4 w-4 text-indigo-500" />
                  <AlertTitle className="text-indigo-800 font-medium">Important Notice</AlertTitle>
                  <AlertDescription className="text-indigo-700 text-sm">
                    This assessment is AI-generated based on the information provided and general legal principles.
                    Every legal situation has unique aspects that may affect the outcome. For specific advice related
                    to your situation, please consult with a qualified legal professional.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px] rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
                <div className="space-y-2">
                  <div className="flex justify-center">
                    <div className="rounded-full bg-slate-100 p-3">
                      <Scale className="h-6 w-6 text-slate-400" />
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-slate-900">No legal assessment yet</h3>
                  <p className="text-sm text-slate-500 max-w-md">
                    Describe your legal situation in detail on the left to receive an expert assessment based on Indian law.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IsItLegalPage;