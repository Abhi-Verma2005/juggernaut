"use client";
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Loader2, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const LegalDocumentAnalyzer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setAnalysis(null);
      
      // Simulate PDF text extraction
      // In a real app, you would use a PDF parsing library
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          // For demo purposes, we're just using the first few bytes as a placeholder
          // In production, you'd properly extract text from the PDF
          setFileContent(`Sample content from ${e.target.files?.[0].name}`);
        }
      };
      reader.readAsText(e.target.files[0]);
    }
  };

  const analyzeDocument = async () => {
    if (!file || !documentType || !fileContent) {
      setError("Please select a document and document type");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Initialize the Gemini API client
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      
      // Create prompt based on document type
      const prompt = createPromptForDocumentType(documentType, fileContent);
      
      // Call Gemini API
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse the response into structured data
      // This is a simplified version; in practice, you'd want more robust parsing
      const parsedAnalysis = parseAnalysisResponse(text, documentType);
      
      setAnalysis(parsedAnalysis);
    } catch (err) {
      console.error("Error analyzing document:", err);
      setError("Failed to analyze document. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const createPromptForDocumentType = (type: string, content: string) => {
    const basePrompt = `
    You are a legal document analyzer specializing in Indian legal documents. 
    Analyze the following ${type} document and extract key information in a structured format.
    
    Extract these details:
    - Party Names (all plaintiffs, defendants, petitioners, respondents)
    - Filing & Hearing Dates (include all important dates)
    - Provisions/Sections Cited (include act names with section numbers)
    - Judgment Summary (concise 3-5 sentence summary of the outcome)
    
    Format your response as JSON with these fields: partyNames (array), dates (array of objects with date and description), provisions (array), judgmentSummary (string).
    
    Document content:
    ${content}
    `;
    
    return basePrompt;
  };
  
  const parseAnalysisResponse = (response: string) => {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback to simple parsing if JSON extraction fails
      return {
        partyNames: ["Extraction failed - see full analysis"],
        dates: [{ date: "N/A", description: "See full analysis" }],
        provisions: ["See full analysis"],
        judgmentSummary: response.substring(0, 500) + "..."
      };
    } catch (err) {
      console.error("Error parsing response:", err);
      return {
        partyNames: ["Parsing error - see full analysis"],
        dates: [{ date: "N/A", description: "See full analysis" }],
        provisions: ["See full analysis"],
        judgmentSummary: response.substring(0, 500) + "..."
      };
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-4xl mx-auto bg-white shadow-lg">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="text-2xl font-bold text-slate-900">Legal Document Analyzer</CardTitle>
          <CardDescription>Upload a legal document for AI-powered analysis and information extraction</CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div>
              <Label htmlFor="document-type" className="text-sm font-medium">Document Type</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fir">FIR (First Information Report)</SelectItem>
                  <SelectItem value="judgment">Court Judgment</SelectItem>
                  <SelectItem value="petition">Legal Petition</SelectItem>
                  <SelectItem value="contract">Legal Contract</SelectItem>
                  <SelectItem value="other">Other Legal Document</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="document-upload" className="text-sm font-medium">Upload Document (PDF)</Label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-slate-300 rounded-md hover:border-slate-400 transition-colors">
                <div className="space-y-2 text-center">
                  <Upload className="mx-auto h-12 w-12 text-slate-400" />
                  <div className="flex text-sm text-slate-600">
                    <label htmlFor="document-upload" className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                      <span>Upload a file</span>
                      <Input
                        id="document-upload"
                        name="document-upload"
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-slate-500">PDF up to 10MB</p>
                </div>
              </div>
              {file && (
                <p className="text-sm text-slate-500">
                  Selected: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
            
            <Button 
              onClick={analyzeDocument}
              disabled={!file || !documentType || isLoading}
              className="w-full"
              variant="default"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : "Analyze Document"}
            </Button>
            
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
        
        {analysis && (
          <CardFooter className="flex flex-col p-0">
            <Separator />
            <div className="p-6 w-full">
              <h3 className="text-xl font-semibold mb-4 text-slate-900">Document Analysis</h3>
              
              <Tabs defaultValue="summary" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>
                
                <TabsContent value="summary" className="space-y-4">
                  <div>
                    <h4 className="text-md font-medium text-slate-700 mb-2">Judgment Summary</h4>
                    <p className="text-slate-600 text-sm">{analysis.judgmentSummary}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-md font-medium text-slate-700 mb-2">Key Provisions</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.provisions.map((provision: string, i: number) => (
                        <Badge key={i} variant="outline" className="bg-slate-100">{provision}</Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="details" className="space-y-4">
                  <div>
                    <h4 className="text-md font-medium text-slate-700 mb-2">Party Names</h4>
                    <ul className="list-disc pl-5 text-slate-600 text-sm">
                      {analysis.partyNames.map((party: string, i: number) => (
                        <li key={i}>{party}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-md font-medium text-slate-700 mb-2">Important Dates</h4>
                    <div className="space-y-2">
                      {analysis.dates.map((dateObj: {date: string, description: string}, i: number) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="font-medium text-slate-700">{dateObj.date}</span>
                          <span className="text-slate-600">{dateObj.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-md font-medium text-slate-700 mb-2">Provisions & Sections Cited</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.provisions.map((provision: string, i: number) => (
                        <Badge key={i} variant="outline" className="bg-slate-100">{provision}</Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default LegalDocumentAnalyzer;