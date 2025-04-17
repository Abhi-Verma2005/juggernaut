"use client";
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Scale, Loader2, AlertTriangle, FileCheck, BookOpen, BarChart3, CheckCircle, ArrowRight, Clock, ChevronDown, ChevronUp, Percent } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { PieChart, Pie, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface JudgmentPrediction {
  outcomeType: string;
  successProbability: number;
  penaltyPrediction: string;
  judgmentSummary: string;
  keyCaseInsights: string[];
  legalReasoning: string;
  precedents: Array<{
    caseName: string;
    relevance: number;
    outcome: string;
  }>;
  timelineEstimate: {
    minMonths: number;
    maxMonths: number;
    factors: string[];
  };
  riskFactors: Array<{
    factor: string;
    severity: "high" | "medium" | "low";
    impact: string;
  }>;
  successFactors: Array<{
    factor: string;
    strength: "high" | "medium" | "low";
    impact: string;
  }>;
  alternativeOutcomes: Array<{
    scenario: string;
    probability: number;
    conditions: string;
  }>;
  sectionAnalysis: Array<{
    section: string;
    relevance: number;
    interpretation: string;
  }>;
}

const COURT_TYPES = [
  "Supreme Court",
  "High Court",
  "District Court",
  "Sessions Court",
  "Civil Court",
  "Criminal Court",
  "Family Court",
  "Consumer Court",
  "Labour Court",
  "Tax Tribunal",
  "Other Specialized Tribunal"
];

const CASE_TYPES = [
  "Civil",
  "Criminal",
  "Constitutional",
  "Corporate",
  "Family",
  "Intellectual Property",
  "Tax",
  "Labour",
  "Real Estate",
  "Consumer Protection",
  "Environmental",
  "Other"
];

const JudgmentPredictionPage = () => {
  const [caseDescription, setCaseDescription] = useState<string>("");
  const [involvedSections, setInvolvedSections] = useState<string>("");
  const [plaintiff, setPlaintiff] = useState<string>("");
  const [defendant, setDefendant] = useState<string>("");
  const [courtType, setCourtType] = useState<string>("");
  const [caseType, setCaseType] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [processingStage, setProcessingStage] = useState<number>(0);
  const [progressValue, setProgressValue] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<JudgmentPrediction | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);
  const [includePrecedents, setIncludePrecedents] = useState<boolean>(true);
  const [includeAlternatives, setIncludeAlternatives] = useState<boolean>(true);

  const getOutcomeColor = (probability: number): string => {
    if (probability >= 70) return "#22c55e"; // Green
    if (probability >= 40) return "#f59e0b"; // Amber
    return "#ef4444"; // Red
  };

  const getSeverityColor = (severity: string): string => {
    switch(severity) {
      case "high": return "#ef4444"; // Red
      case "medium": return "#f59e0b"; // Amber
      case "low": return "#22c55e"; // Green
      default: return "#64748b"; // Gray
    }
  };

  const getStrengthColor = (strength: string): string => {
    switch(strength) {
      case "high": return "#22c55e"; // Green
      case "medium": return "#f59e0b"; // Amber
      case "low": return "#ef4444"; // Red
      default: return "#64748b"; // Gray
    }
  };

  const predictJudgment = async () => {
    if (!caseDescription) {
      setError("Please describe the case details");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setProcessingStage(1);
      setProgressValue(20);
      
      // Initialize the Gemini API client
      const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "YOUR_API_KEY";
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model: GenerativeModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      // Create prompt for judgment prediction
      const prompt = createJudgmentPredictionPrompt();
      
      setProcessingStage(2);
      setProgressValue(40);
      
      try {
        // Make the API call to Gemini
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        setProcessingStage(3);
        setProgressValue(70);
        
        // Parse the JSON response
        try {
          // Look for a JSON block in the text
          const jsonMatch = text.match(/```json([\s\S]*?)```/) || 
                         text.match(/{[\s\S]*}/) ||
                         text.match(/\[[\s\S]*\]/);
          
          let parsedResponse: JudgmentPrediction;
          if (jsonMatch) {
            // Clean up the JSON string to parse it
            const jsonStr = jsonMatch[0].replace(/```json|```/g, '').trim();
            parsedResponse = JSON.parse(jsonStr);
          } else {
            // If no JSON block found, create a structured response
            throw new Error("Failed to parse JSON response");
          }
          
          setPrediction(parsedResponse);
        } catch (jsonError) {
          console.error("Failed to parse JSON from Gemini response:", jsonError);
          setError("Failed to analyze response. Please try again.");
        }
        
        setProcessingStage(4);
        setProgressValue(100);
      } catch (apiError) {
        console.error("Error calling Gemini API:", apiError);
        setError("Failed to generate prediction. Please try again.");
      }
    } catch (err) {
      console.error("Error generating judgment prediction:", err);
      setError("Failed to generate prediction. Please try again.");
    } finally {
      setTimeout(() => {
        setIsLoading(false);
        setProcessingStage(0);
        setProgressValue(0);
      }, 500);
    }
  };

  const createJudgmentPredictionPrompt = (): string => {
    const prompt = `
    You are an expert legal analyst specializing in Indian law with extensive knowledge of case outcomes and judicial patterns. Analyze the following case details and predict the likely judgment outcome with probability estimates.

    Respond with a JSON object that contains the following properties:
    1. "outcomeType" - The most likely outcome (e.g., "Conviction", "Acquittal", "Partial Relief", "Dismissed", etc.)
    2. "successProbability" - A numerical probability (0-100) of the plaintiff/prosecution succeeding
    3. "penaltyPrediction" - If applicable, the likely penalty or relief amount
    4. "judgmentSummary" - A concise summary of the predicted judgment
    5. "keyCaseInsights" - An array of 3-5 key insights about the case
    6. "legalReasoning" - Detailed explanation of your legal reasoning
    7. "precedents" - An array of relevant precedents, each with:
       - "caseName" - Name of the precedent case
       - "relevance" - Numerical relevance score (0-100)
       - "outcome" - Brief outcome of that case
    8. "timelineEstimate" - Object containing:
       - "minMonths" - Minimum estimated months to resolution
       - "maxMonths" - Maximum estimated months to resolution
       - "factors" - Array of factors affecting timeline
    9. "riskFactors" - Array of factors that may negatively impact the case, each with:
       - "factor" - Description of the risk
       - "severity" - One of: "high", "medium", "low"
       - "impact" - How this factor impacts the case
    10. "successFactors" - Array of factors that may positively impact the case, each with:
        - "factor" - Description of the success factor
        - "strength" - One of: "high", "medium", "low"
        - "impact" - How this factor impacts the case
    11. "alternativeOutcomes" - Array of alternative scenarios, each with:
        - "scenario" - Description of the alternative outcome
        - "probability" - Numerical probability (0-100)
        - "conditions" - Conditions under which this outcome might occur
    12. "sectionAnalysis" - Array of analyses for each legal section involved, each with:
        - "section" - Section name/number
        - "relevance" - Numerical relevance score (0-100)
        - "interpretation" - How this section applies to the case

    Case Details:
    - Court Type: ${courtType || "Not specified"}
    - Case Type: ${caseType || "Not specified"}
    - Plaintiff/Petitioner: ${plaintiff || "Not specified"}
    - Defendant/Respondent: ${defendant || "Not specified"}
    - Legal Sections Involved: ${involvedSections || "Not specified"}
    - Case Description: ${caseDescription}

    Additional Instructions:
    - Base your analysis on established Indian legal precedents and jurisprudence
    - Include empirical probability estimates based on similar case outcomes
    - Consider recent judicial trends in similar matters
    - ${includePrecedents ? "Include detailed precedent analysis" : "Minimize precedent analysis"}
    - ${includeAlternatives ? "Include multiple alternative scenarios" : "Focus only on the most likely outcome"}

    Format your response as a valid JSON object.
    `;
    
    return prompt;
  };

  const getProcessingStageText = (): string => {
    switch (processingStage) {
      case 1: return "Analyzing case details...";
      case 2: return "Applying legal framework and precedents...";
      case 3: return "Calculating outcome probabilities...";
      case 4: return "Finalizing prediction...";
      default: return "Processing...";
    }
  };

  const renderPieChart = () => {
    if (!prediction) return null;
    
    const data = [
      { name: "Success", value: prediction.successProbability },
      { name: "Failure", value: 100 - prediction.successProbability }
    ];
    
    const COLORS = [getOutcomeColor(prediction.successProbability), "#94a3b8"];
    
    return (
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            fill="#8884d8"
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value}%`} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderAlternativeOutcomesChart = () => {
    if (!prediction || !prediction.alternativeOutcomes) return null;
    
    const data = [
      { name: "Primary", probability: prediction.successProbability, scenario: "Primary Outcome" },
      ...prediction.alternativeOutcomes.map(outcome => ({
        name: outcome.scenario.split(" ").slice(0, 2).join(" "),
        probability: outcome.probability,
        scenario: outcome.scenario
      }))
    ];
    
    return (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis domain={[0, 100]} label={{ value: '%', angle: -90, position: 'insideLeft' }} />
          <Tooltip 
            formatter={(value, name, props) => [`${value}%`, props.payload.scenario]}
            labelFormatter={() => "Probability"}
          />
          <Bar dataKey="probability">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getOutcomeColor(entry.probability)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderSectionAnalysisChart = () => {
    if (!prediction || !prediction.sectionAnalysis) return null;
    
    const data = prediction.sectionAnalysis.map(section => ({
      name: section.section,
      relevance: section.relevance
    }));
    
    return (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, 100]} />
          <YAxis type="category" dataKey="name" width={80} />
          <Tooltip formatter={(value) => `${value}%`} />
          <Bar dataKey="relevance" fill="#3b82f6">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill="#3b82f6" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderTimelineChart = () => {
    if (!prediction || !prediction.timelineEstimate) return null;
    
    const { minMonths, maxMonths } = prediction.timelineEstimate;
    const data = [
      { name: "Minimum", months: minMonths },
      { name: "Maximum", months: maxMonths },
      { name: "Average", months: (minMonths + maxMonths) / 2 }
    ];
    
    return (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis label={{ value: 'Months', angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(value) => `${value} months`} />
          <Bar dataKey="months" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="container mx-auto py-10 px-4 max-w-7xl">
        <div className="flex items-center mb-10 space-x-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Scale className="h-6 w-6 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Judgment Predictor</h1>
            <p className="text-slate-600 mt-1 text-sm">AI-powered case outcome analysis with probability estimates</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="shadow-md border border-slate-200 bg-white overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-slate-50 border-b border-slate-200 py-4 px-6">
                <CardTitle className="text-lg font-medium flex items-center text-slate-800">
                  <BookOpen className="h-4 w-4 mr-2 text-indigo-600" />
                  Case Details
                </CardTitle>
                <CardDescription className="text-sm text-slate-500">Enter information for prediction</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 pb-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="courtType" className="text-slate-700 font-medium text-sm">Court Type</Label>
                      <Select value={courtType} onValueChange={setCourtType}>
                        <SelectTrigger id="courtType" className="mt-1.5 border-slate-300 bg-white">
                          <SelectValue placeholder="Select Court Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {COURT_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="caseType" className="text-slate-700 font-medium text-sm">Case Type</Label>
                      <Select value={caseType} onValueChange={setCaseType}>
                        <SelectTrigger id="caseType" className="mt-1.5 border-slate-300 bg-white">
                          <SelectValue placeholder="Select Case Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {CASE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="plaintiff" className="text-slate-700 font-medium text-sm">Plaintiff/Petitioner</Label>
                      <Input
                        id="plaintiff"
                        placeholder="Enter plaintiff/petitioner"
                        className="mt-1.5 border-slate-300 bg-white"
                        value={plaintiff}
                        onChange={(e) => setPlaintiff(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="defendant" className="text-slate-700 font-medium text-sm">Defendant/Respondent</Label>
                      <Input
                        id="defendant"
                        placeholder="Enter defendant/respondent"
                        className="mt-1.5 border-slate-300 bg-white"
                        value={defendant}
                        onChange={(e) => setDefendant(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="sections" className="text-slate-700 font-medium text-sm">Legal Sections Involved</Label>
                    <Input
                      id="sections"
                      placeholder="E.g., IPC 420, CrPC 156, etc."
                      className="mt-1.5 border-slate-300 bg-white"
                      value={involvedSections}
                      onChange={(e) => setInvolvedSections(e.target.value)}
                    />
                    <p className="text-xs text-slate-500 mt-1.5">Separate multiple sections with commas</p>
                  </div>

                  <div>
                    <Label htmlFor="caseDescription" className="text-slate-700 font-medium text-sm">Case Description</Label>
                    <Textarea
                      id="caseDescription"
                      placeholder="Describe the case facts, circumstances, evidence, and relevant details..."
                      className="mt-1.5 min-h-32 border-slate-300 bg-white resize-none focus:ring-indigo-500 focus:border-indigo-500"
                      value={caseDescription}
                      onChange={(e) => setCaseDescription(e.target.value)}
                    />
                    <p className="text-xs text-slate-500 mt-1.5">Be specific and provide all relevant details for accurate prediction</p>
                  </div>
                  
                  <Collapsible
                    open={showAdvancedOptions}
                    onOpenChange={setShowAdvancedOptions}
                    className="border border-slate-200 rounded-md bg-slate-50 p-3"
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                      <span className="text-sm font-medium text-slate-700">Advanced Options</span>
                      {showAdvancedOptions ? (
                        <ChevronUp className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="precedents" className="text-slate-700 text-sm">Include Precedent Analysis</Label>
                          <p className="text-xs text-slate-500">Analyze similar case precedents</p>
                        </div>
                        <Switch
                          id="precedents"
                          checked={includePrecedents}
                          onCheckedChange={setIncludePrecedents}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="alternatives" className="text-slate-700 text-sm">Include Alternative Outcomes</Label>
                          <p className="text-xs text-slate-500">Predict multiple possible scenarios</p>
                        </div>
                        <Switch
                          id="alternatives"
                          checked={includeAlternatives}
                          onCheckedChange={setIncludeAlternatives}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </CardContent>
              <CardFooter className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-slate-50 border-t border-slate-200">
                <Button
                  onClick={predictJudgment}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={!caseDescription || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Generate Prediction
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
            
            {isLoading && (
              <Card className="mt-4 shadow-sm border border-slate-200 bg-white">
                <CardContent className="pt-4 pb-4">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-slate-700">
                        {getProcessingStageText()}
                      </span>
                    </div>
                    <Progress value={progressValue} className="h-1.5 bg-slate-100" />
                    <p className="text-xs text-slate-500">The AI is analyzing case law and precedents...</p>
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
            
            <div className="mt-4">
              <Alert className="bg-amber-50 border border-amber-200 text-amber-800 shadow-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800 text-sm font-medium">Legal Disclaimer</AlertTitle>
                <AlertDescription className="text-amber-700 text-xs">
                  This prediction is for informational purposes only and does not constitute legal advice. 
                  The prediction is based on AI analysis of provided information and historical patterns. 
                  Actual outcomes may vary significantly.
                </AlertDescription>
              </Alert>
            </div>
          </div>
          
          <div className="lg:col-span-2">
            {prediction ? (
              <div className="space-y-5">
                {/* Prediction Summary Card */}
                <Card className="shadow-md border border-slate-200 bg-white overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-indigo-50 to-slate-50 border-b border-slate-200 py-4 px-6">
                    <CardTitle className="text-lg font-medium text-slate-800">Judgment Prediction Summary</CardTitle>
                    <CardDescription className="text-sm text-slate-500">
                      AI-generated case outcome analysis with probability estimates
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-slate-700">Predicted Outcome</h3>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              Primary
                            </span>
                          </div>
                          <p className="text-lg font-semibold text-slate-900">{prediction.outcomeType}</p>
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-600">Success Probability</span>
                              <span className="font-medium text-slate-900">{prediction.successProbability}%</span>
                            </div>
                            <div className="mt-1 h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full" 
                                style={{ 
                                  width: `${prediction.successProbability}%`,
                                  backgroundColor: getOutcomeColor(prediction.successProbability)
                                }} 
                              />
                            </div>
                          </div>
                          {prediction.penaltyPrediction && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                              <p className="text-sm font-medium text-slate-700">Likely Penalty/Relief</p>
                              <p className="text-slate-600 text-sm mt-1">{prediction.penaltyPrediction}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                          <h3 className="text-sm font-medium text-slate-700 mb-2">Key Case Insights</h3>
                          <ul className="space-y-2">
                            {prediction.keyCaseInsights.map((insight, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-600 mt-0.5">
                                  {idx + 1}
                                </span>
                                <span className="ml-2 text-sm text-slate-600">{insight}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      
                      <div>
                        <div className="bg-white rounded-lg border border-slate-200 p-4 h-full">
                          <h3 className="text-sm font-medium text-slate-700 mb-2">Success Probability</h3>
                          {renderPieChart()}
                          <div className="mt-2">
                            <p className="text-sm text-slate-700">{prediction.judgmentSummary}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Tabs defaultValue="analysis" className="w-full">
                  <TabsList className="grid grid-cols-4 w-full mb-2 bg-slate-100 p-1 rounded-md">
                    <TabsTrigger value="analysis" className="text-sm data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm rounded">
                      <Scale className="h-3.5 w-3.5 mr-1.5" />
                      Analysis
                    </TabsTrigger>
                    <TabsTrigger value="precedents" className="text-sm data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm rounded">
                    <FileCheck className="h-3.5 w-3.5 mr-1.5" />
                      Precedents
                    </TabsTrigger>
                    <TabsTrigger value="alternatives" className="text-sm data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm rounded">
                      <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                      Alternatives
                    </TabsTrigger>
                    <TabsTrigger value="timeline" className="text-sm data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm rounded">
                      <Clock className="h-3.5 w-3.5 mr-1.5" />
                      Timeline
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* Analysis Tab */}
                  <TabsContent value="analysis" className="mt-0">
                    <Card className="shadow-md border border-slate-200 bg-white">
                      <CardHeader className="bg-gradient-to-r from-indigo-50 to-slate-50 border-b border-slate-200 py-3 px-5">
                        <CardTitle className="text-base font-medium text-slate-800">Legal Analysis</CardTitle>
                      </CardHeader>
                      <CardContent className="p-5 space-y-6">
                        <div className="bg-white p-4 rounded-md border border-slate-200 shadow-sm">
                          <h3 className="text-sm font-medium text-slate-800 mb-2">Legal Reasoning</h3>
                          <p className="text-sm text-slate-600 leading-relaxed">{prediction.legalReasoning}</p>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-slate-800 mb-3">Section Analysis</h3>
                          {renderSectionAnalysisChart()}
                          
                          <div className="mt-4 space-y-3">
                            {prediction.sectionAnalysis.map((section, idx) => (
                              <div key={idx} className="bg-slate-50 p-4 rounded-md border border-slate-200 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-sm font-medium text-slate-800">{section.section}</h4>
                                  <span 
                                    className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                                  >
                                    Relevance: {section.relevance}%
                                  </span>
                                </div>
                                <p className="text-sm text-slate-600">{section.interpretation}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h3 className="text-sm font-medium text-slate-800 mb-3">Risk Factors</h3>
                            <div className="space-y-2">
                              {prediction.riskFactors.map((factor, idx) => (
                                <div key={idx} className="flex items-start bg-white p-3 rounded-md border border-slate-200 shadow-sm">
                                  <div className="shrink-0 mr-3">
                                    <div 
                                      className="h-5 w-5 rounded-full flex items-center justify-center" 
                                      style={{ backgroundColor: getSeverityColor(factor.severity) }}
                                    >
                                      <AlertTriangle className="h-3 w-3 text-white" />
                                    </div>
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium text-slate-800">{factor.factor}</p>
                                      <span 
                                        className="px-1.5 py-0.5 rounded text-xs capitalize"
                                        style={{ 
                                          backgroundColor: `${getSeverityColor(factor.severity)}20`,
                                          color: getSeverityColor(factor.severity)
                                        }}
                                      >
                                        {factor.severity}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1">{factor.impact}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="text-sm font-medium text-slate-800 mb-3">Success Factors</h3>
                            <div className="space-y-2">
                              {prediction.successFactors.map((factor, idx) => (
                                <div key={idx} className="flex items-start bg-white p-3 rounded-md border border-slate-200 shadow-sm">
                                  <div className="shrink-0 mr-3">
                                    <div 
                                      className="h-5 w-5 rounded-full flex items-center justify-center" 
                                      style={{ backgroundColor: getStrengthColor(factor.strength) }}
                                    >
                                      <CheckCircle className="h-3 w-3 text-white" />
                                    </div>
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium text-slate-800">{factor.factor}</p>
                                      <span 
                                        className="px-1.5 py-0.5 rounded text-xs capitalize"
                                        style={{ 
                                          backgroundColor: `${getStrengthColor(factor.strength)}20`,
                                          color: getStrengthColor(factor.strength)
                                        }}
                                      >
                                        {factor.strength}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1">{factor.impact}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  {/* Precedents Tab */}
                  <TabsContent value="precedents" className="mt-0">
                    <Card className="shadow-md border border-slate-200 bg-white">
                      <CardHeader className="bg-gradient-to-r from-indigo-50 to-slate-50 border-b border-slate-200 py-3 px-5">
                        <CardTitle className="text-base font-medium text-slate-800">Relevant Precedents</CardTitle>
                      </CardHeader>
                      <CardContent className="p-5">
                        <div className="space-y-4">
                          {prediction.precedents.map((precedent, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-md border border-slate-200 shadow-sm">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-slate-800 flex items-center">
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50 text-xs font-medium text-indigo-600 mr-2">
                                    {idx + 1}
                                  </span>
                                  {precedent.caseName}
                                </h3>
                                <div className="flex items-center">
                                  <span className="text-xs text-slate-500 mr-2">Relevance:</span>
                                  <div className="w-20 bg-slate-200 rounded-full h-1.5">
                                    <div 
                                      style={{ width: `${precedent.relevance}%` }}
                                      className="bg-indigo-600 h-1.5 rounded-full" 
                                    />
                                  </div>
                                  <span className="ml-2 text-xs font-medium text-slate-700">{precedent.relevance}%</span>
                                </div>
                              </div>
                              <p className="text-sm text-slate-600">{precedent.outcome}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  {/* Alternatives Tab */}
                  <TabsContent value="alternatives" className="mt-0">
                    <Card className="shadow-md border border-slate-200 bg-white">
                      <CardHeader className="bg-gradient-to-r from-indigo-50 to-slate-50 border-b border-slate-200 py-3 px-5">
                        <CardTitle className="text-base font-medium text-slate-800">Alternative Outcomes</CardTitle>
                      </CardHeader>
                      <CardContent className="p-5">
                        <div className="mb-6">
                          <h3 className="text-sm font-medium text-slate-800 mb-3">Probability Distribution</h3>
                          {renderAlternativeOutcomesChart()}
                        </div>
                        
                        <div className="space-y-4">
                          {prediction.alternativeOutcomes.map((outcome, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-md border border-slate-200 shadow-sm">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-slate-800">{outcome.scenario}</h3>
                                <span 
                                  className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                                  style={{ 
                                    backgroundColor: `${getOutcomeColor(outcome.probability)}20`,
                                    color: getOutcomeColor(outcome.probability)
                                  }}
                                >
                                  {outcome.probability}% probability
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 mb-3">Conditions: {outcome.conditions}</p>
                              <div className="w-full bg-slate-200 rounded-full h-1.5">
                                <div 
                                  style={{ 
                                    width: `${outcome.probability}%`,
                                    backgroundColor: getOutcomeColor(outcome.probability)
                                  }}
                                  className="h-1.5 rounded-full" 
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  {/* Timeline Tab */}
                  <TabsContent value="timeline" className="mt-0">
                    <Card className="shadow-md border border-slate-200 bg-white">
                      <CardHeader className="bg-gradient-to-r from-indigo-50 to-slate-50 border-b border-slate-200 py-3 px-5">
                        <CardTitle className="text-base font-medium text-slate-800">Case Timeline Estimate</CardTitle>
                      </CardHeader>
                      <CardContent className="p-5">
                        <div className="mb-6">
                          <h3 className="text-sm font-medium text-slate-800 mb-3">Duration Estimate</h3>
                          {renderTimelineChart()}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="bg-emerald-50 p-4 rounded-md border border-emerald-200 shadow-sm">
                            <p className="text-xs text-emerald-600 uppercase font-medium mb-1">Best Case</p>
                            <p className="text-2xl font-bold text-emerald-700">{prediction.timelineEstimate.minMonths} months</p>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-md border border-slate-200 shadow-sm">
                            <p className="text-xs text-slate-600 uppercase font-medium mb-1">Average Case</p>
                            <p className="text-2xl font-bold text-slate-700">
                              {Math.round((prediction.timelineEstimate.minMonths + prediction.timelineEstimate.maxMonths) / 2)} months
                            </p>
                          </div>
                          <div className="bg-amber-50 p-4 rounded-md border border-amber-200 shadow-sm">
                            <p className="text-xs text-amber-600 uppercase font-medium mb-1">Worst Case</p>
                            <p className="text-2xl font-bold text-amber-700">{prediction.timelineEstimate.maxMonths} months</p>
                          </div>
                        </div>
                        
                        <div className="bg-white p-4 rounded-md border border-slate-200 shadow-sm">
                          <h3 className="text-sm font-medium text-slate-800 mb-3">Factors Affecting Timeline</h3>
                          <ul className="space-y-2">
                            {prediction.timelineEstimate.factors.map((factor, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-600 mt-0.5">
                                  {idx + 1}
                                </span>
                                <span className="ml-2 text-sm text-slate-600">{factor}</span>
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
                    This prediction is AI-generated based on the information provided, historical case data, and general legal principles.
                    Every legal case has unique aspects that may affect the outcome. Actual results may vary, and this assessment 
                    should be used for informational purposes only, not as a replacement for professional legal advice.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[500px] rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <div className="rounded-full bg-indigo-100 p-3 border border-indigo-200">
                      <Scale className="h-6 w-6 text-indigo-600" />
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-slate-900">No prediction generated yet</h3>
                  <p className="text-sm text-slate-500 max-w-md">
                    Fill in your case details on the left to receive an AI-powered judgment prediction with probability estimates and legal analysis.
                  </p>
                  <div className="pt-4">
                    <div className="flex items-center justify-center space-x-8 text-center">
                      <div className="flex flex-col items-center">
                        <Percent className="h-8 w-8 text-indigo-400 mb-2" />
                        <p className="text-xs font-medium text-slate-700">Success Probability</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <FileCheck className="h-8 w-8 text-indigo-400 mb-2" />
                        <p className="text-xs font-medium text-slate-700">Precedent Analysis</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <Clock className="h-8 w-8 text-indigo-400 mb-2" />
                        <p className="text-xs font-medium text-slate-700">Timeline Estimate</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JudgmentPredictionPage;