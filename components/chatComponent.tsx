"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send } from "lucide-react";
import { askQuestionFromPackage } from "@/lib/actions";

interface ChatComponentProps {
  packageId: string;
  themeColors?: {
    bg: string;
    text: string;
    hint: string;
    link: string;
    button: string;
    buttonText: string;
    secondaryBg: string;
  };
}

export default function ChatComponent({ packageId, themeColors }: ChatComponentProps) {
  // Use Telegram theme colors or defaults
  const bgColor = themeColors?.bg || "#ffffff";
  const textColor = themeColors?.text || "#000000";
  const hintColor = themeColors?.hint || "#6b7280";
  const linkColor = themeColors?.link || "#0ea5e9";
  const buttonColor = themeColors?.button || "#3b82f6";
  const buttonTextColor = themeColors?.buttonText || "#ffffff";
  const secondaryBg = themeColors?.secondaryBg || "#f3f4f6";

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
    <Card 
      className="w-full max-w-2xl mx-auto border-0 shadow-none"
      style={{ background: bgColor }}
    >
      <CardHeader style={{ background: secondaryBg }} className="rounded-t-lg">
        <CardTitle 
          className="flex items-center gap-2"
          style={{ color: textColor }}
        >
          <Send className="h-5 w-5" style={{ color: linkColor }} />
          Ask Darelkubra AI
        </CardTitle>
      </CardHeader>
      <CardContent 
        className="space-y-4 pt-4"
        style={{ background: bgColor }}
      >
        <div className="flex gap-2">
          <Input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about the course content..."
            disabled={loading}
            className="flex-1 border-2"
            style={{
              background: secondaryBg,
              color: textColor,
              borderColor: `${hintColor}40`,
            }}
            aria-label="Question input"
          />
          <Button
            onClick={handleAsk}
            className="px-6 py-2 rounded transition-all duration-200"
            style={{
              background: buttonColor,
              color: buttonTextColor,
            }}
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
              <span 
                className="text-sm font-medium"
                style={{ color: textColor }}
              >
                AI is processing your question...
              </span>
              <span 
                className="text-sm font-medium"
                style={{ color: linkColor }}
              >
                {progress}%
              </span>
            </div>
            <div 
              className="rounded-full h-3"
              style={{ background: `${hintColor}30` }}
            >
              <div
                className="h-3 rounded-full transition-all duration-300 ease-out"
                style={{ 
                  width: `${progress}%`,
                  background: linkColor,
                }}
              ></div>
            </div>
            <p 
              className="text-xs mt-1 text-center"
              style={{ color: hintColor }}
            >
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
          <div 
            className="mt-4 p-4 rounded-lg border"
            style={{
              background: secondaryBg,
              borderColor: `${linkColor}30`,
            }}
          >
            <h3 
              className="font-semibold text-sm mb-2"
              style={{ color: linkColor }}
            >
              Answer {currentAiProvider && `(MelaverseAI)`}:
            </h3>
            <p 
              className="whitespace-pre-wrap leading-relaxed"
              style={{ color: textColor }}
            >
              {answer}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
