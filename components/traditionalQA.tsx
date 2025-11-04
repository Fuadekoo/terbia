/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect } from "react";
import { MessageCircle, Send, Clock, Reply, Plus, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  submitVideoQuestion,
  getVideoQuestions,
  // deleteVideoQuestion,
} from "@/actions/student/videoqa";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface VideoQuestion {
  id: string;
  question: string;
  timestamp?: number | null;
  createdAt: string;
  student: {
    id: string;
    firstName: string;
    fatherName: string;
    lastName: string;
  };
  responses: {
    id: string;
    response: string;
    createdAt: string;
    instructor: {
      firstName: string;
      fatherName: string;
      lastName: string;
    };
  }[];
}

interface TraditionalQAProps {
  packageId: string;
  lang: string;
  studentId: number;
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

export default function TraditionalQA({
  studentId,
  packageId,
  lang,
  themeColors,
}: TraditionalQAProps) {
  // Use Telegram theme colors or defaults
  const bgColor = themeColors?.bg || "#ffffff";
  const textColor = themeColors?.text || "#000000";
  const hintColor = themeColors?.hint || "#6b7280";
  const linkColor = themeColors?.link || "#0ea5e9";
  const buttonColor = themeColors?.button || "#0ea5e9";
  const buttonTextColor = themeColors?.buttonText || "#ffffff";
  const secondaryBg = themeColors?.secondaryBg || "#f3f4f6";

  // const { data: session } = useSession();
  const [questions, setQuestions] = useState<VideoQuestion[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId]);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const result = await getVideoQuestions(packageId);
      if (result.success && Array.isArray(result.data)) {
        const questionsWithStringDates = result.data.map((q: any) => ({
          id: q.id,
          question: q.question,
          timestamp: q.timestamp ?? null,
          createdAt: q.createdAt ? q.createdAt.toString() : "",
          student: q.student
            ? {
                id: q.student.id,
                firstName: q.student.firstName,
                fatherName: q.student.fatherName,
                lastName: q.student.lastName,
              }
            : { id: "", firstName: "", fatherName: "", lastName: "" },
          responses: Array.isArray(q.responses)
            ? q.responses.map((r: any) => ({
                id: r.id,
                response: r.response,
                createdAt: r.createdAt ? r.createdAt.toString() : "",
                instructor: r.instructor
                  ? {
                      firstName: r.instructor.firstName,
                      fatherName: r.instructor.fatherName,
                      lastName: r.instructor.lastName,
                    }
                  : { firstName: "", fatherName: "", lastName: "" },
              }))
            : [],
        }));
        setQuestions(questionsWithStringDates);
      }
    } catch (error) {
      console.error("Error loading questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuestion = async () => {
    if (!newQuestion.trim()) return;
    setSubmitting(true);
    try {
      // Accept both string and number for studentId
      const result = await submitVideoQuestion(
        studentId,
        packageId,
        newQuestion.trim()
      );
      if (result.success) {
        setNewQuestion("");
        setDialogOpen(false);
        await loadQuestions();
      } else {
        alert(
          lang === "en" ? "Failed to submit question" : "ጥያቄን ማስገባት አልተሳካም"
        );
      }
    } catch (error) {
      console.error("Error submitting question:", error);
      alert(
        lang === "en" ? "Error submitting question" : "ጥያቄን በማስገባት ላይ ስህተት"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // const handleDeleteQuestion = async (questionId: string) => {
  //   const confirmMessage =
  //     lang === "en"
  //       ? "Are you sure you want to delete this question?"
  //       : "ይህን ጥያቄ መሰረዝ እርግጠኛ ነዎት?";
  //   if (!confirm(confirmMessage)) return;
  //   try {
  //     const result = await deleteVideoQuestion(questionId);
  //     if (result.success) {
  //       await loadQuestions();
  //     } else {
  //       alert(lang === "en" ? "Failed to delete question" : "ጥያቄን መሰረዝ አልተሳካም");
  //     }
  //   } catch (error) {
  //     console.error("Error deleting question:", error);
  //     alert(lang === "en" ? "Error deleting question" : "ጥያቄን በመሰረዝ ላይ ስህተት");
  //   }
  // };

  return (
    <div 
      className="space-y-1 h-full flex flex-col rounded-md p-1.5 shadow-sm"
      style={{ background: bgColor }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <div 
            className="p-1 rounded-md shadow-sm"
            style={{ background: `${linkColor}20` }}
          >
            <MessageCircle className="w-3 h-3" style={{ color: linkColor }} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 
              className="text-sm font-bold truncate"
              style={{ color: textColor }}
            >
              {lang === "en" ? "Q&A" : "ጥያቄዎች"}
            </h3>
            <p 
              className="text-xs hidden sm:block"
              style={{ color: hintColor }}
            >
              {lang === "en" 
                ? "Ask instructors" 
                : "አስተማሪዎችን ጠይቅ"}
            </p>
          </div>
          <Badge 
            variant="secondary" 
            className="px-1.5 py-0.5 text-xs font-semibold shadow-sm"
            style={{ 
              background: `${linkColor}20`, 
              color: linkColor,
              borderColor: `${linkColor}40`
            }}
          >
            {questions.length}
          </Badge>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="default"
              size="sm"
              className="flex-shrink-0 text-xs px-1 py-0.5 shadow-sm hover:shadow-md transition-all duration-200 rounded-md font-semibold"
              style={{ background: buttonColor, color: buttonTextColor }}
            >
              <Plus className="w-2.5 h-2.5 mr-0.5" />
              <span className="hidden sm:inline">
                {lang === "en" ? "Ask" : "ጠይቅ"}
              </span>
              <span className="sm:hidden">+</span>
            </Button>
          </DialogTrigger>
          <DialogContent 
            className="max-w-xs shadow-xl border-0"
            style={{ background: secondaryBg, color: textColor }}
          >
            <DialogHeader className="space-y-0.5">
              <div className="flex items-center gap-1">
                <div 
                  className="p-0.5 rounded"
                  style={{ background: `${linkColor}20` }}
                >
                  <MessageCircle className="w-3 h-3" style={{ color: linkColor }} />
                </div>
                <DialogTitle 
                  className="text-sm font-bold"
                  style={{ color: textColor }}
                >
                  {lang === "en" ? "Ask Question" : "ጥያቄ ጠይቅ"}
                </DialogTitle>
              </div>
              <p className="text-xs" style={{ color: hintColor }}>
                {lang === "en" 
                  ? "Share your question" 
                  : "ጥያቄዎን ያጋሩ"}
              </p>
            </DialogHeader>
            <div className="space-y-2">
              <Textarea
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder={
                  lang === "en"
                    ? "What would you like to ask?"
                    : "ምን መጠየቅ ይፈልጋሉ?"
                }
                rows={3}
                disabled={submitting}
                className="resize-none border transition-colors duration-200 rounded-md"
                style={{ 
                  background: bgColor, 
                  color: textColor,
                  borderColor: hintColor
                }}
              />
            </div>
            <DialogFooter className="gap-1.5">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
                className="px-3 py-1 border transition-colors duration-200 rounded-md text-xs"
                style={{ 
                  borderColor: hintColor,
                  color: textColor,
                  background: bgColor
                }}
              >
                {lang === "en" ? "Cancel" : "ተወው"}
              </Button>
              <Button
                variant="default"
                onClick={handleSubmitQuestion}
                disabled={!newQuestion.trim() || submitting}
                className="px-3 py-1 shadow-sm hover:shadow-md transition-all duration-200 rounded-md font-semibold text-xs"
                style={{ background: buttonColor, color: buttonTextColor }}
              >
                {submitting ? (
                  <div className="flex items-center gap-1">
                    <div 
                      className="w-2.5 h-2.5 border-2 border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: buttonTextColor }}
                    ></div>
                    <span>
                      {lang === "en" ? "Submitting..." : "በመላክ ላይ..."}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span>
                      {lang === "en" ? "Submit" : "ላክ"}
                    </span>
                    <Send className="w-2.5 h-2.5" />
                  </div>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="space-y-1 flex-1 min-h-[150px]">
          {[1, 2, 3].map((i) => (
            <Card 
              key={i} 
              className="animate-pulse shadow-sm border-0"
              style={{ background: secondaryBg }}
            >
              <CardHeader className="p-1.5">
                <div className="flex items-center gap-1.5">
                  <div 
                    className="w-6 h-6 rounded-full"
                    style={{ background: `${hintColor}40` }}
                  ></div>
                  <div className="space-y-0.5 flex-1">
                    <div 
                      className="h-2.5 rounded w-1/3"
                      style={{ background: `${hintColor}40` }}
                    ></div>
                    <div 
                      className="h-2 rounded w-1/4"
                      style={{ background: `${hintColor}30` }}
                    ></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-1.5 pt-0">
                <div className="space-y-0.5">
                  <div 
                    className="h-2.5 rounded w-full"
                    style={{ background: `${hintColor}40` }}
                  ></div>
                  <div 
                    className="h-2.5 rounded w-3/4"
                    style={{ background: `${hintColor}30` }}
                  ></div>
                  <div 
                    className="h-2.5 rounded w-1/2"
                    style={{ background: `${hintColor}20` }}
                  ></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : questions.length === 0 ? (
        <Card 
          className="flex-1 flex items-center justify-center min-h-[120px] shadow-sm border-0"
          style={{ background: secondaryBg }}
        >
          <CardContent className="text-center py-3 px-3">
            <div 
              className="p-2 rounded-full w-12 h-12 mx-auto mb-2 flex items-center justify-center"
              style={{ background: `${hintColor}20` }}
            >
              <MessageCircle className="w-6 h-6" style={{ color: hintColor }} />
            </div>
            <h4 
              className="text-sm font-semibold mb-1"
              style={{ color: textColor }}
            >
              {lang === "en" ? "No Questions Yet" : "ገና ጥያቄዎች የሉም"}
            </h4>
            <p className="text-xs mb-3 max-w-sm mx-auto" style={{ color: hintColor }}>
              {lang === "en"
                ? "Be the first to ask a question."
                : "የመጀመሪያው ጥያቄ ጠይቂ ይሁኑ።"}
            </p>
            <Button
              onClick={() => setDialogOpen(true)}
              className="shadow-sm hover:shadow-md transition-all duration-200 rounded-md px-3 py-1.5 font-semibold text-xs"
              style={{ background: buttonColor, color: buttonTextColor }}
            >
              <Plus className="w-3 h-3 mr-1" />
              {lang === "en" ? "Ask Question" : "ጥያቄ ጠይቅ"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1 flex-1 min-h-0">
          {questions.map((question) => (
            <Card
              key={question.id}
              className="border-l-2 shadow-sm hover:shadow-md transition-all duration-200 border-0 rounded-md overflow-hidden group"
              style={{ 
                background: secondaryBg,
                borderLeftColor: linkColor
              }}
            >
              <CardHeader className="flex items-start justify-between gap-1.5 p-1.5">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <Avatar 
                    className="flex-shrink-0 w-6 h-6 shadow-sm flex items-center justify-center"
                    style={{ 
                      background: linkColor,
                      color: buttonTextColor,
                      border: `1px solid ${linkColor}33`
                    }}
                  >
                    <User className="w-3 h-3" />
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 mb-0.5">
                      <p 
                        className="font-semibold text-xs truncate"
                        style={{ color: textColor }}
                      >
                        {question.student?.firstName} {question.student?.fatherName}
                      </p>
                      <Badge 
                        variant="secondary" 
                        className="text-xs px-1 py-0.5"
                        style={{ 
                          background: `${linkColor}20`,
                          color: linkColor
                        }}
                      >
                        {lang === "en" ? "Student" : "ተማሪ"}
                      </Badge>
                    </div>
                    <div 
                      className="flex items-center gap-0.5 text-xs"
                      style={{ color: hintColor }}
                    >
                      <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                      <span className="truncate">
                        {formatDistanceToNow(new Date(question.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-1.5 pt-0">
                <div 
                  className="rounded-md p-1.5 ml-6"
                  style={{ background: `${secondaryBg}cc` }}
                >
                  <p 
                    className="text-xs leading-relaxed"
                    style={{ color: textColor }}
                  >
                    {question.question}
                  </p>
                </div>

                {question.responses?.length > 0 ? (
                  <div 
                    className="ml-6 space-y-1 border-l pl-1.5 mt-1.5"
                    style={{ borderColor: `${hintColor}40` }}
                  >
                    {question.responses.map((response) => (
                      <div key={response.id} className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Avatar 
                            className="flex-shrink-0 w-5 h-5 shadow-sm flex items-center justify-center"
                            style={{ 
                              background: "#22c55e",
                              color: "#ffffff",
                              border: "1px solid #22c55e33"
                            }}
                          >
                            <User className="w-2.5 h-2.5" />
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 mb-0.5">
                              <p 
                                className="font-semibold text-xs truncate"
                                style={{ color: textColor }}
                              >
                                {response.instructor?.firstName} {response.instructor?.fatherName}
                              </p>
                              <Badge 
                                variant="default" 
                                className="text-xs px-1 py-0.5"
                                style={{ 
                                  background: "#dcfce7",
                                  color: "#166534"
                                }}
                              >
                                {lang === "en" ? "Instructor" : "አስተማሪ"}
                              </Badge>
                            </div>
                            <p className="text-xs" style={{ color: hintColor }}>
                              {formatDistanceToNow(
                                new Date(response.createdAt),
                                { addSuffix: true }
                              )}
                            </p>
                          </div>
                        </div>
                        <div 
                          className="rounded-md p-1.5 ml-5"
                          style={{ background: "#dcfce740" }}
                        >
                          <p 
                            className="text-xs leading-relaxed"
                            style={{ color: textColor }}
                          >
                            {response.response}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div 
                    className="ml-6 p-1.5 rounded-md mt-1.5 border"
                    style={{ 
                      background: "#fef3c740",
                      borderColor: "#facc1540"
                    }}
                  >
                    <p 
                      className="text-xs flex items-center gap-1"
                      style={{ color: hintColor }}
                    >
                      <Reply className="w-2.5 h-2.5 flex-shrink-0" />
                      <span>
                        {lang === "en"
                          ? "Waiting for instructor response..."
                          : "የአስተማሪ ምላሽ በመጠባበቅ ላይ..."}
                      </span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
