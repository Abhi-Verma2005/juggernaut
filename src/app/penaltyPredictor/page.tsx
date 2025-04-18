"use client";
import { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  AlertTriangle, 
  Download, 
  Info, 
  Scale, 
  FileText, 
  MessageSquare, 
  Printer, 
  DollarSign,
  GavelIcon
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
};

type PenaltyData = {
  offenseLevel: string;
  severityScore: number;
  minFine: number;
  maxFine: number;
  recommendedFine: number;
  imprisonmentPossible: boolean;
  imprisonmentDuration?: string;
  additionalPenalties?: string[];
  legalReferences?: string[];
  countrySpecific: string;
  consultRecommended: boolean;
  riskLevel: 'low' | 'medium' | 'high';
};

type FineChartDataEntry = {
  name: string;
  value: number;
  fill: string;
};


const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

export default function AIPenaltyCalculator() {
  const [country, setCountry] = useState<string>("United States");
  const [region, setRegion] = useState<string>("");
  const [offense, setOffense] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [penaltyData, setPenaltyData] = useState<PenaltyData | null>(null);
  const [processingStage, setProcessingStage] = useState<number>(0);
  const [progressValue, setProgressValue] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [fineChartData, setFineChartData] = useState<FineChartDataEntry[]>([]);

  // Parse the AI response and create penalty data
  const parsePenaltyData = (text: string): PenaltyData => {
    try {
      // Clean up the text to ensure it's valid JSON
      const jsonStartIndex = text.indexOf('{');
      const jsonEndIndex = text.lastIndexOf('}') + 1;
      
      if (jsonStartIndex === -1 || jsonEndIndex === -1) {
        throw new Error("Could not find valid JSON in the response");
      }
      
      const jsonText = text.substring(jsonStartIndex, jsonEndIndex);
      const jsonData = JSON.parse(jsonText);
      
      // Create chart data for visualization
      setFineChartData([
        {
          name: "Minimum Fine",
          value: jsonData.minFine,
          fill: "#10b981", // emerald-500
        },
        {
          name: "Recommended Fine",
          value: jsonData.recommendedFine,
          fill: "#f59e0b", // amber-500
        },
        {
          name: "Maximum Fine",
          value: jsonData.maxFine,
          fill: "#ef4444", // red-500
        },
      ]);
      
      return jsonData;
    } catch (error) {
      console.error("Failed to parse penalty data:", error);
      throw new Error("Invalid data format received from AI");
    }
  };

  const getSeverityColor = (score: number): string => {
    if (score <= 3) return "#10b981"; // emerald-500
    if (score <= 6) return "#f59e0b"; // amber-500
    return "#ef4444"; // red-500
  };

  const generatePenaltyData = async (userMessage: string, userCountry: string, userRegion: string) => {
    const aiMessageId = Date.now() + 1 + '';
    
    // Temporarily store the message but don't display it yet
    const tempMessages = [
      {
        id: aiMessageId,
        text: 'Analyzing penalty information...',
        sender: 'ai' as const,
        timestamp: new Date(),
      }
    ];
  
    try {
      setProcessingStage(1);
      setProgressValue(25);
      
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const penaltyPrompt = `Your name is LegalPenalty AI. 
You are an AI expert in legal penalties and fines across different jurisdictions.

Your task is to analyze the described offense and provide detailed penalty information in JSON format according to the country and region specified.

You must respond ONLY with a properly formatted JSON object with the following structure:
{
  "offenseLevel": "string", // E.g., "Misdemeanor Class B", "Felony", "Infraction", etc.
  "severityScore": number, // 1-10 scale (1 = lowest, 10 = highest severity)
  "minFine": number, // Minimum potential fine in local currency
  "maxFine": number, // Maximum potential fine in local currency 
  "recommendedFine": number, // Typical fine for this offense
  "imprisonmentPossible": boolean, // Whether jail/prison time is possible
  "imprisonmentDuration": "string", // If applicable, range like "1-5 years" or "up to 30 days"
  "additionalPenalties": ["string"], // Array of other penalties like license suspension, community service
  "legalReferences": ["string"], // Relevant statutes or laws
  "countrySpecific": "string", // Country/region-specific considerations
  "consultRecommended": boolean, // Whether professional legal consultation is strongly advised
  "riskLevel": "string" // "low", "medium", or "high" overall risk assessment
}

Important rules:
- Respond ONLY with the JSON object. No text before or after it.
- Do not include any explanations, introductions, or conclusions.
- Format must be valid JSON that can be directly parsed by JavaScript.
- Make reasonable estimates for fine ranges when specific values are not known.
- Do not include any code blocks or formatting around the JSON.

Now analyze the following:

Country: ${userCountry}
Region: ${userRegion}
Offense: ${userMessage}`;
  
      setProcessingStage(2);
      setProgressValue(50);
      
      const result = await model.generateContent(penaltyPrompt);
      const text = result.response.text();
      console.log(text);
  
      setProcessingStage(3);
      setProgressValue(75);
      
      // Parse the response and create penalty data
      const parsedData = parsePenaltyData(text);

      setPenaltyData(parsedData);
      
      setProgressValue(100);

      // Format a more readable response for the conversation
      const formattedResponse = `**Penalty Analysis for: ${offense}**

**Offense Level:** ${parsedData.offenseLevel}
**Severity:** ${parsedData.severityScore}/10
**Fine Range:** ${parsedData.minFine} - ${parsedData.maxFine} (Recommended: ${parsedData.recommendedFine})
${parsedData.imprisonmentPossible ? `**Imprisonment:** ${parsedData.imprisonmentDuration}` : '**Imprisonment:** Not applicable'}

**Additional Penalties:**
${parsedData.additionalPenalties?.map(p => `- ${p}`).join('\n') || 'None specified'}

**Legal References:**
${parsedData.legalReferences?.map(r => `- ${r}`).join('\n') || 'None specified'}

**Region-Specific Information:**
${parsedData.countrySpecific}

**Risk Level:** ${parsedData.riskLevel.toUpperCase()}
${parsedData.consultRecommended ? '**IMPORTANT:** Consultation with a legal professional is strongly recommended.' : ''}`;
      
      // Update the AI message with the actual response
      tempMessages[0].text = formattedResponse;
      
      // Now that everything is ready, update the messages state
      setMessages(prevMessages => [...prevMessages, ...tempMessages]);
      setError(null);
      
    } catch (error) {
      console.error("Penalty analysis error:", error);
  
      // Update the AI message with error information
      tempMessages[0].text = "Error: Could not generate penalty information.";
      setMessages(prevMessages => [...prevMessages, ...tempMessages]);
      setPenaltyData(null); // Clear any partial data
      setError("Failed to analyze penalty information. Please try again.");
    } finally {
      setTimeout(() => {
        setIsLoading(false);
        setProcessingStage(0);
        setProgressValue(0);
      }, 500);
    }
  };

  // Handle prompt submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!offense.trim()) return;
    
    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      text: `I want to know the penalties for: ${offense} in ${country}${region ? ', ' + region : ''}`,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setPenaltyData(null); // Reset penalty data
    setError(null);
    
    try {
      // Generate penalty data
      generatePenaltyData(offense, country, region);
    } catch (error) {
      console.error("Error processing request:", error);
      setIsLoading(false);
      setError("Failed to process request. Please try again.");
    }
  };

  const getProcessingStageText = (): string => {
    switch (processingStage) {
      case 1: return "Analyzing offense details...";
      case 2: return "Researching applicable penalties...";
      case 3: return "Compiling penalty information...";
      default: return "Processing...";
    }
  };

  const downloadPenaltyDataAsJSON = () => {
    if (!penaltyData) return;
    
    const jsonString = JSON.stringify(penaltyData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = href;
    link.download = 'penalty-analysis.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const downloadPenaltyReport = () => {
    if (!penaltyData) return;
    
    // Create a printable report
    const reportContent = `
    # Penalty Analysis Report
    
    ## Offense Information
    - **Offense:** ${offense}
    - **Jurisdiction:** ${country}${region ? ', ' + region : ''}
    - **Generated:** ${new Date().toLocaleString()}
    
    ## Penalty Details
    - **Offense Level:** ${penaltyData.offenseLevel}
    - **Severity Score:** ${penaltyData.severityScore}/10
    - **Fine Range:** ${penaltyData.minFine} - ${penaltyData.maxFine}
    - **Recommended Fine:** ${penaltyData.recommendedFine}
    - **Imprisonment Possible:** ${penaltyData.imprisonmentPossible ? 'Yes' : 'No'}
    ${penaltyData.imprisonmentPossible ? `- **Imprisonment Duration:** ${penaltyData.imprisonmentDuration}` : ''}
    
    ## Additional Penalties
    ${penaltyData.additionalPenalties?.map(p => `- ${p}`).join('\n') || 'None specified'}
    
    ## Legal References
    ${penaltyData.legalReferences?.map(r => `- ${r}`).join('\n') || 'None specified'}
    
    ## Jurisdiction-Specific Information
    ${penaltyData.countrySpecific}
    
    ## Risk Assessment
    - **Risk Level:** ${penaltyData.riskLevel.toUpperCase()}
    - **Legal Consultation Recommended:** ${penaltyData.consultRecommended ? 'Yes' : 'Not necessary'}
    
    ## Disclaimer
    This analysis is provided for informational purposes only and does not constitute legal advice. 
    Laws and penalties vary by jurisdiction and may change over time. 
    Please consult with a qualified legal professional for specific guidance.
    `;
    
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const href = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = href;
    link.download = 'penalty-analysis-report.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  return (
    <div className="bg-slate-100 min-h-screen">
      <div className="container mx-auto py-12 px-4 max-w-7xl">
        <div className="flex items-center mb-10">
          <div className="p-3 bg-indigo-100 rounded-lg mr-4">
            <Scale className="h-7 w-7 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Legal Penalty Analyzer</h1>
            <p className="text-gray-600 mt-1">Professional analysis of potential legal consequences and penalties</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className="shadow-md border-gray-200 overflow-hidden">
              <CardHeader className="bg-white pb-4">
                <CardTitle className="text-xl font-semibold flex items-center text-gray-800">
                  <FileText className="h-5 w-5 mr-2 text-indigo-600" />
                  Case Information
                </CardTitle>
                <CardDescription className="text-gray-500">Enter details about the offense and jurisdiction</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6 pb-2">
                <form onSubmit={handleSubmit}>
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="country" className="text-gray-700">Jurisdiction</Label>
                        <Select value={country} onValueChange={setCountry}>
                          <SelectTrigger className="w-full mt-1.5 bg-white border-gray-300">
                            <SelectValue placeholder="Select a country" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="United States">United States</SelectItem>
                            <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                            <SelectItem value="Canada">Canada</SelectItem>
                            <SelectItem value="Australia">Australia</SelectItem>
                            <SelectItem value="India">India</SelectItem>
                            <SelectItem value="Singapore">Singapore</SelectItem>
                            <SelectItem value="Germany">Germany</SelectItem>
                            <SelectItem value="France">France</SelectItem>
                            <SelectItem value="Japan">Japan</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="region" className="text-gray-700">Region/State</Label>
                        <Input 
                          id="region"
                          value={region} 
                          onChange={(e) => setRegion(e.target.value)}
                          className="mt-1.5 bg-white border-gray-300"
                          placeholder="e.g., California, New South Wales"
                        />
                        <p className="text-xs text-gray-500 mt-1">Optional, but provides more accurate results</p>
                      </div>
                      
                      <div>
                        <Label htmlFor="offense" className="text-gray-700">Offense Description</Label>
                        <Textarea
                          id="offense"
                          value={offense}
                          onChange={(e) => setOffense(e.target.value)}
                          className="min-h-28 bg-white border-gray-300 resize-none mt-1.5"
                          placeholder="Describe the offense details, circumstances, and any relevant factors..."
                        />
                        <p className="text-xs text-gray-500 mt-1.5">Be specific about the nature, scale, and circumstances of the offense</p>
                      </div>
                    </div>
                  </div>
                
                  <div className="pt-6 pb-2">
                    <Button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                      disabled={!offense.trim() || isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing Analysis
                        </>
                      ) : (
                        <>Analyze Legal Penalties</>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="text-xs text-gray-500 flex items-center">
                  <Info className="h-3 w-3 mr-1 text-gray-400" />
                  Powered by Legal AI Analysis Engine
                </div>
              </CardFooter>
            </Card>
            
            <div className="mt-6">
              <Alert className="bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800 font-medium">Legal Disclaimer</AlertTitle>
                <AlertDescription className="text-amber-700 text-sm">
                  This tool provides estimates based on available information. Results are not legal advice. Consult with a qualified legal professional for accurate guidance specific to your situation.
                </AlertDescription>
              </Alert>
            </div>
            
            {isLoading && (
              <Card className="mt-6 shadow-md border-gray-200">
                <CardContent className="pt-6 pb-4">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-700">
                        {getProcessingStageText()}
                      </span>
                    </div>
                    <Progress value={progressValue} className="h-2 bg-gray-100" />
                    <p className="text-xs text-gray-500">Analyzing legal databases and precedents...</p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {error && (
              <Alert variant="destructive" className="mt-6 bg-red-50 border-red-200 text-red-800">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">Analysis Error</AlertTitle>
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}
          </div>
          
          <div className="lg:col-span-2">
            {penaltyData ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                      <Scale className="h-5 w-5 text-indigo-700" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold tracking-tight text-gray-900">Legal Penalty Analysis</h2>
                      <p className="text-sm text-gray-500">Generated based on the provided offense details</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={downloadPenaltyReport} variant="outline" className="flex items-center border-gray-300 hover:bg-gray-50 text-gray-700">
                      <Printer className="h-4 w-4 mr-2 text-gray-500" />
                      Export Report
                    </Button>
                    <Button onClick={downloadPenaltyDataAsJSON} variant="outline" className="flex items-center border-gray-300 hover:bg-gray-50 text-gray-700">
                      <Download className="h-4 w-4 mr-2 text-gray-500" />
                      Export JSON
                    </Button>
                  </div>
                </div>
                
                <Tabs defaultValue="analysis" className="w-full">
                  <TabsList className="grid grid-cols-2 w-full bg-gray-100 p-1">
                    <TabsTrigger value="analysis" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm">
                      <Scale className="h-4 w-4 mr-2" />
                      Legal Analysis
                    </TabsTrigger>
                    <TabsTrigger value="conversation" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Conversation History
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="analysis" className="mt-4">
                    <Card className="shadow-md border-gray-200 overflow-hidden">
                      <CardHeader className="pb-3 pt-4 px-6 bg-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                              <Badge 
                                className={`mr-3 text-white ${
                                  penaltyData.riskLevel === 'low' ? 'bg-emerald-500' : 
                                  penaltyData.riskLevel === 'medium' ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                              >
                                {penaltyData.riskLevel.toUpperCase()} RISK
                              </Badge>
                              <span>{penaltyData.offenseLevel}</span>
                            </CardTitle>
                            <CardDescription className="text-gray-500 mt-1">
                              {offense.length > 60 ? `${offense.substring(0, 60)}...` : offense}
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="border-gray-300 text-gray-600 text-xs">
                            {country}{region ? `, ${region}` : ''}
                          </Badge>
                        </div>
                      </CardHeader>
                      <Separator />
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          <div className="space-y-6">
                            <div className="bg-gray-50 rounded-lg p-4">
                              <h3 className="text-sm font-medium text-gray-500 mb-3">Case Severity Assessment</h3>
                              <div className="flex items-center mb-2">
                                <div className="h-2.5 w-2.5 rounded-full mr-2" style={{ backgroundColor: getSeverityColor(penaltyData.severityScore) }}></div>
                                <span className="font-semibold text-lg" style={{ color: getSeverityColor(penaltyData.severityScore) }}>
                                  {penaltyData.severityScore}/10
                                </span>
                                <span className="text-xs text-gray-500 ml-2">Severity Score</span>
                              </div>
                              <div className="mt-2">
                                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full" 
                                    style={{ 
                                      width: `${(penaltyData.severityScore / 10) * 100}%`,
                                      backgroundColor: getSeverityColor(penaltyData.severityScore)
                                    }}
                                  />
                                </div>
                                <div className="flex justify-between mt-1.5">
                                  <span className="text-xs text-gray-500">Minor</span>
                                  <span className="text-xs text-gray-500">Moderate</span>
                                  <span className="text-xs text-gray-500">Severe</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex space-x-4">
                              <div className="flex-1 bg-gray-50 rounded-lg p-4">
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Imprisonment</h3>
                                <div className="flex items-center">
                                  <div className={`h-2.5 w-2.5 rounded-full mr-2 ${penaltyData.imprisonmentPossible ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                                  <p className="text-gray-800 font-medium">
                                    {penaltyData.imprisonmentPossible ? 'Possible' : 'Not Applicable'}
                                  </p>
                                </div>
                                {penaltyData.imprisonmentPossible && (
                                  <p className="text-sm text-gray-700 mt-2">{penaltyData.imprisonmentDuration}</p>
                                )}
                              </div>
                              
                              <div className="flex-1 bg-gray-50 rounded-lg p-4">
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Consultation</h3>
                                <div className="flex items-center">
                                  <div className={`h-2.5 w-2.5 rounded-full mr-2 ${penaltyData.consultRecommended ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                                  <p className="text-gray-800 font-medium">
                                    {penaltyData.consultRecommended ? 'Strongly Advised' : 'Optional'}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Enhanced Fine Card */}
                            <Card className="border border-gray-200 shadow-sm overflow-hidden">
                              <CardHeader className="pb-2 pt-3 bg-white">
                                <CardTitle className="text-sm font-medium flex items-center text-gray-700">
                                  <DollarSign className="h-4 w-4 mr-1.5 text-emerald-600" />
                                  Financial Penalties
                                </CardTitle>
                              </CardHeader>
                              <Separator />
                              <CardContent className="pt-4 pb-5">
                                <div className="mb-4">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm text-gray-600">Minimum</span>
                                    <span className="text-sm font-medium text-emerald-600">{penaltyData.minFine}</span>
                                  </div>
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm text-gray-600">Recommended</span>
                                    <span className="text-sm font-medium text-amber-600">{penaltyData.recommendedFine}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Maximum</span>
                                    <span className="text-sm font-medium text-red-600">{penaltyData.maxFine}</span>
                                  </div>
                                </div>
                                
                                <div className="h-3 bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 rounded-md opacity-75"></div>
                                
                                <div className="relative mt-1">
                                  <div className="absolute -top-0 left-0 w-0.5 h-2 bg-emerald-700"></div>
                                  <div 
                                    className="absolute -top-0 h-2 bg-amber-700" 
                                    style={{ 
                                      left: `${((penaltyData.recommendedFine - penaltyData.minFine) / (penaltyData.maxFine - penaltyData.minFine)) * 100}%`,
                                      width: '2px'
                                    }}
                                  ></div>
                                  <div className="absolute -top-0 right-0 w-0.5 h-2 bg-red-700"></div>
                                </div>
                              </CardContent>
                            </Card>
                            
                            {penaltyData.additionalPenalties && penaltyData.additionalPenalties.length > 0 && (
                              <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Additional Penalties</h3>
                                <ul className="space-y-1.5">
                                  {penaltyData.additionalPenalties.map((penalty, index) => (
                                    <li key={index} className="flex items-start text-gray-700">
                                      <div className="h-1.5 w-1.5 rounded-full bg-gray-400 mt-1.5 mr-2"></div>
                                      <span>{penalty}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-6">
                            <div className="bg-gray-50 rounded-lg p-5">
                              <h3 className="text-sm font-medium text-gray-500 mb-3">Fine Comparison</h3>
                              <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={fineChartData} barGap={8}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                  <YAxis tick={{ fontSize: 12 }} />
                                  <Tooltip 
                                    formatter={(value) => [`${value}`, '']}
                                    itemStyle={{ color: '#111827' }}
                                    contentStyle={{ backgroundColor: 'white', borderRadius: '0.375rem', borderColor: '#e5e7eb' }}
                                  />
                                  <Bar dataKey="value">
                                    {fineChartData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                            
                            <div className="bg-gray-50 rounded-lg p-4">
                              <h3 className="text-sm font-medium text-gray-500 mb-3">Jurisdiction-Specific Information</h3>
                              <p className="text-gray-700">{penaltyData.countrySpecific}</p>
                            </div>
                            
                            {penaltyData.legalReferences && penaltyData.legalReferences.length > 0 && (
                              <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="text-sm font-medium text-gray-500 mb-3">Legal References</h3>
                                <ul className="space-y-1.5">
                                  {penaltyData.legalReferences.map((reference, index) => (
                                    <li key={index} className="flex items-start text-gray-700">
                                      <div className="mr-2 mt-0.5">
                                        <GavelIcon className="h-3.5 w-3.5 text-gray-500" />
                                      </div>
                                      <span>{reference}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="conversation" className="mt-4">
                    <Card className="shadow-md border-gray-200">
                      <CardContent className="p-5">
                        <div className="space-y-6">
                          {messages.length > 0 ? (
                            <div className="space-y-6">
                              {messages.map((message) => (
                                <div 
                                  key={message.id} 
                                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div 
                                    className={`rounded-xl p-4 max-w-3xl ${
                                      message.sender === 'user' 
                                        ? 'bg-indigo-100 text-gray-800' 
                                        : 'bg-white border border-gray-200 shadow-sm'
                                    }`}
                                  >
                                    <div className="whitespace-pre-wrap">
                                      {message.sender === 'ai' ? (
                                        <div className="prose prose-sm max-w-none text-gray-700">
                                          {message.text}
                                        </div>
                                      ) : (
                                        <p>{message.text}</p>
                                      )}
                                    </div>
                                    <div className="mt-2 text-xs text-gray-500 text-right">
                                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="py-12 flex flex-col items-center justify-center text-center text-gray-500">
                              <MessageSquare className="h-12 w-12 mb-4 text-gray-300" />
                              <h3 className="font-medium text-gray-700 mb-1">No conversation history</h3>
                              <p className="text-sm text-gray-500">Submit a case analysis request to begin</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <Card className="shadow-md h-full min-h-[600px] flex items-center justify-center border-gray-200">
                <div className="text-center p-8">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100">
                    <Scale className="h-10 w-10 text-indigo-600" />
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-gray-900">Begin Your Legal Analysis</h3>
                  <p className="mt-2 text-sm text-gray-500 max-w-md">
                    Enter offense details and jurisdiction information on the left to receive a comprehensive analysis of potential legal penalties and consequences.
                  </p>
                  <div className="mt-8 flex justify-center">
                    <Badge variant="outline" className="px-3 py-1.5 text-xs font-medium border-gray-300 text-gray-700">
                      Analysis provided for informational purposes only
                    </Badge>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}