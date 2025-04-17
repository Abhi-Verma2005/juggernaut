
"use client";
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  Loader2, Upload, FileText, BookOpen, Scale, Calendar, Users, 
  AlertTriangle, FileCheck, CheckCircle2, Gavel, ClipboardList, 
  BarChart4, FileSearch, ArrowRight, Info, ChevronRight
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

const LegalDocumentAnalyzer = () => {
  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [documentType, setDocumentType] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);
  const [error, setError] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [activeView, setActiveView] = useState("overview");
  const [dragActive, setDragActive] = useState(false);
  
  const extractTextFromPDF = async (pdfFile, setExtractionProgress) => {
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
        const textItems = textContent.items.map((item) => item.str).join(' ');
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
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };
  
  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };
  
  const processFile = async (selectedFile) => {
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
        reader.onload = (event) => {
          if (event.target?.result) {
            setFileContent(event.target.result.toString());
          }
        };
        reader.readAsText(selectedFile);
      } else {
        setError("Please upload a PDF or text file");
      }
    } catch (err) {
      setError(err.message || "Failed to process the file");
      setIsLoading(false);
      setProcessingStage(0);
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
        let parsedResponse;
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
  
  // Extract structured data from text when JSON parsing fails
  const extractStructuredData = (text, documentType) => {
    // Default structure to populate
    const result = {
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
  const extractName = (text) => {
    const nameMatch = text.match(/:\s*([^,\n]+)/);
    return nameMatch ? nameMatch[1].trim() : "Unknown";
  };
  
  const createPromptForDocumentType = (type, content) => {
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

  // Get appropriate status badge color based on status text
  const getStatusBadgeColor = (status) => {
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
  const getDocumentIcon = (docType) => {
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
      
      // Generic handler for petition, contract, and other document types
      case "petition":
      case "contract":
      case "other":
      default:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-sm hover:shadow transition-shadow duration-200">
              <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-md flex items-center">
                    {documentType === "petition" ? (
                      <ClipboardList className="h-4 w-4 mr-2 text-amber-600" />
                    ) : documentType === "contract" ? (
                      <FileCheck className="h-4 w-4 mr-2 text-teal-600" />
                    ) : (
                      <FileSearch className="h-4 w-4 mr-2 text-slate-600" />
                    )}
                    Document Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm font-medium">Document Number</span>
                      <span className="font-medium text-sm">{analysisResults.fileNumber || "Not specified"}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm font-medium">
                        {documentType === "petition" ? "Court/Authority" : "Issuing Authority"}
                      </span>
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
                    <BookOpen className="h-4 w-4 mr-2 text-slate-600" />
                    Subject Matter
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-sm font-medium">{analysisResults.subject || "Not specified"}</p>
                  
                  {analysisResults.provisions && analysisResults.provisions.length > 0 && (
                    <div className="mt-4">
                      <span className="text-slate-500 text-sm font-medium">Legal provisions:</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {analysisResults.provisions.map((provision, i) => (
                          <Badge key={i} variant="outline" className="bg-slate-50 border-slate-200 text-slate-800">
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
                  Parties Involved
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {analysisResults.parties && (
                    <>
                      {analysisResults.parties.petitioners && (
                        <div className="bg-slate-50 p-4 rounded-lg">
                          <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
                            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                            {documentType === "contract" ? "Party A / First Party" : "Petitioner(s)"}
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
                          </div>
                        </div>
                      )}
                      
                      {analysisResults.parties.respondents && (
                        <div className="bg-slate-50 p-4 rounded-lg">
                          <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
                            <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                            {documentType === "contract" ? "Party B / Second Party" : "Respondent(s)"}
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
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  
                  {(!analysisResults.parties || 
                    (!analysisResults.parties.petitioners && !analysisResults.parties.respondents)) && 
                    <p className="text-sm text-slate-400 italic">No party information specified in the document</p>
                  }
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="py-10 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Legal Document Analyzer</h1>
        <p className="text-lg text-slate-600 max-w-3xl mx-auto">
          Upload legal documents for AI-powered analysis that provides key insights, explanations, and action items
        </p>
      </div>
      
      <div className="mb-8">
        <div 
          className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center 
            ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-blue-300 hover:bg-slate-50'} 
            transition-colors duration-200 cursor-pointer`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload').click()}
        >
          <input 
            id="file-upload" 
            type="file" 
            className="hidden" 
            accept=".pdf,.txt" 
            onChange={handleFileChange} 
          />
          
          {file ? (
            <div className="flex flex-col items-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
              <p className="text-lg font-medium text-slate-900 mb-1">{file.name}</p>
              <p className="text-sm text-slate-500">{Math.round(file.size / 1024)} KB · {file.type}</p>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-slate-400 mb-3" />
              <p className="text-lg font-medium text-slate-900 mb-1">
                Drag and drop or click to upload
              </p>
              <p className="text-sm text-slate-500">
                Supports PDF and TXT files (up to 10MB)
              </p>
            </>
          )}
        </div>
        
        {isLoading && processingStage === 1 && (
          <div className="mt-4">
            <div className="flex items-center mb-2">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-600" />
              <p className="text-sm font-medium text-slate-700">Extracting text from document...</p>
            </div>
            <Progress value={extractionProgress} className="h-2" />
          </div>
        )}
      </div>
      
      {fileContent && (
        <div className="mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl">Document Type</CardTitle>
                <CardDescription>Select the type of legal document you've uploaded</CardDescription>
              </div>
              {file && (
                <div className="flex items-center text-sm text-slate-500">
                  <FileText className="w-4 h-4 mr-1" />
                  {file.name}
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div 
                  className={`p-4 border rounded-lg cursor-pointer flex flex-col items-center transition-all ${
                    documentType === "fir" ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-200 hover:bg-slate-50"
                  }`}
                  onClick={() => setDocumentType("fir")}
                >
                  <FileText className={`h-10 w-10 mb-2 ${documentType === "fir" ? "text-blue-600" : "text-slate-400"}`} />
                  <span className={`font-medium ${documentType === "fir" ? "text-blue-700" : "text-slate-700"}`}>
                    First Information Report (FIR)
                  </span>
                </div>
                
                <div 
                  className={`p-4 border rounded-lg cursor-pointer flex flex-col items-center transition-all ${
                    documentType === "judgment" ? "border-purple-500 bg-purple-50" : "border-slate-200 hover:border-purple-200 hover:bg-slate-50"
                  }`}
                  onClick={() => setDocumentType("judgment")}
                >
                  <Gavel className={`h-10 w-10 mb-2 ${documentType === "judgment" ? "text-purple-600" : "text-slate-400"}`} />
                  <span className={`font-medium ${documentType === "judgment" ? "text-purple-700" : "text-slate-700"}`}>
                    Court Judgment
                  </span>
                </div>
                
                <div 
                  className={`p-4 border rounded-lg cursor-pointer flex flex-col items-center transition-all ${
                    documentType === "petition" ? "border-amber-500 bg-amber-50" : "border-slate-200 hover:border-amber-200 hover:bg-slate-50"
                  }`}
                  onClick={() => setDocumentType("petition")}
                >
                  <ClipboardList className={`h-10 w-10 mb-2 ${documentType === "petition" ? "text-amber-600" : "text-slate-400"}`} />
                  <span className={`font-medium ${documentType === "petition" ? "text-amber-700" : "text-slate-700"}`}>
                    Legal Petition
                  </span>
                </div>
                
                <div 
                  className={`p-4 border rounded-lg cursor-pointer flex flex-col items-center transition-all ${
                    documentType === "contract" ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-teal-200 hover:bg-slate-50"
                  }`}
                  onClick={() => setDocumentType("contract")}
                >
                  <FileCheck className={`h-10 w-10 mb-2 ${documentType === "contract" ? "text-teal-600" : "text-slate-400"}`} />
                  <span className={`font-medium ${documentType === "contract" ? "text-teal-700" : "text-slate-700"}`}>
                    Legal Contract
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                onClick={analyzeDocument} 
                disabled={isLoading || !documentType}
                className="flex items-center"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {processingStage === 2 ? "Preparing document..." : 
                     processingStage === 3 ? "Analyzing document..." : 
                     processingStage === 4 ? "Processing results..." : "Loading..."}
                  </>
                ) : (
                  <>
                    Analyze Document
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
      
      {error && (
        <Alert variant="destructive" className="mb-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {analysisResults && (
        <div id="analysis-results" className="mb-10 scroll-mt-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center">
              {getDocumentIcon(documentType)}
              <span className="ml-2">Analysis Results</span>
            </h2>
            <p className="text-slate-600 mt-1">
              AI-powered analysis of your {analysisResults.documentType || "legal document"}
            </p>
          </div>
          
          <Tabs defaultValue="overview" onValueChange={setActiveView} className="mb-8">
            <TabsList className="mb-6">
              <TabsTrigger value="overview" className="flex items-center">
                <BarChart4 className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex items-center">
                <Info className="h-4 w-4 mr-2" />
                Key Insights
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="explanation" className="flex items-center">
                <BookOpen className="h-4 w-4 mr-2" />
                Simple Explanation
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              {renderDocumentSpecificContent()}
            </TabsContent>
            
            <TabsContent value="insights">
              <div className="space-y-6">
                <Card className="shadow-sm hover:shadow transition-shadow duration-200">
                  <CardHeader className="pb-2 border-b">
                    <CardTitle className="text-md flex items-center">
                      <Info className="h-4 w-4 mr-2 text-blue-600" />
                      Key Points
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {analysisResults.keyPoints && analysisResults.keyPoints.length > 0 ? (
                      <ul className="space-y-3">
                        {analysisResults.keyPoints.map((point, i) => (
                          <li key={i} className="flex">
                            <ChevronRight className="h-5 w-5 mr-2 text-blue-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm">{point}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No key points identified in the document</p>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="shadow-sm hover:shadow transition-shadow duration-200">
                  <CardHeader className="pb-2 border-b">
                    <CardTitle className="text-md flex items-center">
                      <BookOpen className="h-4 w-4 mr-2 text-indigo-600" />
                      Historical Precedents
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {analysisResults.historicalPrecedents && analysisResults.historicalPrecedents.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Case</TableHead>
                              <TableHead>Outcome</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {analysisResults.historicalPrecedents.map((precedent, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium">{precedent.case}</TableCell>
                                <TableCell>{precedent.outcome}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No historical precedents identified</p>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="shadow-sm hover:shadow transition-shadow duration-200">
                  <CardHeader className="pb-2 border-b">
                    <CardTitle className="text-md flex items-center">
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                      Action Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {analysisResults.actionItems && analysisResults.actionItems.length > 0 ? (
                      <ul className="space-y-3">
                        {analysisResults.actionItems.map((item, i) => (
                          <li key={i} className="flex">
                            <div className="h-5 w-5 rounded-full bg-green-50 border border-green-200 text-green-600 flex items-center justify-center text-xs font-medium mr-3 flex-shrink-0 mt-0.5">
                              {i + 1}
                            </div>
                            <p className="text-sm">{item}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No action items identified</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="timeline">
              <Card className="shadow-sm hover:shadow transition-shadow duration-200">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-md flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-amber-600" />
                    Document Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {analysisResults.dates && analysisResults.dates.length > 0 ? (
                    <div className="relative">
                      <div className="absolute h-full w-0.5 bg-slate-200 left-2.5 top-0"></div>
                      <ul className="space-y-6">
                        {analysisResults.dates.map((dateItem, i) => (
                          <li key={i} className="flex items-start">
                            <div className="w-5 h-5 rounded-full bg-amber-500 flex-shrink-0 z-10"></div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-slate-900">{dateItem.date}</p>
                              <p className="text-sm text-slate-600">{dateItem.description}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No timeline dates identified in the document</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="explanation">
              <Card className="shadow-sm hover:shadow transition-shadow duration-200">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-md flex items-center">
                    <BookOpen className="h-4 w-4 mr-2 text-green-600" />
                    Simple Explanation
                  </CardTitle>
                  <CardDescription>
                    Understanding the document in simple, non-legal terms
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  {analysisResults.simpleExplanation ? (
                    <div className="bg-green-50 p-6 rounded-lg border border-green-100 text-sm">
                      <p className="whitespace-pre-line">{analysisResults.simpleExplanation}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No simplified explanation available</p>
                  )}
                </CardContent>
                
                <CardFooter>
                  <div className="text-xs text-slate-500 flex items-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center">
                          <Info className="h-3 w-3 mr-1" />
                          <span>About this explanation</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">This explanation is generated by AI to help non-lawyers understand the document. While we strive for accuracy, please consult a legal professional for advice.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
          
          <Accordion type="single" collapsible className="mb-6">
            <AccordionItem value="raw">
              <AccordionTrigger className="text-sm text-slate-600 hover:text-slate-900">
                View Raw Document Text
              </AccordionTrigger>
              <AccordionContent>
                <div className="bg-slate-100 p-4 rounded-md whitespace-pre-line text-sm text-slate-800 max-h-96 overflow-y-auto">
                  {fileContent}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          
          <div className="flex justify-center mt-8">
            <Button variant="outline" className="flex items-center" onClick={() => {
              setFile(null);
              setFileContent('');
              setDocumentType("");
              setAnalysisResults(null);
              setError(null);
              // Scroll back to top
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}>
              <Upload className="mr-2 h-4 w-4" />
              Analyze Another Document
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegalDocumentAnalyzer;