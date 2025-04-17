"use client";
import { useState, useCallback } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Connection,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, MessageSquare, AlertTriangle, Download, Info, Scale } from "lucide-react";

type NodeData = {
  label: string;
};

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
};

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

export default function AIFlowGenerator() {
  const [prompt, setPrompt] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [flowchartGenerated, setFlowchartGenerated] = useState<boolean>(false);
  const [processingStage, setProcessingStage] = useState<number>(0);
  const [progressValue, setProgressValue] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  //@ts-expect-error: no need here
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback(
    (params: Connection) =>
      //@ts-expect-error: no need here
      setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: "#3b82f6" } }, eds)),
    [setEdges]
  );

  // Parse the AI response and create a flowchart
  const parseFlowchartSteps = (text: string) => {
    // Split the text into lines and filter to get only numbered steps
    const lines = text.split('\n');
    const stepLines = lines.filter(line => /^\d+\./.test(line.trim()));
    
    // Create nodes from steps
    const newNodes: Node<NodeData>[] = stepLines.map((step, index) => {
      // Extract step content (removing the number and period)
      const stepContent = step.replace(/^\d+\.\s*/, '').trim();
      
      return {
        id: `node-${index}`,
        data: { label: stepContent },
        position: { x: 250, y: index * 100 },
        style: {
          background: '#f0f9ff',
          border: '1px solid #93c5fd',
          borderRadius: '8px',
          padding: '10px',
          width: 200,
        },
      };
    });
    
    // Create edges between consecutive steps
    const newEdges: Edge[] = [];
    for (let i = 0; i < newNodes.length - 1; i++) {
      newEdges.push({
        id: `edge-${i}-${i+1}`,
        source: `node-${i}`,
        target: `node-${i+1}`,
        animated: true,
        style: { stroke: "#3b82f6" },
      });
    }
    
    // Update state
    //@ts-expect-error: no need here
    setNodes(newNodes);
    //@ts-expect-error: no need here
    setEdges(newEdges);
    
    // Mark that the flowchart has been generated
    setFlowchartGenerated(true);
  };

  const generateFlowchart = async (userMessage: string) => {
    const aiMessageId = Date.now() + 1 + '';
    
    // Temporarily store the message but don't display it yet
    const tempMessages = [
      {
        id: aiMessageId,
        text: 'Generating flowchart...',
        sender: 'ai' as const,
        timestamp: new Date(),
      }
    ];
  
    try {
      setProcessingStage(1);
      setProgressValue(25);
      
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const flowchartPrompt = `Your name is Juggernaut, also known as Jugg. 
You are an AI expert in legal documentation and visualization. Your sole task is to convert legal processes into step-by-step flowcharts.

Guidelines:
- Respond strictly in a numbered list format (1., 2., 3., etc.)
- Each step must be a clear and complete short title (around 10–20 words) so that someone unfamiliar with the law can easily understand the action to be taken.
- Maintain chronological and procedural order of the legal process.
- No paragraph or conversational text — only flowchart-ready steps.
- Avoid assumptions. If steps vary by condition, state them separately and clearly.
- Never generate visual diagrams, only provide the logical flow as numbered steps.
- Do not include any disclaimers or side-notes in this case.
- Do not make too big points not too small, good enough to understand.

Example:
1. Cheque bounce occurs due to insufficient funds or invalid account
2. Send a legal notice to the issuer within 30 days of cheque return
3. Wait 15 days after notice delivery for a valid payment response
4. If no payment is made, file a complaint under Section 138 of the NI Act
...

Now respond with the legal flowchart steps for: `;
      const fullPrompt = flowchartPrompt + userMessage;
  
      setProcessingStage(2);
      setProgressValue(50);
      
      const result = await model.generateContent(fullPrompt);
      const text = result.response.text();
  
      const beautified = text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1');
  
      // Update the AI message with the actual response
      tempMessages[0].text = beautified;
      
      setProcessingStage(3);
      setProgressValue(75);
      
      // Parse the response and create flowchart
      parseFlowchartSteps(beautified);
      
      setProgressValue(100);
      
      // Now that everything is ready, update the messages state
      setMessages(prevMessages => [...prevMessages, ...tempMessages]);
      setError(null);
      
    } catch (error) {
      console.error("Flowchart generation error:", error);
  
      // Update the AI message with error information
      tempMessages[0].text = "Error: Could not generate flowchart.";
      setMessages(prevMessages => [...prevMessages, ...tempMessages]);
      setFlowchartGenerated(true); // End the loading state even on error
      setError("Failed to generate flowchart. Please try again.");
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
    
    if (!prompt.trim()) return;
    
    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      text: prompt,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setFlowchartGenerated(false); // Reset flowchart generation status
    setError(null);
    
    try {
      // Clear any existing flowchart
      setNodes([]);
      setEdges([]);
      
      // Generate flowchart
      generateFlowchart(prompt);
    } catch (error) {
      console.error("Error processing request:", error);
      setIsLoading(false);
      setFlowchartGenerated(true);
      setError("Failed to process request. Please try again.");
    }
    
    setPrompt("");
  };

  const getProcessingStageText = (): string => {
    switch (processingStage) {
      case 1: return "Analyzing legal process...";
      case 2: return "Extracting steps for visualization...";
      case 3: return "Building flowchart...";
      default: return "Processing...";
    }
  };

  const downloadFlowchartAsJSON = () => {
    if (nodes.length === 0) return;
    
    const data = { nodes, edges };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = href;
    link.download = 'legal-flowchart.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="flex items-center mb-8 space-x-2">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Scale className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Legal Flowchart Generator</h1>
            <p className="text-slate-500 mt-1">Create step-by-step visualization of legal processes using AI</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-lg">
                <CardTitle className="text-xl font-medium flex items-center text-slate-800">
                  <Info className="h-5 w-5 mr-2 text-indigo-500" />
                  Process Description
                </CardTitle>
                <CardDescription>Describe the legal process to visualize</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 pb-2">
                <form onSubmit={handleSubmit}>
                  <div className="space-y-6">
                    <div>
                      <Textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="min-h-32 border-slate-300 bg-white resize-none"
                        placeholder="Describe a legal process (e.g., 'Steps in filing a trademark', 'Divorce procedure')..."
                      />
                      <p className="text-xs text-slate-500 mt-1.5">Be specific about the legal process you want to visualize</p>
                    </div>
                  </div>
                
                  <div className="pt-4 pb-2">
                    <Button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                      disabled={!prompt.trim() || isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>Generate Flowchart</>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-lg">
                <div className="text-xs text-slate-500">
                  Powered by Juggernaut AI
                </div>
              </CardFooter>
            </Card>
            
            <div className="mt-6">
              <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Legal Disclaimer</AlertTitle>
                <AlertDescription className="text-amber-700 text-sm">
                  The flowcharts generated are for reference only. Always consult with a qualified legal professional for accurate legal advice.
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
            {flowchartGenerated && messages.length > 0 ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {/* <FlowChart className="h-5 w-5 text-indigo-500 mr-2" /> */}
                    <h2 className="text-xl font-semibold tracking-tight text-slate-800">Generated Flowchart</h2>
                    {prompt && <Badge className="ml-3 bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-0">
                      {prompt.length > 20 ? `${prompt.substring(0, 20)}...` : prompt}
                    </Badge>}
                  </div>
                  {nodes.length > 0 && (
                    <Button onClick={downloadFlowchartAsJSON} variant="outline" className="flex items-center border-slate-300 hover:bg-slate-50 text-slate-700">
                      <Download className="h-4 w-4 mr-2 text-slate-500" />
                      Download
                    </Button>
                  )}
                </div>
                
                <Tabs defaultValue="flowchart" className="w-full">
                  <TabsList className="grid grid-cols-2 w-full mb-2 bg-slate-100">
                    <TabsTrigger value="flowchart" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm">
                      {/* <FlowChart className="h-4 w-4 mr-2" /> */}
                      Flowchart View
                    </TabsTrigger>
                    <TabsTrigger value="conversation" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Conversation
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="flowchart" className="mt-0">
                    <Card className="shadow-sm border-slate-200">
                      <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 px-6">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg font-medium text-slate-800">Legal Process Visualization</CardTitle>
                          <Badge variant="outline" className="border-slate-300 text-slate-600 text-xs font-normal">
                            {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div style={{ height: 500 }} className="bg-slate-50">
                          {nodes.length > 0 ? (
                            <ReactFlow
                              //@ts-expect-error: no need here
                              nodes={nodes}
                              edges={edges}
                              //@ts-expect-error: no need here 
                              onNodesChange={onNodesChange}
                              onEdgesChange={onEdgesChange}
                              onConnect={onConnect}
                              fitView
                              attributionPosition="bottom-right"
                            >
                              <Controls position="bottom-right" />
                              <MiniMap />
                              <Background color="#f1f5f9" gap={16} />
                            </ReactFlow>
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <p>No flowchart data available</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end py-3 px-6 bg-slate-50 border-t border-slate-100">
                        {nodes.length > 0 && (
                          <Button onClick={downloadFlowchartAsJSON} variant="outline" className="flex items-center border-slate-300 hover:bg-slate-100 text-slate-700">
                            <Download className="h-4 w-4 mr-2 text-slate-500" />
                            Download Flowchart
                          </Button>
                        )}
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
                                {message.sender === 'user' ? 'You:' : 'Juggernaut AI:'}
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
                
                <Alert className="bg-indigo-50 border-indigo-100 text-indigo-800">
                  <Info className="h-4 w-4 text-indigo-500" />
                  <AlertTitle className="text-indigo-800 font-medium">Important Notice</AlertTitle>
                  <AlertDescription className="text-indigo-700 text-sm">
                    This flowchart represents a general framework of the legal process. Local regulations and specific circumstances 
                    may require additional steps. Consult with a legal professional for personalized guidance.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px] rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
                <div className="space-y-2">
                  <div className="flex justify-center">
                    <div className="rounded-full bg-slate-100 p-3">
                      {/* <FlowChart className="h-6 w-6 text-slate-400" /> */}
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-slate-900">No flowchart generated yet</h3>
                  <p className="text-sm text-slate-500 max-w-md">
                    Describe a legal process and submit your query to generate a step-by-step visualization.
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