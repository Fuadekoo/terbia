"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send } from "lucide-react";
import { askQuestionFromPackage } from "@/lib/actions";

export default function ChatComponent({ packageId }: { packageId: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentAiProvider, setCurrentAiProvider] = useState<string>("");
  const [progress, setProgress] = useState(0);
  

  const handleAsk = async () => {
    setLoading(true);
    setProgress(0);

    // Simulate progress steps for AI processing
    const progressSteps = [
      { step: 15, message: "Analyzing question..." },
      { step: 30, message: "Searching content..." },
      { step: 50, message: "Processing with AI..." },
      { step: 75, message: "Generating response..." },
      { step: 90, message: "Finalizing answer..." },
      { step: 100, message: "Complete!" },
    ];

    for (const { step } of progressSteps) {
      setProgress(step);
      await new Promise((resolve) => setTimeout(resolve, 150)); // Small delay for visual effect
    }

    // Use the new function that gets data from database
    const result = await askQuestionFromPackage(question, packageId);
    if (result.success) {
      setAnswer(result.answer || "No answer received");
      setCurrentAiProvider(
        result.aiProvider === "gemini" ? "Gemini AI" : "OpenAI GPT-4"
      );
    } else {
      setAnswer(`Error: ${result.error}`);
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Ask the PDF
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about the PDF content..."
            disabled={loading}
            className="flex-1"
            aria-label="Question input"
          />
          <Button
            onClick={handleAsk}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center"
            disabled={loading || !question.trim()}
            aria-label="Submit question"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {loading && (
          
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                AI is processing your question...
              </span>
              <span className="text-sm font-medium text-blue-600">
                {progress}%
              </span>
            </div>
            <div className="bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">
              {progress < 15 && "Analyzing question..."}
              {progress >= 15 && progress < 30 && "Searching content..."}
              {progress >= 30 && progress < 50 && "Processing with AI..."}
              {progress >= 50 && progress < 75 && "Generating response..."}
              {progress >= 75 && progress < 90 && "Finalizing answer..."}
              {progress >= 90 && progress < 100 && "Almost done..."}
              {progress === 100 && "Complete!"}
            
            </p>
          </div>
        )}
        {answer && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">
              Answer {currentAiProvider && `(MelaverseAI)`}:
            </h3>
            <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
              {answer}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
