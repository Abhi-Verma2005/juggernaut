"use client";
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

// Import pdf.js dynamically on the client side
const PdfExtractor = ({ file, onTextExtracted, onError }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Loading PDF.js...');

  useEffect(() => {
    if (!file) return;

    // Define an async function to load the PDF library and process the file
    const extractTextFromPdf = async () => {
      try {
        setStatus('Loading PDF.js library...');
        
        // Dynamically import the PDF.js library
        const pdfjsLib = await import('pdfjs-dist/build/pdf');
        const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.entry');
        
        // Set the PDF.js worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
        
        setStatus('Reading PDF file...');
        
        // Create a blob URL for the file
        const fileURL = URL.createObjectURL(file);
        
        // Load the PDF document
        const pdf = await pdfjsLib.getDocument(fileURL).promise;
        const numPages = pdf.numPages;
        
        setStatus(`Extracting text from ${numPages} pages...`);
        
        // Extract text from each page
        let fullText = '';
        for (let i = 1; i <= numPages; i++) {
          // Update progress
          setProgress((i / numPages) * 100);
          setStatus(`Processing page ${i} of ${numPages}...`);
          
          // Get page
          const page = await pdf.getPage(i);
          
          // Extract text content
          const textContent = await page.getTextContent();
          
          // Concatenate text items with proper spacing
          const pageText = textContent.items
            .map(item => item.str)
            .join(' ');
            
          fullText += pageText + '\n\n';
        }
        
        // Cleanup the created URL
        URL.revokeObjectURL(fileURL);
        
        setProgress(100);
        setStatus('Extraction complete!');
        
        // Return the extracted text to the parent component
        onTextExtracted(fullText);
      } catch (error) {
        console.error('Error extracting text from PDF:', error);
        onError('Failed to extract text from PDF. Please check if the file is valid and try again.');
      }
    };

    extractTextFromPdf();
  }, [file, onTextExtracted, onError]);

  return (
    <div className="p-4 border rounded-md bg-slate-50 mb-4">
      <div className="flex items-center mb-2">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        <span className="text-sm font-medium">{status}</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
};

export default PdfExtractor;