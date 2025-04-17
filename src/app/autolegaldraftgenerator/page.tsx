"use client";
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Loader2, FileText, Download, BookOpen, Scale, Calendar, AlertTriangle, FileCheck, Settings, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

const LegalDraftGenerator = () => {
  const [documentType, setDocumentType] = useState("");
  const [userDescription, setUserDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);
  const [progressValue, setProgressValue] = useState(0);
  const [error, setError] = useState(null);
  const [generatedDraft, setGeneratedDraft] = useState(null);
  const [explanations, setExplanations] = useState(null);

  const generateLegalDraft = async () => {
    if (!documentType || !userDescription) {
      setError("Please select a document type and provide requirements");
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
      
      // Create prompt based on document type
      const prompt = createPromptForDocumentType(documentType, userDescription);
      
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
              draft: text,
              explanations: {
                legalBasis: "Based on relevant Indian legal provisions",
                keyPoints: ["Generated based on your requirements"],
                nextSteps: ["Review the draft", "Consult with a legal professional before finalizing"]
              }
            };
          }
          
          setGeneratedDraft(parsedResponse.draft);
          setExplanations(parsedResponse.explanations);
        } catch (jsonError) {
          console.error("Failed to parse JSON from Gemini response:", jsonError);
          // Fallback: use the text as is
          setGeneratedDraft(text);
          setExplanations({
            legalBasis: "Based on relevant Indian legal provisions",
            keyPoints: ["Generated based on your requirements"],
            nextSteps: ["Review the draft", "Consult with a legal professional before finalizing"]
          });
        }
        
        setProcessingStage(3);
        setProgressValue(100);
      } catch (apiError) {
        console.error("Error calling Gemini API:", apiError);
        setError("Failed to generate draft. Please try again.");
      }
    } catch (err) {
      console.error("Error generating legal draft:", err);
      setError("Failed to generate draft. Please try again.");
    } finally {
      setTimeout(() => {
        setIsLoading(false);
        setProcessingStage(0);
        setProgressValue(0);
      }, 500);
    }
  };

  const createPromptForDocumentType = (type, description) => {
    const basePrompt = `
    You are an expert legal document generator specializing in Indian legal documents. 
    Generate a professional ${type} based on the following user description.
    
    The document must strictly adhere to Indian judicial laws and legal standards. Include all necessary clauses, 
    provisions, and formatting required for such documents in India.
    
    Respond with a JSON object that contains two properties:
    1. "draft" - The complete legal document text with proper formatting and clauses
    2. "explanations" - An object containing:
       - "legalBasis": explanation of the legal foundation for this document
       - "keyPoints": array of the most important aspects of the document
       - "nextSteps": array of what the user should do next with this document
    
    Format your response like this:
    {
      "draft": "FULL TEXT OF THE LEGAL DOCUMENT WITH PROPER FORMATTING",
      "explanations": {
        "legalBasis": "Explanation of Indian laws relevant to this document",
        "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
        "nextSteps": ["Step 1", "Step 2", "Step 3"]
      }
    }
    
    User's requirements:
    ${description}
    `;
    
    return basePrompt;
  };

  const downloadDraft = () => {
    if (!generatedDraft) return;
    
    const fileName = `${documentType.replace(/\s+/g, '-').toLowerCase()}-draft.txt`;
    const fileContent = generatedDraft;
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const href = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = href;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const getProcessingStageText = () => {
    switch (processingStage) {
      case 1: return "Analyzing requirements...";
      case 2: return "Drafting document with Indian legal framework...";
      case 3: return "Finalizing document...";
      default: return "Processing...";
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
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Legal Draft Generator</h1>
            <p className="text-slate-500 mt-1">Generate professional legal documents compliant with Indian judicial laws</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-lg">
                <CardTitle className="text-xl font-medium flex items-center text-slate-800">
                  <Settings className="h-5 w-5 mr-2 text-indigo-500" />
                  Document Parameters
                </CardTitle>
                <CardDescription>Configure your legal document</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 pb-2">
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="document-type" className="text-slate-700 font-medium">Document Type</Label>
                    <Select value={documentType} onValueChange={setDocumentType}>
                      <SelectTrigger id="document-type" className="mt-1.5 border-slate-300 bg-white">
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Legal Notice">Legal Notice</SelectItem>
                        <SelectItem value="Rent Agreement">Rent Agreement</SelectItem>
                        <SelectItem value="Employment Contract">Employment Contract</SelectItem>
                        <SelectItem value="Non-Disclosure Agreement">Non-Disclosure Agreement</SelectItem>
                        <SelectItem value="Partnership Deed">Partnership Deed</SelectItem>
                        <SelectItem value="Will">Will</SelectItem>
                        <SelectItem value="Affidavit">Affidavit</SelectItem>
                        <SelectItem value="Power of Attorney">Power of Attorney</SelectItem>
                        <SelectItem value="Service Agreement">Service Agreement</SelectItem>
                        <SelectItem value="Sale Deed">Sale Deed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="requirements" className="text-slate-700 font-medium">Document Requirements</Label>
                    <Textarea
                      id="requirements"
                      placeholder="Describe the specific details, parties involved, terms, conditions, and any other relevant information needed for your legal document..."
                      className="mt-1.5 min-h-32 border-slate-300 bg-white resize-none"
                      value={userDescription}
                      onChange={(e) => setUserDescription(e.target.value)}
                    />
                    <p className="text-xs text-slate-500 mt-1.5">Be specific and include all relevant information</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-lg">
                <Button
                  onClick={generateLegalDraft}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  disabled={!documentType || !userDescription || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>Generate Document</>
                  )}
                </Button>
              </CardFooter>
            </Card>
            
            <div className="mt-6">
              <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Legal Disclaimer</AlertTitle>
                <AlertDescription className="text-amber-700 text-sm">
                  The documents generated are for reference only. Always consult with a qualified legal professional before using any document for official purposes.
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
            {generatedDraft ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <h2 className="text-xl font-semibold tracking-tight text-slate-800">Generated Document</h2>
                    <Badge className="ml-3 bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-0">{documentType}</Badge>
                  </div>
                  <Button onClick={downloadDraft} variant="outline" className="flex items-center border-slate-300 hover:bg-slate-50 text-slate-700">
                    <Download className="h-4 w-4 mr-2 text-slate-500" />
                    Download
                  </Button>
                </div>
                
                <Tabs defaultValue="draft" className="w-full">
                  <TabsList className="grid grid-cols-2 w-full mb-2 bg-slate-100">
                    <TabsTrigger value="draft" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm">
                      <FileText className="h-4 w-4 mr-2" />
                      Draft Document
                    </TabsTrigger>
                    <TabsTrigger value="explanation" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Legal Explanation
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="draft" className="mt-0">
                    <Card className="shadow-sm border-slate-200">
                      <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 px-6">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg font-medium text-slate-800">Document Preview</CardTitle>
                          <Badge variant="outline" className="border-slate-300 text-slate-600 text-xs font-normal">
                            {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="bg-white p-6 whitespace-pre-wrap font-serif text-sm text-slate-800 leading-relaxed max-h-[600px] overflow-y-auto border-b border-slate-100">
                          {generatedDraft}
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end py-3 px-6 bg-slate-50 border-t border-slate-100">
                        <Button onClick={downloadDraft} variant="outline" className="flex items-center border-slate-300 hover:bg-slate-100 text-slate-700">
                          <Download className="h-4 w-4 mr-2 text-slate-500" />
                          Download Document
                        </Button>
                      </CardFooter>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="explanation" className="mt-0">
                    <Card className="shadow-sm border-slate-200">
                      <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 px-6">
                        <CardTitle className="text-lg font-medium text-slate-800">Legal Analysis</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        {explanations && (
                          <>
                            <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                              <h3 className="text-md font-medium flex items-center mb-2 text-slate-800">
                                <Scale className="h-4 w-4 mr-2 text-indigo-500" />
                                Legal Basis
                              </h3>
                              <p className="text-sm text-slate-700">{explanations.legalBasis}</p>
                            </div>
                            
                            <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                              <h3 className="text-md font-medium flex items-center mb-2 text-slate-800">
                                <FileCheck className="h-4 w-4 mr-2 text-indigo-500" />
                                Key Points
                              </h3>
                              <ul className="space-y-2 pl-6">
                                {explanations.keyPoints.map((point, index) => (
                                  <li key={index} className="text-sm text-slate-700 list-disc">{point}</li>
                                ))}
                              </ul>
                            </div>
                            
                            <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                              <h3 className="text-md font-medium flex items-center mb-2 text-slate-800">
                                <Calendar className="h-4 w-4 mr-2 text-indigo-500" />
                                Next Steps
                              </h3>
                              <ul className="space-y-2 pl-6">
                                {explanations.nextSteps.map((step, index) => (
                                  <li key={index} className="text-sm text-slate-700 list-disc">{step}</li>
                                ))}
                              </ul>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
                
                <Alert className="bg-indigo-50 border-indigo-100 text-indigo-800">
                  <AlertTriangle className="h-4 w-4 text-indigo-500" />
                  <AlertTitle className="text-indigo-800 font-medium">Important Notice</AlertTitle>
                  <AlertDescription className="text-indigo-700 text-sm">
                    This document is AI-generated based on your requirements and is not a substitute for legal advice.
                    Before using this document for any official purpose, please consult with a qualified legal professional
                    to ensure it meets your specific needs and complies with current Indian law.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px] rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
                <div className="space-y-2">
                  <div className="flex justify-center">
                    <div className="rounded-full bg-slate-100 p-3">
                      <FileText className="h-6 w-6 text-slate-400" />
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-slate-900">No document generated yet</h3>
                  <p className="text-sm text-slate-500 max-w-md">
                    Select a document type and provide your requirements to generate a legal document that adheres to Indian judicial laws.
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

export default LegalDraftGenerator;