"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  MessageCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Send,
  LogOut,
  User,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { StatCard } from "@/components/custom/common/page-shell";
import { cn } from "@/lib/utils";
import {
  getCurrentUstaz,
  logout,
} from "@/actions/ustazResponder/authentication";
import {
  getUstazCoursePackages,
  getUstazQuestions,
  submitUstazResponse,
  updateUstazResponse,
  deleteUstazResponse,
} from "@/actions/ustazResponder/questions";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface Question {
  id: string;
  question: string;
  studentName: string;
  courseName: string;
  timestamp: number | null;
  type: string;
  createdAt: string;
  hasResponse: boolean;
  response?: string | null;
  responseId?: string | null;
}

interface UstazData {
  ustazname: string;
  [key: string]: unknown;
}

interface CoursePackage {
  id: string;
  name: string;
  description: string | null;
  _count: {
    qandAQuestion: number;
  };
}

export default function UstazDashboard() {
  const [ustazData, setUstazData] = useState<UstazData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [coursePackages, setCoursePackages] = useState<CoursePackage[]>([]);
  const [selectedCoursePackage, setSelectedCoursePackage] = useState<string>("all");
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(
    null
  );
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [hasError, setHasError] = useState(false);
  const router = useRouter();

  const fetchData = async (showToast = true) => {
    try {
      setIsLoading(true);
      
      // Show loading toast for better UX
      if (showToast && retryCount === 0) {
        toast.loading("Loading dashboard data...", { id: "fetch-data" });
      }

      const [ustazResult, coursePackagesResult, questionsResult] = await Promise.all([
        getCurrentUstaz(),
        getUstazCoursePackages(),
        getUstazQuestions(selectedCoursePackage),
      ]);

      // Handle ustaz authentication
      if (ustazResult.success) {
        setUstazData(ustazResult.data);
      } else {
        toast.dismiss("fetch-data");
        toast.error(ustazResult.message);
        if (ustazResult.message === "Not authenticated" || ustazResult.message === "Account suspended") {
          await logout();
          router.push("/en/login");
          return;
        }
        throw new Error(ustazResult.message);
      }

      // Handle course packages
      if (coursePackagesResult.success && coursePackagesResult.data) {
        setCoursePackages(coursePackagesResult.data);
      } else {
        console.warn("Failed to load course packages:", coursePackagesResult.error);
        if (showToast) {
          toast.error(coursePackagesResult.error || "Failed to load course packages");
        }
      }

      // Handle questions
      if (questionsResult.success && questionsResult.data) {
        setQuestions(questionsResult.data);
        setRetryCount(0); // Reset retry count on success
        setLastFetchTime(new Date());
        setHasError(false);
        
        if (showToast) {
          toast.dismiss("fetch-data");
          toast.success("Dashboard loaded successfully");
        }
      } else {
        throw new Error(questionsResult.error || "Failed to load questions");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      
      if (showToast) {
        toast.dismiss("fetch-data");
        
        if (retryCount < 2) {
          setRetryCount(prev => prev + 1);
          toast.error(`Failed to load data. Retrying... (${retryCount + 1}/3)`);
          
          // Retry after a delay
          setTimeout(() => {
            fetchData(false);
          }, 2000);
        } else {
          setHasError(true);
          toast.error("Failed to load data after multiple attempts. Please refresh the page.");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCoursePackageChange = async (coursePackageId: string) => {
    setSelectedCoursePackage(coursePackageId);
    setIsLoading(true);
    
    try {
      toast.loading("Loading questions...", { id: "filter-questions" });
      
      const result = await getUstazQuestions(coursePackageId);
      
      if (result.success && result.data) {
        setQuestions(result.data);
        toast.dismiss("filter-questions");
        
        const packageName = coursePackageId === "all" 
          ? "All Course Packages" 
          : coursePackages.find(pkg => pkg.id === coursePackageId)?.name || "Selected Package";
        
        toast.success(`Loaded ${result.data.length} questions from ${packageName}`);
      } else {
        toast.dismiss("filter-questions");
        toast.error(result.error || "Failed to load questions");
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.dismiss("filter-questions");
      toast.error("Failed to load questions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!selectedQuestion || !response.trim()) {
      toast.error("Please enter a response");
      return;
    }

    setIsSubmitting(true);
    const action = isEditing ? "updating" : "submitting";
    
    try {
      toast.loading(`${action.charAt(0).toUpperCase() + action.slice(1)} response...`, { 
        id: "submit-response" 
      });
      
      let result;
      if (isEditing && selectedQuestion.responseId) {
        result = await updateUstazResponse(selectedQuestion.responseId, response.trim());
      } else {
        result = await submitUstazResponse(selectedQuestion.id, response.trim());
      }

      if (result.success) {
        toast.dismiss("submit-response");
        toast.success(
          isEditing
            ? "Response updated successfully!"
            : "Response submitted successfully!"
        );
        setResponse("");
        setSelectedQuestion(null);
        setIsEditing(false);
        
        // Refresh data without showing toast
        await fetchData(false);
      } else {
        toast.dismiss("submit-response");
        toast.error(result.error || "Failed to submit response");
      }
    } catch (error) {
      console.error("Error submitting response:", error);
      toast.dismiss("submit-response");
      toast.error("Failed to submit response. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditResponse = (question: Question) => {
    setSelectedQuestion(question);
    setResponse(question.response || "");
    setIsEditing(true);
  };

  const handleDeleteResponse = async (responseId: string) => {
    if (!confirm("Are you sure you want to delete this response? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      toast.loading("Deleting response...", { id: "delete-response" });
      
      const result = await deleteUstazResponse(responseId);

      if (result.success) {
        toast.dismiss("delete-response");
        toast.success("Response deleted successfully!");
        
        // Refresh data without showing toast
        await fetchData(false);
      } else {
        toast.dismiss("delete-response");
        toast.error(result.error || "Failed to delete response");
      }
    } catch (error) {
      console.error("Error deleting response:", error);
      toast.dismiss("delete-response");
      toast.error("Failed to delete response. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectQuestion = (question: Question) => {
    setSelectedQuestion(question);
    setResponse("");
    setIsEditing(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      router.push("/en/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading && retryCount === 0) {
    return (
      <div className="app-canvas flex min-h-dvh items-center justify-center px-4">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-5 size-10 animate-spin text-primary" />
          <h3 className="mb-1 text-lg font-semibold">Loading dashboard</h3>
          <p className="text-sm text-muted-foreground">
            Fetching your questions and responses…
          </p>
        </div>
      </div>
    );
  }

  if (hasError && !isLoading) {
    return (
      <div className="app-canvas flex min-h-dvh items-center justify-center px-4">
        <div className="surface mx-auto max-w-md p-7 text-center shadow-lg">
          <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-7 text-destructive-tint-fg" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">
            Failed to load dashboard
          </h3>
          <p className="mb-6 text-sm text-muted-foreground">
            We hit an error loading your dashboard. This might be a network or
            server issue.
          </p>
          <div className="flex flex-col justify-center gap-2.5 sm:flex-row">
            <Button
              onClick={() => {
                setHasError(false);
                setRetryCount(0);
                fetchData();
              }}
            >
              <RefreshCw className="size-4" />
              Try again
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline">
              Refresh page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const unansweredQuestions = questions.filter((q) => !q.hasResponse);
  const answeredQuestions = questions.filter((q) => q.hasResponse);
  
  const selectedPackageName = selectedCoursePackage === "all" 
    ? "All Course Packages" 
    : coursePackages.find(pkg => pkg.id === selectedCoursePackage)?.name || "Unknown Package";

  const packageChip = (courseName: string) => (
    <Badge
      variant="info"
      className="cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        const packageId = coursePackages.find(
          (pkg) => pkg.name === courseName
        )?.id;
        if (packageId) handleCoursePackageChange(packageId);
      }}
    >
      {courseName}
    </Badge>
  );

  const questionMeta = (question: Question) => (
    <div className="space-y-1.5 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">{packageChip(question.courseName)}</div>
      <p>Student: {question.studentName}</p>
      <p>Asked: {new Date(question.createdAt).toLocaleDateString()}</p>
    </div>
  );

  return (
    <div className="app-canvas flex h-dvh flex-col overflow-hidden">
      {/* Header */}
      <div className="surface-glass shrink-0 shadow-xs">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
              <User className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                Welcome, {ustazData?.ustazname || "Ustaz"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage student questions and responses
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              onClick={() => fetchData()}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={isLoading ? "size-4 animate-spin" : "size-4"} />
              Refresh
            </Button>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="size-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 pb-20 sm:px-6 lg:px-8">
          {/* Stats */}
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="min-w-0 truncate text-base font-semibold">
              Questions for: {selectedPackageName}
            </h2>
            {lastFetchTime && (
              <p className="shrink-0 text-xs text-muted-foreground">
                Updated {lastFetchTime.toLocaleTimeString()}
              </p>
            )}
          </div>

          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <StatCard
              label="Total Questions"
              value={questions.length}
              icon={MessageCircle}
              tone="primary"
            />
            <StatCard
              label="Pending"
              value={unansweredQuestions.length}
              icon={Clock}
              tone="warning"
            />
            <StatCard
              label="Answered"
              value={answeredQuestions.length}
              icon={CheckCircle}
              tone="success"
            />
          </div>

          {/* Filter */}
          <Card className="mb-6 gap-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                Filter by course package
                {selectedCoursePackage !== "all" && (
                  <Badge variant="info">Filtered</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <select
                  value={selectedCoursePackage}
                  onChange={(e) => handleCoursePackageChange(e.target.value)}
                  className="focus-ring w-full appearance-none rounded-lg border border-input bg-card px-3.5 py-2.5 pr-10 text-sm text-foreground transition-colors hover:border-ring/45 disabled:opacity-60"
                  disabled={isLoading}
                >
                  <option value="all">
                    All course packages ({questions.length} questions)
                  </option>
                  {coursePackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg._count.qandAQuestion} questions)
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              {selectedCoursePackage !== "all" && (
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm text-muted-foreground">
                    Showing:{" "}
                    <span className="font-medium text-foreground">
                      {selectedPackageName}
                    </span>
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCoursePackageChange("all")}
                  >
                    Show all
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Question columns */}
          <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-2">
            {/* Pending */}
            <Card className="gap-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="size-4.5 text-warning-tint-fg" />
                  Pending ({unansweredQuestions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-96 space-y-2.5 overflow-y-auto">
                {unansweredQuestions.length === 0 ? (
                  <div className="py-10 text-center">
                    <Clock className="mx-auto mb-3 size-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      No pending questions
                      {selectedCoursePackage === "all"
                        ? ""
                        : ` in ${selectedPackageName}`}
                    </p>
                  </div>
                ) : (
                  unansweredQuestions.map((question) => (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => handleSelectQuestion(question)}
                      className={cn(
                        "focus-ring w-full rounded-lg border p-3.5 text-left transition-all duration-200 ease-out-soft sm:p-4",
                        selectedQuestion?.id === question.id
                          ? "border-primary bg-primary/8 shadow-xs"
                          : "border-border hover:border-primary/35 hover:bg-accent/50"
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-medium">
                            {question.question}
                          </h4>
                          <Badge variant="warning" className="shrink-0">
                            Pending
                          </Badge>
                        </div>
                        {questionMeta(question)}
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Answered */}
            <Card className="gap-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle className="size-4.5 text-success-tint-fg" />
                  Answered ({answeredQuestions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-96 space-y-2.5 overflow-y-auto">
                {answeredQuestions.length === 0 ? (
                  <div className="py-10 text-center">
                    <CheckCircle className="mx-auto mb-3 size-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      No answered questions
                      {selectedCoursePackage === "all"
                        ? ""
                        : ` in ${selectedPackageName}`}
                    </p>
                  </div>
                ) : (
                  answeredQuestions.map((question) => (
                    <div
                      key={question.id}
                      className="rounded-lg border border-border p-3.5 transition-colors hover:bg-accent/40 sm:p-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-medium">
                            {question.question}
                          </h4>
                          <Badge variant="success" className="shrink-0">
                            Answered
                          </Badge>
                        </div>
                        {questionMeta(question)}
                        {question.response && (
                          <div className="rounded-md border border-success/20 bg-success/8 p-2.5 text-xs">
                            <p className="font-medium text-success-tint-fg">
                              Your response
                            </p>
                            <p className="mt-1 text-foreground/80">
                              {question.response}
                            </p>
                          </div>
                        )}
                        <div className="flex gap-2 pt-0.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditResponse(question)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              question.responseId &&
                              handleDeleteResponse(question.responseId)
                            }
                            disabled={isDeleting}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Dialog
            open={!!selectedQuestion}
            onOpenChange={() => {
              setSelectedQuestion(null);
              setResponse("");
              setIsEditing(false);
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {isEditing ? "Edit response" : "Respond to question"}
                </DialogTitle>
                <p className="text-sm font-medium text-foreground">
                  {selectedQuestion?.question}
                </p>
                <p className="text-xs text-muted-foreground">
                  Student: {selectedQuestion?.studentName} · Course:{" "}
                  {selectedQuestion?.courseName}
                </p>
              </DialogHeader>
              <Textarea
                placeholder="Type your response here…"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                className="min-h-30"
              />
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedQuestion(null);
                    setResponse("");
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitResponse}
                  disabled={isSubmitting || !response.trim()}
                >
                  {isSubmitting ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  {isEditing ? "Update" : "Submit"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
