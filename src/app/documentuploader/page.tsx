"use client";
import { SetStateAction, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  Loader2, Upload, FileText, BookOpen, Scale, Calendar, Users, 
  AlertTriangle, FileCheck, CheckCircle2, Gavel, ClipboardList, 
  BarChart4, FileSearch, ArrowRight, Info
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

// Define interfaces for our data structures
interface DateItem {
  date: string;
  description: string;
}

interface Party {
  name?: string;
  address?: string;
  represented?: string;
  description?: string;
}

interface Parties {
  complainant?: Party;
  accused?: Party[];
  petitioners?: Party[];
  respondents?: Party[];
}

interface Precedent {
  case: string;
  outcome: string;
}

interface AnalysisResult {
  documentType: string;
  fileNumber?: string;
  caseNumber?: string;
  court?: string;
  station?: string;
  bench?: string;
  issuingAuthority?: string;
  judgmentSummary?: string;
  parties: Parties;
  dates: DateItem[];
  provisions: string[];
  status: string;
  subject: string;
  keyPoints: string[];
  simpleExplanation: string;
  historicalPrecedents: Precedent[];
  actionItems: string[];
}

type DocumentType = "fir" | "judgment" | "petition" | "contract" | "other";

const LegalDocumentAnalyzer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [documentType, setDocumentType] = useState<DocumentType | "">("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [processingStage, setProcessingStage] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null);
  const [extractionProgress, setExtractionProgress] = useState<number>(0);
  const [activeView, setActiveView] = useState<string>("overview");
  const [dragActive, setDragActive] = useState<boolean>(false);
  
  const extractTextFromPDF = async (pdfFile: File, setExtractionProgress: { (value: SetStateAction<number>): void; (arg0: number): void; }) => {
    try {
      // Dynamic import only runs on the client
      const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
  
      // Set the worker path
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
  
      let extractedText = '';
  
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const textItems = textContent.items.map((item : {str : string}) => item.str).join(' ');
        extractedText += textItems + '\n';
        
        // Update progress
        setExtractionProgress(Math.round((i / numPages) * 100));
      }
  
      return extractedText;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error('Failed to extract text from PDF. Please make sure it\'s a valid PDF file.');
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };
  
  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setAnalysisResults(null);
    
    try {
      if (selectedFile.type === 'application/pdf') {
        setIsLoading(true);
        setProcessingStage(1);
        const extractedText = await extractTextFromPDF(selectedFile, setExtractionProgress);
        setFileContent(extractedText);
        setIsLoading(false);
        setProcessingStage(0);
      } else if (selectedFile.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (event: ProgressEvent<FileReader>) => {
          if (event.target?.result) {
            setFileContent(event.target.result.toString());
          }
        };
        reader.readAsText(selectedFile);
      } else {
        setError("Please upload a PDF or text file");
      }
    } catch (err) {
      setError((err as Error).message || "Failed to process the file");
      setIsLoading(false);
      setProcessingStage(0);
    }
  };

  const createPromptForDocumentType = (type: DocumentType | "", content: string): string => {
    const basePrompt = `
    You are a legal document analyzer specializing in Indian legal documents. 
    Analyze the following ${type} document and extract key information in a structured JSON format.
    
    Extract these details:
    - Party Names (all plaintiffs, defendants, petitioners, respondents)
    - Filing & Hearing Dates (include all important dates)
    - Provisions/Sections Cited (include act names with section numbers)
    - Subject Matter (main legal issue or dispute)
    - Current Status (pending, resolved, appealed, etc.)
    - Key Points (main arguments or findings)
    - Simple Explanation (explain this document in simple language for a non-lawyer)
    - Historical Precedents (list 3 similar cases from history with brief outcomes)
    - Action Items (what the parties need to do next, if applicable)
    
    Respond in a properly formatted JSON structure with these fields:
    {
      "documentType": "exact document type",
      "fileNumber": "case/file number if available",
      "court": "court name if applicable",
      "parties": {
        "petitioners": [{"name": "name", "represented": "lawyer name if available"}],
        "respondents": [{"name": "name", "represented": "lawyer name if available"}]
      },
      "dates": [
        {"date": "date in DD-MM-YYYY format", "description": "what this date represents"}
      ],
      "provisions": ["list of provisions cited"],
      "status": "current status of the document",
      "subject": "main subject of the document",
      "keyPoints": ["list of key points"],
      "simpleExplanation": "simple explanation of the document",
      "historicalPrecedents": [
        {"case": "case name", "outcome": "brief outcome"}
      ],
      "actionItems": ["list of actions needed"]
    }
    
    Document content:
    ${content}
    `;
    
    return basePrompt;
  };

  // Extract structured data from text when JSON parsing fails
  const extractStructuredData = (text: string, documentType: DocumentType | ""): AnalysisResult => {
    // Default structure to populate
    const result: AnalysisResult = {
      documentType: documentType === "fir" ? "First Information Report (FIR)" :
                   documentType === "judgment" ? "Court Judgment" :
                   documentType === "petition" ? "Legal Petition" :
                   documentType === "contract" ? "Legal Contract" : "Legal Document",
      parties: {},
      dates: [],
      provisions: [],
      keyPoints: [],
      subject: "",
      status: "",
      simpleExplanation: "",
      historicalPrecedents: [],
      actionItems: []
    };
    
    // Try to extract sections based on common patterns
    const sections = text.split(/\n\n|\r\n\r\n/);
    
    for (const section of sections) {
      // Try to identify each section and populate the result
      if (section.match(/party|parties|complainant|accused|petitioner|respondent/i)) {
        // Extract parties
        const partyLines = section.split('\n');
        partyLines.forEach(line => {
          if (line.match(/complainant/i)) {
            result.parties.complainant = { name: extractName(line) };
          } else if (line.match(/accused/i)) {
            result.parties.accused = result.parties.accused || [];
            result.parties.accused.push({ name: extractName(line) });
          } else if (line.match(/petitioner/i)) {
            result.parties.petitioners = result.parties.petitioners || [];
            result.parties.petitioners.push({ name: extractName(line) });
          } else if (line.match(/respondent/i)) {
            result.parties.respondents = result.parties.respondents || [];
            result.parties.respondents.push({ name: extractName(line) });
          }
        });
      } else if (section.match(/date|dates|filing|hearing/i)) {
        // Extract dates
        const dateLines = section.split('\n');
        dateLines.forEach(line => {
          const dateMatch = line.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/);
          if (dateMatch) {
            result.dates.push({ 
              date: dateMatch[1], 
              description: line.replace(dateMatch[1], '').trim() 
            });
          }
        });
      } else if (section.match(/provision|section|act/i)) {
        // Extract provisions
        const provisionLines = section.split('\n');
        provisionLines.forEach(line => {
          if (line.match(/section|act/i)) {
            result.provisions.push(line.trim());
          }
        });
      } else if (section.match(/key point|main point|finding/i)) {
        // Extract key points
        const pointLines = section.split('\n');
        pointLines.forEach(line => {
          if (line.match(/^\s*[-•*]\s+/)) {
            result.keyPoints.push(line.replace(/^\s*[-•*]\s+/, '').trim());
          }
        });
      } else if (section.match(/simple explanation|layman|simplified/i)) {
        // Extract simple explanation
        result.simpleExplanation = section.replace(/simple explanation|layman|simplified/i, '').trim();
      } else if (section.match(/precedent|similar case|case law/i)) {
        // Extract precedents
        const precedentLines = section.split('\n');
        precedentLines.forEach(line => {
          if (line.match(/v\.|vs\.|versus/i)) {
            result.historicalPrecedents.push({ 
              case: line.trim(),
              outcome: "Referenced in document" 
            });
          }
        });
      } else if (section.match(/action item|next step|recommendation/i)) {
        // Extract action items
        const actionLines = section.split('\n');
        actionLines.forEach(line => {
          if (line.match(/^\s*[-•*]\s+/)) {
            result.actionItems.push(line.replace(/^\s*[-•*]\s+/, '').trim());
          }
        });
      } else if (section.match(/subject|matter|dispute|issue/i)) {
        // Extract subject
        result.subject = section.replace(/subject|matter|dispute|issue/i, '').trim();
      } else if (section.match(/status|stage|phase/i)) {
        // Extract status
        result.status = section.replace(/status|stage|phase/i, '').trim();
      }
    }
    
    return result;
  };
  
  // Helper function to extract names from text
  const extractName = (text: string): string => {
    const nameMatch = text.match(/:\s*([^,\n]+)/);
    return nameMatch ? nameMatch[1].trim() : "Unknown";
  };

  const analyzeDocument = async () => {
    if (!file || !documentType || !fileContent) {
      setError("Please select a document and document type");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setProcessingStage(2);
      
      // Initialize the Gemini API client
      const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "YOUR_API_KEY";
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      // Create prompt based on document type
      const prompt = createPromptForDocumentType(documentType, fileContent);
      
      setProcessingStage(3);
      
      try {
        // Make the actual API call to Gemini
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Parse the JSON response
        let parsedResponse: AnalysisResult;
        try {
          // Look for a JSON block in the text
          const jsonMatch = text.match(/```json([\s\S]*?)```/) || 
                         text.match(/{[\s\S]*}/) ||
                         text.match(/\[[\s\S]*\]/);
          
          if (jsonMatch) {
            // Clean up the JSON string to parse it
            const jsonStr = jsonMatch[0].replace(/```json|```/g, '').trim();
            parsedResponse = JSON.parse(jsonStr);
          } else {
            // If no JSON block, try to parse the entire response as JSON
            parsedResponse = JSON.parse(text);
          }
        } catch (jsonError) {
          console.error("Failed to parse JSON from Gemini response:", jsonError);
          // Fallback: Try to extract structured data from the text
          parsedResponse = extractStructuredData(text, documentType);
        }
        
        setProcessingStage(4);
        setAnalysisResults(parsedResponse);
        // Auto-scroll to results after processing
        setTimeout(() => {
          const resultsElement = document.getElementById('analysis-results');
          if (resultsElement) {
            resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 500);
      } catch (apiError) {
        console.error("Error calling Gemini API:", apiError);
        setError("Failed to analyze document with Gemini API. Please try again.");
      }
    } catch (err) {
      console.error("Error analyzing document:", err);
      setError("Failed to analyze document. Please try again.");
    } finally {
      setIsLoading(false);
      setProcessingStage(0);
    }
  };

  // Get appropriate status badge color based on status text
  const getStatusBadgeColor = (status: string | undefined): string => {
    if (!status) return "bg-slate-50 text-slate-700";
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes("pending") || statusLower.includes("in progress")) {
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    } else if (statusLower.includes("resolved") || statusLower.includes("completed") || 
               statusLower.includes("granted") || statusLower.includes("approved")) {
      return "bg-green-50 text-green-700 border-green-200";
    } else if (statusLower.includes("rejected") || statusLower.includes("denied") ||
               statusLower.includes("dismissed")) {
      return "bg-red-50 text-red-700 border-red-200";
    } else if (statusLower.includes("appeal") || statusLower.includes("review")) {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
    
    return "bg-slate-50 text-slate-700";
  };

  // Generate document icon based on document type
  const getDocumentIcon = (docType: DocumentType | "") => {
    switch (docType) {
      case "fir":
        return <FileText className="h-5 w-5 text-blue-600" />;
      case "judgment":
        return <Gavel className="h-5 w-5 text-purple-600" />;
      case "petition":
        return <ClipboardList className="h-5 w-5 text-amber-600" />;
      case "contract":
        return <FileCheck className="h-5 w-5 text-teal-600" />;
      default:
        return <FileSearch className="h-5 w-5 text-slate-600" />;
    }
  };

  // Function to render content based on document type
  const renderDocumentSpecificContent = () => {
    if (!analysisResults) return null;
    
    switch (documentType) {
      case "fir":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-sm hover:shadow transition-shadow duration-200">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-md flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-blue-600" />
                    FIR Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm font-medium">FIR Number</span>
                      <span className="font-medium text-sm">{analysisResults.fileNumber || "Not specified"}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm font-medium">Police Station</span>
                      <span className="font-medium text-sm">{analysisResults.station || "Not specified"}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-sm font-medium">Status</span>
                      <Badge variant="outline" className={getStatusBadgeColor(analysisResults.status)}>
                        {analysisResults.status || "Unknown"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-sm hover:shadow transition-shadow duration-200">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-md flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2 text-amber-600" />
                    Complaint Subject
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-sm font-medium">{analysisResults.subject || "Not specified"}</p>
                  <div className="mt-4">
                    <span className="text-slate-500 text-sm font-medium">Filed under:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {analysisResults.provisions && analysisResults.provisions.map((provision, i) => (
                        <Badge key={i} variant="outline" className="bg-slate-50 border-slate-200 text-slate-800">
                          {provision}
                        </Badge>
                      ))}
                      {(!analysisResults.provisions || analysisResults.provisions.length === 0) && 
                        <span className="text-sm text-slate-400">Not specified</span>
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card className="shadow-sm hover:shadow transition-shadow duration-200">
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-md flex items-center">
                  <Users className="h-4 w-4 mr-2 text-indigo-600" />
                  Involved Parties
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-5">
                  {analysisResults.parties && analysisResults.parties.complainant && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                        Complainant
                      </h4>
                      <div className="flex items-center mt-2 bg-slate-50 p-3 rounded-lg">
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarFallback className="bg-blue-100 text-blue-800">
                            {analysisResults.parties.complainant.name ? analysisResults.parties.complainant.name.charAt(0) : "C"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{analysisResults.parties.complainant.name || "Not specified"}</p>
                          <p className="text-xs text-slate-500">{analysisResults.parties.complainant.address || ""}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {analysisResults.parties && analysisResults.parties.accused && analysisResults.parties.accused.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                        Accused
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        {analysisResults.parties.accused.map((person, i) => (
                          <div key={i} className="flex items-center bg-slate-50 p-3 rounded-lg">
                            <Avatar className="h-10 w-10 mr-3">
                              <AvatarFallback className="bg-red-100 text-red-800">
                                {person.name ? person.name.charAt(0) : "A"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{person.name || "Unknown"}</p>
                              {person.description && <p className="text-xs text-slate-500">{person.description}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {(!analysisResults.parties || 
                    (!analysisResults.parties.complainant && 
                     (!analysisResults.parties.accused || analysisResults.parties.accused.length === 0))) && 
                    <p className="text-sm text-slate-400 italic">No party information specified in the document</p>
                  }
                </div>
              </CardContent>
            </Card>
          </div>
        );
        
      case "judgment":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-sm hover:shadow transition-shadow duration-200">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-md flex items-center">
                    <Scale className="h-4 w-4 mr-2 text-purple-600" />
                    Case Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm font-medium">Case Number</span>
                      <span className="font-medium text-sm">{analysisResults.caseNumber || analysisResults.fileNumber || "Not specified"}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm font-medium">Court</span>
                      <span className="font-medium text-sm">{analysisResults.court || "Not specified"}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm font-medium">Bench</span>
                      <span className="font-medium text-sm">{analysisResults.bench || "Not specified"}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-sm font-medium">Status</span>
                      <Badge variant="outline" className={getStatusBadgeColor(analysisResults.status)}>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {analysisResults.status || "Unknown"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-sm hover:shadow transition-shadow duration-200">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-md flex items-center">
                    <FileCheck className="h-4 w-4 mr-2 text-purple-600" />
                    Judgment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-sm font-medium italic">{analysisResults.judgmentSummary || analysisResults.subject || "Not available"}</p>
                  
                  {analysisResults.provisions && analysisResults.provisions.length > 0 && (
                    <div className="mt-4">
                      <span className="text-slate-500 text-sm font-medium">Legal provisions cited:</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {analysisResults.provisions.map((provision, i) => (
                          <Badge key={i} variant="outline" className="bg-purple-50 border-purple-200 text-purple-800">
                            {provision}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <Card className="shadow-sm hover:shadow transition-shadow duration-200">
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-md flex items-center">
                  <Users className="h-4 w-4 mr-2 text-indigo-600" />
                  Parties to the Case
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {analysisResults.parties && analysisResults.parties.petitioners && (
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                        Petitioner(s)
                      </h4>
                      <div className="space-y-3">
                        {analysisResults.parties.petitioners.map((party, i) => (
                          <div key={i} className="flex items-center bg-white p-3 rounded-lg shadow-sm">
                            <Avatar className="h-10 w-10 mr-3">
                              <AvatarFallback className="bg-blue-100 text-blue-800">
                                {party.name ? party.name.charAt(0) : "P"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{party.name || "Unknown"}</p>
                              {party.represented && <p className="text-xs text-slate-500">Represented by: {party.represented}</p>}
                            </div>
                          </div>
                        ))}
                        {(!analysisResults.parties.petitioners || analysisResults.parties.petitioners.length === 0) && 
                          <p className="text-sm text-slate-400 italic">Not specified</p>
                        }
                      </div>
                    </div>
                  )}
                  
                  {analysisResults.parties && analysisResults.parties.respondents && (
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                        Respondent(s)
                      </h4>
                      <div className="space-y-3">
                        {analysisResults.parties.respondents.map((party, i) => (
                          <div key={i} className="flex items-center bg-white p-3 rounded-lg shadow-sm">
                            <Avatar className="h-10 w-10 mr-3">
                            <AvatarFallback className="bg-red-100 text-red-800">
                              {party.name ? party.name.charAt(0) : "R"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{party.name || "Unknown"}</p>
                            {party.represented && <p className="text-xs text-slate-500">Represented by: {party.represented}</p>}
                          </div>
                        </div>
                      ))}
                      {(!analysisResults.parties.respondents || analysisResults.parties.respondents.length === 0) && 
                        <p className="text-sm text-slate-400 italic">Not specified</p>
                      }
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
      
      case "petition":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-sm hover:shadow transition-shadow duration-200">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-md flex items-center">
                    <ClipboardList className="h-4 w-4 mr-2 text-amber-600" />
                    Petition Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm font-medium">Petition Number</span>
                      <span className="font-medium text-sm">{analysisResults.fileNumber || "Not specified"}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm font-medium">Court/Authority</span>
                      <span className="font-medium text-sm">{analysisResults.court || analysisResults.issuingAuthority || "Not specified"}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-sm font-medium">Status</span>
                      <Badge variant="outline" className={getStatusBadgeColor(analysisResults.status)}>
                        {analysisResults.status || "Unknown"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-sm hover:shadow transition-shadow duration-200">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-md flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-amber-600" />
                    Subject Matter
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-sm font-medium">{analysisResults.subject || "Not specified"}</p>
                  
                  {analysisResults.provisions && analysisResults.provisions.length > 0 && (
                    <div className="mt-4">
                      <span className="text-slate-500 text-sm font-medium">Legal provisions cited:</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {analysisResults.provisions.map((provision, i) => (
                          <Badge key={i} variant="outline" className="bg-amber-50 border-amber-200 text-amber-800">
                            {provision}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <Card className="shadow-sm hover:shadow transition-shadow duration-200">
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-md flex items-center">
                  <Users className="h-4 w-4 mr-2 text-indigo-600" />
                  Parties to the Petition
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {analysisResults.parties && analysisResults.parties.petitioners && (
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
                        <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
                        Petitioner(s)
                      </h4>
                      <div className="space-y-3">
                        {analysisResults.parties.petitioners.map((party, i) => (
                          <div key={i} className="flex items-center bg-white p-3 rounded-lg shadow-sm">
                            <Avatar className="h-10 w-10 mr-3">
                              <AvatarFallback className="bg-amber-100 text-amber-800">
                                {party.name ? party.name.charAt(0) : "P"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{party.name || "Unknown"}</p>
                              {party.represented && <p className="text-xs text-slate-500">Represented by: {party.represented}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {analysisResults.parties && analysisResults.parties.respondents && (
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
                        <span className="w-2 h-2 bg-slate-500 rounded-full mr-2"></span>
                        Respondent(s)
                      </h4>
                      <div className="space-y-3">
                        {analysisResults.parties.respondents.map((party, i) => (
                          <div key={i} className="flex items-center bg-white p-3 rounded-lg shadow-sm">
                            <Avatar className="h-10 w-10 mr-3">
                              <AvatarFallback className="bg-slate-100 text-slate-800">
                                {party.name ? party.name.charAt(0) : "R"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{party.name || "Unknown"}</p>
                              {party.represented && <p className="text-xs text-slate-500">Represented by: {party.represented}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );
        
      case "contract":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-sm hover:shadow transition-shadow duration-200">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-md flex items-center">
                    <FileCheck className="h-4 w-4 mr-2 text-teal-600" />
                    Contract Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm font-medium">Document Type</span>
                      <span className="font-medium text-sm">{analysisResults.documentType || "Contract"}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm font-medium">Subject Matter</span>
                      <span className="font-medium text-sm">{analysisResults.subject || "Not specified"}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-sm font-medium">Status</span>
                      <Badge variant="outline" className={getStatusBadgeColor(analysisResults.status)}>
                        {analysisResults.status || "Unknown"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-sm hover:shadow transition-shadow duration-200">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-md flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-teal-600" />
                    Key Dates
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {analysisResults.dates && analysisResults.dates.length > 0 ? (
                      analysisResults.dates.map((dateItem, i) => (
                        <div key={i} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-md transition-colors">
                          <span className="text-slate-500 text-sm">{dateItem.description || "Date"}</span>
                          <Badge variant="outline" className="bg-teal-50 border-teal-200 text-teal-800">
                            {dateItem.date}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400 italic">No key dates specified</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card className="shadow-sm hover:shadow transition-shadow duration-200">
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-md flex items-center">
                  <Users className="h-4 w-4 mr-2 text-indigo-600" />
                  Contracting Parties
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {analysisResults.parties && 
                  (analysisResults.parties.petitioners || analysisResults.parties.complainant || analysisResults.parties.respondents || analysisResults.parties.accused) ? (
                    <>
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
                          <span className="w-2 h-2 bg-teal-500 rounded-full mr-2"></span>
                          First Party
                        </h4>
                        <div className="space-y-3">
                          {analysisResults.parties.petitioners ? (
                            analysisResults.parties.petitioners.map((party, i) => (
                              <div key={i} className="flex items-center bg-white p-3 rounded-lg shadow-sm">
                                <Avatar className="h-10 w-10 mr-3">
                                  <AvatarFallback className="bg-teal-100 text-teal-800">
                                    {party.name ? party.name.charAt(0) : "1"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">{party.name || "Unknown"}</p>
                                  {party.address && <p className="text-xs text-slate-500">{party.address}</p>}
                                </div>
                              </div>
                            ))
                          ) : analysisResults.parties.complainant ? (
                            <div className="flex items-center bg-white p-3 rounded-lg shadow-sm">
                              <Avatar className="h-10 w-10 mr-3">
                                <AvatarFallback className="bg-teal-100 text-teal-800">
                                  {analysisResults.parties.complainant.name ? analysisResults.parties.complainant.name.charAt(0) : "1"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{analysisResults.parties.complainant.name || "Unknown"}</p>
                                {analysisResults.parties.complainant.address && <p className="text-xs text-slate-500">{analysisResults.parties.complainant.address}</p>}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400 italic">Not specified</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
                          <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
                          Second Party
                        </h4>
                        <div className="space-y-3">
                          {analysisResults.parties.respondents ? (
                            analysisResults.parties.respondents.map((party, i) => (
                              <div key={i} className="flex items-center bg-white p-3 rounded-lg shadow-sm">
                                <Avatar className="h-10 w-10 mr-3">
                                  <AvatarFallback className="bg-indigo-100 text-indigo-800">
                                    {party.name ? party.name.charAt(0) : "2"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">{party.name || "Unknown"}</p>
                                  {party.address && <p className="text-xs text-slate-500">{party.address}</p>}
                                </div>
                              </div>
                            ))
                          ) : analysisResults.parties.accused ? (
                            analysisResults.parties.accused.map((party, i) => (
                              <div key={i} className="flex items-center bg-white p-3 rounded-lg shadow-sm">
                                <Avatar className="h-10 w-10 mr-3">
                                  <AvatarFallback className="bg-indigo-100 text-indigo-800">
                                    {party.name ? party.name.charAt(0) : "2"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">{party.name || "Unknown"}</p>
                                  {party.address && <p className="text-xs text-slate-500">{party.address}</p>}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-slate-400 italic">Not specified</p>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400 italic col-span-2 text-center">No party information specified in the document</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );
        
      default:
        // Generic view for other document types
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-sm hover:shadow transition-shadow duration-200">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-md flex items-center">
                    <FileSearch className="h-4 w-4 mr-2 text-slate-600" />
                    Document Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm font-medium">Document Type</span>
                      <span className="font-medium text-sm">{analysisResults.documentType || "Not specified"}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm font-medium">Reference Number</span>
                      <span className="font-medium text-sm">{analysisResults.fileNumber || "Not specified"}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm font-medium">Subject Matter</span>
                      <span className="font-medium text-sm">{analysisResults.subject || "Not specified"}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-sm font-medium">Status</span>
                      <Badge variant="outline" className={getStatusBadgeColor(analysisResults.status)}>
                        {analysisResults.status || "Unknown"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {analysisResults.dates && analysisResults.dates.length > 0 && (
                <Card className="shadow-sm hover:shadow transition-shadow duration-200">
                  <CardHeader className="pb-2 border-b">
                    <CardTitle className="text-md flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-slate-600" />
                      Key Dates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {analysisResults.dates.map((dateItem, i) => (
                        <div key={i} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-md transition-colors">
                          <span className="text-slate-500 text-sm">{dateItem.description || "Date"}</span>
                          <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-800">
                            {dateItem.date}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            {analysisResults.parties && 
            (analysisResults.parties.petitioners || 
             analysisResults.parties.respondents || 
             analysisResults.parties.complainant || 
             analysisResults.parties.accused) && (
              <Card className="shadow-sm hover:shadow transition-shadow duration-200">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-md flex items-center">
                    <Users className="h-4 w-4 mr-2 text-indigo-600" />
                    Involved Parties
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {/* Add relevant parties here based on what's available in the data */}
                    {/* This is a simplified version for the generic case */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Party Type</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysisResults.parties.petitioners && analysisResults.parties.petitioners.map((party, i) => (
                          <TableRow key={`petitioner-${i}`}>
                            <TableCell className="font-medium">Petitioner</TableCell>
                            <TableCell>{party.name || "Unknown"}</TableCell>
                            <TableCell>{party.represented ? `Represented by: ${party.represented}` : ""}</TableCell>
                          </TableRow>
                        ))}
                        {analysisResults.parties.respondents && analysisResults.parties.respondents.map((party, i) => (
                          <TableRow key={`respondent-${i}`}>
                            <TableCell className="font-medium">Respondent</TableCell>
                            <TableCell>{party.name || "Unknown"}</TableCell>
                            <TableCell>{party.represented ? `Represented by: ${party.represented}` : ""}</TableCell>
                          </TableRow>
                        ))}
                        {analysisResults.parties.complainant && (
                          <TableRow>
                            <TableCell className="font-medium">Complainant</TableCell>
                            <TableCell>{analysisResults.parties.complainant.name || "Unknown"}</TableCell>
                            <TableCell>{analysisResults.parties.complainant.address || ""}</TableCell>
                          </TableRow>
                        )}
                        {analysisResults.parties.accused && analysisResults.parties.accused.map((party, i) => (
                          <TableRow key={`accused-${i}`}>
                            <TableCell className="font-medium">Accused</TableCell>
                            <TableCell>{party.name || "Unknown"}</TableCell>
                            <TableCell>{party.description || ""}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
    }
  };

  // Render the content for each tab
  const renderTabContent = () => {
    if (!analysisResults) return null;
    
    switch (activeView) {
      case "overview":
        return renderDocumentSpecificContent();
        
      case "keyPoints":
        return (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-md flex items-center">
                <BarChart4 className="h-4 w-4 mr-2 text-blue-600" />
                Key Points Analysis
              </CardTitle>
              <CardDescription>
                Important findings and arguments from the document
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysisResults.keyPoints && analysisResults.keyPoints.length > 0 ? (
                <div className="space-y-4">
                  {analysisResults.keyPoints.map((point, i) => (
                    <div key={i} className="flex items-start p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="mr-3 mt-1 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center h-5 w-5 text-xs font-bold">
                        {i + 1}
                      </div>
                      <p className="text-sm">{point}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">No key points identified in the document</p>
              )}
            </CardContent>
          </Card>
        );
        
      case "precedents":
        return (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-md flex items-center">
                <Scale className="h-4 w-4 mr-2 text-purple-600" />
                Historical Precedents
              </CardTitle>
              <CardDescription>
                Similar cases and their outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysisResults.historicalPrecedents && analysisResults.historicalPrecedents.length > 0 ? (
                <div className="space-y-6">
                  {analysisResults.historicalPrecedents.map((precedent, i) => (
                    <div key={i} className="border-b pb-4 last:border-0 last:pb-0">
                      <h3 className="font-medium text-md text-slate-800 mb-2">{precedent.case}</h3>
                      <p className="text-sm text-slate-600">{precedent.outcome}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">No historical precedents identified</p>
              )}
            </CardContent>
          </Card>
        );
        
      case "simplified":
        return (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-md flex items-center">
                <BookOpen className="h-4 w-4 mr-2 text-teal-600" />
                Simplified Explanation
              </CardTitle>
              <CardDescription>
                Document explained in simple terms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-teal-50 p-4 rounded-lg border border-teal-100">
                <p className="text-md leading-relaxed">
                  {analysisResults.simpleExplanation || "No simplified explanation available."}
                </p>
              </div>
              
              {analysisResults.actionItems && analysisResults.actionItems.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-medium text-slate-800 mb-3 flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-teal-600" />
                    Action Items
                  </h3>
                  <div className="space-y-2">
                    {analysisResults.actionItems.map((item, i) => (
                      <div key={i} className="flex items-start">
                        <ArrowRight className="h-4 w-4 mr-2 mt-1 text-teal-600 flex-shrink-0" />
                        <p className="text-sm">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
        
      case "provisions":
        return (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-md flex items-center">
                <ClipboardList className="h-4 w-4 mr-2 text-indigo-600" />
                Legal Provisions
              </CardTitle>
              <CardDescription>
                Acts and sections referenced in the document
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysisResults.provisions && analysisResults.provisions.length > 0 ? (
                <div className="space-y-4">
                  {analysisResults.provisions.map((provision, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-sm font-medium">{provision}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">No legal provisions cited in the document</p>
              )}
            </CardContent>
          </Card>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Legal Document Analyzer</h1>
        <p className="text-slate-600 mb-6">Upload a legal document to automatically extract and analyze key information</p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document Upload Section */}
          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle>Upload Document</CardTitle>
              <CardDescription>
                Upload a legal document in PDF or text format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center ${
                  dragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
                } transition-all duration-200 cursor-pointer`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <input 
                  id="file-upload" 
                  type="file" 
                  className="hidden" 
                  accept=".pdf,.txt" 
                  onChange={handleFileChange}
                />
                <div className="mb-4 flex justify-center">
                  <Upload className="h-10 w-10 text-slate-400" />
                </div>
                <p className="text-sm text-slate-600 mb-2">
                  {file ? `Selected: ${file.name}` : "Drag & drop a file here or click to browse"}
                </p>
                <p className="text-xs text-slate-500">Supports PDF and TXT files</p>
                
                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {isLoading && processingStage === 1 && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <p className="text-sm text-slate-600">Extracting text from PDF...</p>
                    </div>
                    <Progress value={extractionProgress} className="h-1.5 w-full" />
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center">
                <label className="mr-4 text-sm font-medium">Document Type:</label>
                <select 
                  value={documentType} 
                  onChange={(e) => setDocumentType(e.target.value as DocumentType)} 
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select type</option>
                  <option value="fir">FIR (First Information Report)</option>
                  <option value="judgment">Court Judgment</option>
                  <option value="petition">Legal Petition</option>
                  <option value="contract">Legal Contract</option>
                  <option value="other">Other Legal Document</option>
                </select>
              </div>
              <Button 
                onClick={analyzeDocument} 
                disabled={!file || !documentType || isLoading} 
                className="flex items-center justify-center"
              >
                {isLoading && processingStage > 1 ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <FileSearch className="mr-2 h-4 w-4" />
                    Analyze Document
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
          
          {/* Document Info Section */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Document Information</CardTitle>
              <CardDescription>
                Selected document details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {file ? (
                <div className="space-y-4">
                  <div className="flex items-center">
                    {documentType ? getDocumentIcon(documentType as DocumentType) : <FileText className="h-5 w-5 text-slate-400" />}
                    <span className="ml-2 font-medium">{file.name}</span>
                  </div>
                  <p className="text-sm text-slate-500">Size: {(file.size / 1024).toFixed(2)} KB</p>
                  
                  {fileContent && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-sm font-medium mb-2">Document Preview</h3>
                        <div className="max-h-[200px] overflow-y-auto rounded bg-slate-50 p-3 text-xs text-slate-700">
                          {fileContent.length > 1000 ? 
                            fileContent.substring(0, 1000) + "..." : 
                            fileContent}
                        </div>
                      </div>
                    </>
                  )}
                  
                  {documentType && (
                    <div className="pt-2 flex items-center">
                      <Badge variant="outline" className="bg-slate-50">
                        {documentType === "fir" ? "FIR" :
                         documentType === "judgment" ? "Court Judgment" :
                         documentType === "petition" ? "Legal Petition" :
                         documentType === "contract" ? "Legal Contract" : "Other Document"}
                      </Badge>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                  <FileText className="h-8 w-8 mb-2" />
                  <p className="text-sm">No document selected</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              {file && (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => {
                    setFile(null);
                    setFileContent('');
                    setDocumentType('');
                    setAnalysisResults(null);
                  }}
                >
                  Clear Document
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
      
      {/* Analysis Results Section */}
      {analysisResults && (
        <div id="analysis-results" className="mb-8 scroll-mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center">
              <FileCheck className="h-5 w-5 mr-2 text-blue-600" />
              Analysis Results
            </h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                    <Info className="h-3.5 w-3.5 mr-1" />
                    AI-powered analysis
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  This analysis was performed using AI. Review all details for accuracy.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <Card className="mb-6 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  {getDocumentIcon(documentType as DocumentType)}
                  <span className="ml-2">{analysisResults.documentType}</span>
                </CardTitle>
                <Badge variant="outline" className={getStatusBadgeColor(analysisResults.status)}>
                  {analysisResults.status || "Status unknown"}
                </Badge>
              </div>
              <CardDescription className="mt-2">
                {analysisResults.subject}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-sm">
                {analysisResults.simpleExplanation && (
                  <p className="text-slate-700 mb-4 italic">
                    &quot;{analysisResults.simpleExplanation.length > 150 ? 
                      analysisResults.simpleExplanation.substring(0, 150) + "..." : 
                      analysisResults.simpleExplanation}&quot;
                  </p>
                )}
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {(analysisResults.fileNumber || analysisResults.caseNumber) && (
                    <Badge variant="outline" className="bg-slate-50">
                      File #: {analysisResults.fileNumber || analysisResults.caseNumber}
                    </Badge>
                  )}
                  
                  {analysisResults.court && (
                    <Badge variant="outline" className="bg-slate-50">
                      {analysisResults.court}
                    </Badge>
                  )}
                  
                  {analysisResults.dates && analysisResults.dates.length > 0 && (
                    <Badge variant="outline" className="bg-slate-50">
                      Date: {analysisResults.dates[0].date}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Tabs value={activeView} onValueChange={setActiveView}>
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="keyPoints">Key Points</TabsTrigger>
              <TabsTrigger value="simplified">Simplified</TabsTrigger>
              <TabsTrigger value="provisions">Provisions</TabsTrigger>
              <TabsTrigger value="precedents">Precedents</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeView}>
              {renderTabContent()}
            </TabsContent>
          </Tabs>
          
          <div className="mt-6">
            <Accordion type="single" collapsible>
              <AccordionItem value="raw-data">
                <AccordionTrigger className="text-sm font-medium text-slate-500">
                  View Raw Analysis Data
                </AccordionTrigger>
                <AccordionContent>
                  <pre className="bg-slate-100 p-4 rounded-md overflow-x-auto text-xs">
                    {JSON.stringify(analysisResults, null, 2)}
                  </pre>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      )}
      
      {/* Footer Section */}
      <div className="mt-12 text-center text-sm text-slate-500">
        <p className="mb-2">Legal Document Analyzer powered by Gemini AI</p>
        <p>This tool is for informational purposes only and does not constitute legal advice.</p>
      </div>
    </div>
  );
};

export default LegalDocumentAnalyzer;