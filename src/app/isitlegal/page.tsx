"use client";
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Scale, Loader2, AlertTriangle, FileCheck, Calendar, BookOpen, Ban, CheckCircle, HelpCircle, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LegalAssessment {
  status: string;
  simpleSummary: string;
  explanation: string;
  legalBasis: string;
  examples: string[];
  nextSteps: string[];
}

const IsItLegalPage = () => {
  const [incidentDescription, setIncidentDescription] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [processingStage, setProcessingStage] = useState<number>(0);
  const [progressValue, setProgressValue] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [legalAssessment, setLegalAssessment] = useState<LegalAssessment | null>(null);

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
      const model: GenerativeModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
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
          
          let parsedResponse: LegalAssessment;
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
            const statusMap: Record<string, string> = {
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

  const createLegalAssessmentPrompt = (description: string): string => {
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

  const getProcessingStageText = (): string => {
    switch (processingStage) {
      case 1: return "Analyzing situation...";
      case 2: return "Applying Indian legal framework...";
      case 3: return "Finalizing assessment...";
      default: return "Processing...";
    }
  };

  const getStatusIcon = (status: string | undefined) => {
    if (!status) return <HelpCircle className="h-8 w-8 text-gray-400" />;
    
    switch(status.toUpperCase()) {
      case "VALID":
        return <CheckCircle className="h-8 w-8 text-emerald-600" />;
      case "VOID":
        return <Ban className="h-8 w-8 text-rose-600" />;
      case "VOIDABLE":
        return <AlertTriangle className="h-8 w-8 text-amber-600" />;
      default:
        return <HelpCircle className="h-8 w-8 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string | undefined): string => {
    if (!status) return "bg-gray-50 border-gray-200";
    
    switch(status.toUpperCase()) {
      case "VALID": return "bg-emerald-50 border-emerald-200";
      case "VOID": return "bg-rose-50 border-rose-200";
      case "VOIDABLE": return "bg-amber-50 border-amber-200";
      default: return "bg-gray-50 border-gray-200";
    }
  };

  const getStatusTextColor = (status: string | undefined): string => {
    if (!status) return "text-gray-800";
    
    switch(status.toUpperCase()) {
      case "VALID": return "text-emerald-700";
      case "VOID": return "text-rose-700";
      case "VOIDABLE": return "text-amber-700";
      default: return "text-gray-800";
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto py-10 px-4 max-w-6xl">
        <div className="flex items-center mb-10 space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Scale className="h-6 w-6 text-blue-700" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Is It Legal?</h1>
            <p className="text-gray-600 mt-1 text-sm">Expert legal assessment under Indian law</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="shadow-sm border border-gray-200 bg-white overflow-hidden">
              <CardHeader className="bg-gray-50 border-b border-gray-200 py-4 px-6">
                <CardTitle className="text-lg font-medium flex items-center text-gray-800">
                  <BookOpen className="h-4 w-4 mr-2 text-blue-600" />
                  Describe Your Situation
                </CardTitle>
                <CardDescription className="text-sm text-gray-500">Provide details for legal assessment</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 pb-2">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="situation" className="text-gray-700 font-medium text-sm">Incident or Situation</Label>
                    <Textarea
                      id="situation"
                      placeholder="Describe the legal situation or incident in detail. Include relevant dates, parties involved, agreements made, and any other important context..."
                      className="mt-1.5 min-h-40 border-gray-300 bg-white resize-none focus:ring-blue-500 focus:border-blue-500"
                      value={incidentDescription}
                      onChange={(e) => setIncidentDescription(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1.5">Be specific and provide all relevant details for accurate assessment</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <Button
                  onClick={assessLegality}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
            
            <div className="mt-4">
              <Alert className="bg-amber-50 border border-amber-200 text-amber-800 shadow-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800 text-sm font-medium">Legal Disclaimer</AlertTitle>
                <AlertDescription className="text-amber-700 text-xs">
                  This assessment is for informational purposes only and does not constitute legal advice. Always consult with a qualified lawyer for specific legal guidance.
                </AlertDescription>
              </Alert>
            </div>
            
            {isLoading && (
              <Card className="mt-4 shadow-sm border border-gray-200 bg-white">
                <CardContent className="pt-4 pb-4">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-700">
                        {getProcessingStageText()}
                      </span>
                    </div>
                    <Progress value={progressValue} className="h-1.5 bg-gray-100" />
                    <p className="text-xs text-gray-500">This may take a moment...</p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {error && (
              <Alert variant="destructive" className="mt-4 border border-rose-200 bg-rose-50 text-rose-800">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <AlertTitle className="text-sm font-medium">Error</AlertTitle>
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}
          </div>
          
          <div className="lg:col-span-2">
            {legalAssessment ? (
              <div className="space-y-5">
                {/* Updated legal status card */}
                <Card className={`shadow-sm border ${getStatusColor(legalAssessment.status)}`}>
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
                      <div className="shrink-0 flex items-center justify-center rounded-full bg-white shadow-sm h-16 w-16 p-2 border border-gray-100">
                        {getStatusIcon(legalAssessment.status)}
                      </div>
                      <div className="text-center md:text-left">
                        <div className="mb-2">
                          <span className={`text-2xl font-bold uppercase tracking-tight ${getStatusTextColor(legalAssessment.status)}`}>
                            {legalAssessment.status}
                          </span>
                        </div>
                        <p className="text-base text-gray-700">{legalAssessment.simpleSummary}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Tabs defaultValue="assessment" className="w-full">
                  <TabsList className="grid grid-cols-3 w-full mb-2 bg-gray-100 p-1 rounded-md">
                    <TabsTrigger value="assessment" className="text-sm data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm rounded">
                      <Scale className="h-3.5 w-3.5 mr-1.5" />
                      Assessment
                    </TabsTrigger>
                    <TabsTrigger value="examples" className="text-sm data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm rounded">
                      <FileCheck className="h-3.5 w-3.5 mr-1.5" />
                      Similar Cases
                    </TabsTrigger>
                    <TabsTrigger value="next-steps" className="text-sm data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm rounded">
                      <Calendar className="h-3.5 w-3.5 mr-1.5" />
                      Next Steps
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="assessment" className="mt-0">
                    <Card className="shadow-sm border border-gray-200 bg-white">
                      <CardHeader className="bg-gray-50 border-b border-gray-200 py-3 px-5">
                        <CardTitle className="text-base font-medium text-gray-800">Legal Analysis</CardTitle>
                      </CardHeader>
                      <CardContent className="p-5 space-y-4">
                        <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                          <h3 className="text-sm font-medium text-gray-800 mb-2">Explanation</h3>
                          <p className="text-sm text-gray-600 leading-relaxed">{legalAssessment.explanation}</p>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-md border border-gray-200 shadow-sm">
                          <h3 className="text-sm font-medium text-gray-800 mb-2">Legal Basis</h3>
                          <p className="text-sm text-gray-600 leading-relaxed">{legalAssessment.legalBasis}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="examples" className="mt-0">
                    <Card className="shadow-sm border border-gray-200 bg-white">
                      <CardHeader className="bg-gray-50 border-b border-gray-200 py-3 px-5">
                        <CardTitle className="text-base font-medium text-gray-800">Similar Cases & Examples</CardTitle>
                      </CardHeader>
                      <CardContent className="p-5">
                        <div className="space-y-3">
                          {legalAssessment.examples.map((example, index) => (
                            <div key={index} className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                              <h3 className="text-sm font-medium text-gray-800 mb-2 flex items-center">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-xs font-medium text-blue-600 mr-2">
                                  {index + 1}
                                </span>
                                Example
                              </h3>
                              <p className="text-sm text-gray-600 leading-relaxed">{example}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="next-steps" className="mt-0">
                    <Card className="shadow-sm border border-gray-200 bg-white">
                      <CardHeader className="bg-gray-50 border-b border-gray-200 py-3 px-5">
                        <CardTitle className="text-base font-medium text-gray-800">Recommended Next Steps</CardTitle>
                      </CardHeader>
                      <CardContent className="p-5">
                        <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                          <ul className="space-y-3">
                            {legalAssessment.nextSteps.map((step, index) => (
                              <li key={index} className="flex items-start">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-xs font-medium text-blue-600">
                                  {index + 1}
                                </span>
                                <span className="ml-3 text-sm text-gray-600">{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
                
                <Alert className="bg-blue-50 border border-blue-200 text-blue-800 shadow-sm">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800 font-medium text-sm">Important Notice</AlertTitle>
                  <AlertDescription className="text-blue-700 text-xs">
                    This assessment is AI-generated based on the information provided and general legal principles.
                    Every legal situation has unique aspects that may affect the outcome. For specific advice related
                    to your situation, please consult with a qualified legal professional.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px] rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <div className="rounded-full bg-gray-100 p-3 border border-gray-200">
                      <Scale className="h-6 w-6 text-gray-400" />
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">No legal assessment yet</h3>
                  <p className="text-sm text-gray-500 max-w-md">
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