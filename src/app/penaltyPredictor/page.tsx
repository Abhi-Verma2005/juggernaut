"use client";
import { useState, useCallback, useEffect } from "react";
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
import { Loader2, AlertTriangle, Download, Info, Scale, FileWarning, MessageSquare, Printer, DollarSign } from "lucide-react";

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
  const [fineChartData, setFineChartData] = useState<any[]>([]);

  // Parse the AI response and create penalty data
  const parsePenaltyData = (text: string): PenaltyData => {
    try {
      // Clean up the text to ensure it's valid JSON
      // This removes any markdown formatting or extra text that might be included
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
          fill: "#22c55e", // green
        },
        {
          name: "Recommended Fine",
          value: jsonData.recommendedFine,
          fill: "#eab308", // yellow
        },
        {
          name: "Maximum Fine",
          value: jsonData.maxFine,
          fill: "#ef4444", // red
        },
      ]);
      
      return jsonData;
    } catch (error) {
      console.error("Failed to parse penalty data:", error);
      throw new Error("Invalid data format received from AI");
    }
  };

  const getSeverityColor = (score: number): string => {
    if (score <= 3) return "#22c55e"; // green
    if (score <= 6) return "#eab308"; // yellow
    return "#ef4444"; // red
  };

  const getRiskLevelColor = (level: string): string => {
    if (level === "low") return "#22c55e"; // green
    if (level === "medium") return "#eab308"; // yellow
    return "#ef4444"; // red
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
      const penaltyPrompt = `Your name is PenaltyPro AI. 
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
      console.log(text)
  
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
    <div className="bg-slate-50 min-h-screen">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="flex items-center mb-8 space-x-2">
          <div className="p-2 bg-red-100 rounded-lg">
            <FileWarning className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">AI Penalty Calculator</h1>
            <p className="text-slate-500 mt-1">Analyze potential legal penalties and fines for various offenses</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-lg">
                <CardTitle className="text-xl font-medium flex items-center text-slate-800">
                  <Info className="h-5 w-5 mr-2 text-red-500" />
                  Offense Information
                </CardTitle>
                <CardDescription>Enter details about the offense and jurisdiction</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 pb-2">
                <form onSubmit={handleSubmit}>
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="country">Country</Label>
                        <Select value={country} onValueChange={setCountry}>
                          <SelectTrigger className="w-full mt-1">
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
                        <Label htmlFor="region">Region/State (Optional)</Label>
                        <Input 
                          id="region"
                          value={region} 
                          onChange={(e) => setRegion(e.target.value)}
                          className="mt-1 border-slate-300"
                          placeholder="e.g., California, New South Wales"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="offense">Describe the Offense</Label>
                        <Textarea
                          id="offense"
                          value={offense}
                          onChange={(e) => setOffense(e.target.value)}
                          className="min-h-24 border-slate-300 bg-white resize-none mt-1"
                          placeholder="Describe the offense or violation (e.g., 'Speeding 20mph over limit', 'Tax evasion of $50,000')..."
                        />
                        <p className="text-xs text-slate-500 mt-1.5">Be specific about the nature and scale of the offense</p>
                      </div>
                    </div>
                  </div>
                
                  <div className="pt-4 pb-2">
                    <Button
                      type="submit"
                      className="w-full bg-red-600 hover:bg-red-700"
                      disabled={!offense.trim() || isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>Analyze Penalties</>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-lg">
                <div className="text-xs text-slate-500">
                  Powered by PenaltyPro AI
                </div>
              </CardFooter>
            </Card>
            
            <div className="mt-6">
              <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Legal Disclaimer</AlertTitle>
                <AlertDescription className="text-amber-700 text-sm">
                  This tool provides estimates based on available information. Always consult with a legal professional for accurate and personalized legal advice.
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
            {penaltyData ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Scale className="h-5 w-5 text-red-500 mr-2" />
                    <h2 className="text-xl font-semibold tracking-tight text-slate-800">Penalty Analysis</h2>
                    {offense && <Badge className="ml-3 bg-red-100 text-red-800 hover:bg-red-200 border-0">
                      {offense.length > 20 ? `${offense.substring(0, 20)}...` : offense}
                    </Badge>}
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={downloadPenaltyReport} variant="outline" className="flex items-center border-slate-300 hover:bg-slate-50 text-slate-700">
                      <Printer className="h-4 w-4 mr-2 text-slate-500" />
                      Download Report
                    </Button>
                    <Button onClick={downloadPenaltyDataAsJSON} variant="outline" className="flex items-center border-slate-300 hover:bg-slate-50 text-slate-700">
                      <Download className="h-4 w-4 mr-2 text-slate-500" />
                      Download JSON
                    </Button>
                  </div>
                </div>
                
                <Tabs defaultValue="analysis" className="w-full">
                  <TabsList className="grid grid-cols-2 w-full mb-2 bg-slate-100">
                    <TabsTrigger value="analysis" className="data-[state=active]:bg-white data-[state=active]:text-red-700 data-[state=active]:shadow-sm">
                      <Scale className="h-4 w-4 mr-2" />
                      Penalty Analysis
                    </TabsTrigger>
                    <TabsTrigger value="conversation" className="data-[state=active]:bg-white data-[state=active]:text-red-700 data-[state=active]:shadow-sm">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Conversation
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="analysis" className="mt-0">
                    <Card className="shadow-sm border-slate-200">
                      <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 px-6">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg font-medium text-slate-800">
                            <span className="flex items-center">
                              <span className="mr-2">Offense Details</span>
                              <Badge 
                                className={`text-white ${
                                  penaltyData.riskLevel === 'low' ? 'bg-green-500' : 
                                  penaltyData.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                              >
                                {penaltyData.riskLevel.toUpperCase()} RISK
                              </Badge>
                            </span>
                          </CardTitle>
                          <Badge variant="outline" className="border-slate-300 text-slate-600 text-xs font-normal">
                            {country}{region ? `, ${region}` : ''}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-6">
                            <div>
                              <h3 className="text-sm font-medium text-slate-500">Offense Classification</h3>
                              <p className="text-lg font-semibold text-slate-800 mt-1">{penaltyData.offenseLevel}</p>
                            </div>
                            
                            <div>
                              <h3 className="text-sm font-medium text-slate-500">Severity Score</h3>
                              <div className="mt-2">
                                <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full" 
                                    style={{ 
                                      width: `${(penaltyData.severityScore / 10) * 100}%`,
                                      backgroundColor: getSeverityColor(penaltyData.severityScore)
                                    }}
                                  />
                                </div>
                                <div className="flex justify-between mt-1">
                                  <span className="text-xs text-slate-500">Minor</span>
                                  <span className="text-xs font-medium" style={{ color: getSeverityColor(penaltyData.severityScore) }}>
                                    {penaltyData.severityScore}/10
                                  </span>
                                  <span className="text-xs text-slate-500">Severe</span>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h3 className="text-sm font-medium text-slate-500">Imprisonment</h3>
                              <div className="flex items-center mt-2">
                                <div className={`h-3 w-3 rounded-full mr-2 ${penaltyData.imprisonmentPossible ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                <p className="text-slate-800">
                                  {penaltyData.imprisonmentPossible ? 
                                    `Possible: ${penaltyData.imprisonmentDuration}` : 
                                    'Not applicable'}
                                </p>
                              </div>
                            </div>
                            
                            {/* New prominent fine range display */}
                            <Card className="bg-slate-50 border border-slate-200 shadow-sm">
                              <CardHeader className="pb-2 pt-3">
                                <CardTitle className="text-sm font-medium flex items-center text-slate-700">
                                  <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                                  Fine Amount Range
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pb-4">
                                <div className="flex flex-col space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500">Minimum</span>
                                    <span className="text-sm font-semibold text-green-600">{penaltyData.minFine}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500">Recommended</span>
                                    <span className="text-sm font-semibold text-yellow-600">{penaltyData.recommendedFine}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500">Maximum</span>
                                    <span className="text-sm font-semibold text-red-600">{penaltyData.maxFine}</span>
                                  </div>
                                </div>
                                <div className="mt-3 h-6 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-md relative">
                                  <div className="absolute top-6 left-0 w-0.5 h-2 bg-green-700"></div>
                                  <div 
                                    className="absolute top-6 h-2 bg-yellow-700" 
                                    style={{ 
                                      left: `${((penaltyData.recommendedFine - penaltyData.minFine) / (penaltyData.maxFine - penaltyData.minFine)) * 100}%`,
                                      width: '2px'
                                    }}
                                  ></div>
                                  <div className="absolute top-6 right-0 w-0.5 h-2 bg-red-700"></div>
                                </div>
                              </CardContent>
                            </Card>
                            
                            {penaltyData.additionalPenalties && penaltyData.additionalPenalties.length > 0 && (
                              <div>
                                <h3 className="text-sm font-medium text-slate-500">Additional Penalties</h3>
                                <ul className="list-disc list-inside text-slate-700 mt-2 space-y-1">
                                  {penaltyData.additionalPenalties.map((penalty, index) => (
                                    <li key={index}>{penalty}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {penaltyData.consultRecommended && (
                              <Alert className="bg-red-50 border-red-200 text-red-800">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                <AlertTitle className="text-red-800">Legal Consultation Recommended</AlertTitle>
                                <AlertDescription className="text-red-700 text-sm">
                                  Due to the serious nature of this offense, consulting with a legal professional is strongly advised.
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                          
                          <div className="space-y-6">
                            {/* Enhanced bar chart for fines */}
                            <div>
                              <h3 className="text-sm font-medium text-slate-500 mb-2">Fine Range Comparison</h3>
                              <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={fineChartData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" />
                                    <Tooltip formatter={(value: string) => [`${value}`, 'Amount']} />
                                    <Bar dataKey="value">
                                      {fineChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                      ))}
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                            
                            {penaltyData.legalReferences && penaltyData.legalReferences.length > 0 && (
                              <div>
                                <h3 className="text-sm font-medium text-slate-500">Legal References</h3>
                                <ul className="list-disc list-inside text-slate-700 mt-2 space-y-1">
                                  {penaltyData.legalReferences.map((reference, index) => (
                                    <li key={index}>{reference}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            <div>
                              <h3 className="text-sm font-medium text-slate-500">Jurisdiction-Specific Notes</h3>
                              <p className="text-slate-700 mt-1">{penaltyData.countrySpecific}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end py-3 px-6 bg-slate-50 border-t border-slate-100">
                        <div className="text-sm text-slate-500">
                          Analysis generated on {new Date().toLocaleDateString()}
                        </div>
                      </CardFooter>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="conversation" className="mt-0">
                    <Card className="shadow-sm border-slate-200">
                      <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 px-6">
                        <CardTitle className="text-lg font-medium text-slate-800">Conversation History</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="max-h-[500px] overflow-y-auto p-4 space-y-4">
                          {messages.map((message) => (
                            <div 
                              key={message.id} 
                              className={`p-3 rounded-lg ${
                                message.sender === 'user' 
                                  ? 'bg-blue-50 border border-blue-100 ml-auto mr-0 max-w-[85%]' 
                                  : 'bg-slate-50 border border-slate-100 ml-0 mr-auto max-w-[85%]'
                              }`}
                            >
                              <div className="font-medium mb-1 text-xs text-slate-600">
                                {message.sender === 'user' ? 'You:' : 'PenaltyPro AI:'}
                              </div>
                              <div className="text-sm text-slate-800 whitespace-pre-wrap">{message.text}</div>
                              <div className="text-xs text-slate-400 mt-1 text-right">
                                {message.timestamp.toLocaleTimeString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
                
                <Alert className="bg-slate-50 border-slate-200 text-slate-800">
                  <Info className="h-4 w-4 text-slate-500" />
                  <AlertTitle className="text-slate-800 font-medium">Important Notice</AlertTitle>
                  <AlertDescription className="text-slate-700 text-sm">
                    This penalty analysis represents general information based on available data. Specific circumstances, prior offenses, and jurisdictional variations may affect actual penalties. This information is not legal advice.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px] rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
                <div className="space-y-2">
                  <div className="flex justify-center">
                    <div className="rounded-full bg-red-100 p-3">
                      <Scale className="h-6 w-6 text-red-400" />
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-slate-900">No penalty analysis yet</h3>
                  <p className="text-sm text-slate-500 max-w-md">
                    Describe an offense and submit your query to generate a detailed penalty analysis with visualizations.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}