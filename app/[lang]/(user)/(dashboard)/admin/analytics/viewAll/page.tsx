"use client";
import React, { useState } from "react";
import {
  getStudentAnalyticsperPackage,
  getAvailablePackagesForStudent,
} from "@/actions/admin/analysis";
import useAction from "@/hooks/useAction";
import Link from "next/link";
import { ArrowLeft, Filter, BookOpen, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import CustomViewAllTable from "@/components/custom/admin/custom-view-all-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function Page() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [progressFilter, setProgressFilter] = useState<
    "notstarted" | "inprogress" | "completed" | ""
  >("");
  const [statusFilter, setStatusFilter] = useState<
    "notstarted" | "inprogress" | "failed" | "passed" | ""
  >("");
  const [lastSeenFilter, setLastSeenFilter] = useState<
    "today" | "1day" | "2days" | "3days" | "3plus" | ""
  >("");
  const [tefsirFilter, setTefsirFilter] = useState<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null
  );
  const [selectedStudentName, setSelectedStudentName] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [availablePackages, setAvailablePackages] = useState<any[]>([]);
  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);
  const [data, , isLoading] = useAction(
    getStudentAnalyticsperPackage,
    [true, () => {}],
    searchTerm,
    currentPage,
    itemsPerPage,
    progressFilter || undefined, // Pass undefined if no filter selected
    statusFilter || undefined, // Pass undefined if no filter selected
    lastSeenFilter || undefined, // Pass undefined if no filter selected
    tefsirFilter // Pass tefsir filter
  );

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "isKid", label: "Is Kid" },
    { key: "phoneNo", label: "Phone Number" },
    { key: "tglink", label: "Tg" },
    { key: "whatsapplink", label: "Wa" },
    { key: "ustazname", label: "Ustaz Name" },
    { key: "activePackage", label: "activePackage" },
    { key: "studentProgress", label: "Student Progress" },
    { key: "lastseen", label: "Last Seen " },
    { key: "finalExamStatus", label: "Final Exam Status" },
    { key: "result", label: "Result" },
    { key: "attendances", label: "Attendances" },
  ];

  const handleActivePackageClick = async (studentId: string) => {
    const id = parseInt(studentId);
    const studentName = rows.find((row) => row.id === studentId)?.name || "";
    setSelectedStudentId(id);
    setSelectedStudentName(studentName);
    try {
      const packages = await getAvailablePackagesForStudent(id);
      setAvailablePackages(packages);
      setIsPackageDialogOpen(true);
    } catch (error) {
      console.error("Error fetching packages:", error);
    }
  };

  const rows =
    data && "data" in data
      ? data.data.map((row) => ({
          id: String(row?.id ?? ""),
          name: row?.name ?? "",
          isKid: row?.isKid ? "Yes" : "No",
          phoneNo: row?.phoneNo ?? "-",
          tglink: row?.tglink ?? "-",
          whatsapplink: row?.whatsapplink ?? "-",
          activePackage: row?.activePackage ?? "",
          studentProgress: row?.studentProgress ?? "",
          lastseen: row?.lastseen ?? "",
          ustazname: row?.ustazname ?? "",
          finalExamStatus: row?.hasFinalExam
            ? row.isUpdateProhibited
              ? row.result?.score >= 0.75
                ? "Passed"
                : "Failed"
              : "In Progress"
            : "Not Started",
          result: row?.hasFinalExam
            ? row.result &&
              `${row.result.score * 100}% አግኝተዋል -> ${row.result.correct}/${
                row.result.total
              } በመመለስ`
            : "-",
          attendances: row?.attendances ?? "",
        }))
      : [];
  console.log("rows", rows);
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Sticky Header */}
      <div className="surface-glass sticky top-0 z-30 shrink-0 shadow-xs">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link
            href="/en/admin/analytics"
            className="focus-ring group inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium shadow-xs transition-colors hover:bg-accent"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">Back to Analytics</span>
            <span className="sm:hidden">Back</span>
          </Link>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl lg:text-2xl">
              <span className="hidden sm:inline">Student Analytics</span>
              <span className="sm:hidden">Analytics</span>
            </h1>
            {tefsirFilter && (
              <Badge variant="info">
                <BookOpen className="size-3" />
                <span className="hidden sm:inline">Tefsir</span>
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2.5 text-lg">
                <span className="grid size-9 place-items-center rounded-lg bg-primary/12 text-primary">
                  <Filter className="size-4.5" />
                </span>
                Advanced Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                 {/* Progress Filter */}
                 <div className="space-y-3">
                   <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                     📈 Progress Status
                   </label>
                   <select
                     value={progressFilter}
                     onChange={(e) => {
                       setProgressFilter(
                         e.target.value as
                           | "notstarted"
                           | "inprogress"
                           | "completed"
                           | ""
                       );
                       setCurrentPage(1);
                     }}
                     className="focus-ring w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm shadow-xs transition-colors hover:border-ring/45"
                   >
                    <option value="">All Students</option>
                    <option value="notstarted">Not Started</option>
                    <option value="inprogress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                 {/* Final Exam Status Filter */}
                 <div className="space-y-3">
                   <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                     🎯 Exam Status
                   </label>
                   <select
                     value={statusFilter}
                     onChange={(e) => {
                       setStatusFilter(
                         e.target.value as
                           | "notstarted"
                           | "inprogress"
                           | "failed"
                           | "passed"
                           | ""
                       );
                       setCurrentPage(1);
                     }}
                     className="focus-ring w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm shadow-xs transition-colors hover:border-ring/45"
                   >
                    <option value="">All Exams</option>
                    <option value="notstarted">Not Started</option>
                    <option value="inprogress">In Progress</option>
                    <option value="failed">Failed</option>
                    <option value="passed">Passed</option>
                  </select>
                </div>

                 {/* Last Seen Filter */}
                 <div className="space-y-3">
                   <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                     ⏰ Last Active
                   </label>
                   <select
                     value={lastSeenFilter}
                     onChange={(e) => {
                       setLastSeenFilter(
                         e.target.value as
                           | "today"
                           | "1day"
                           | "2days"
                           | "3days"
                           | "3plus"
                           | ""
                       );
                       setCurrentPage(1);
                     }}
                     className="focus-ring w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm shadow-xs transition-colors hover:border-ring/45"
                   >
                    <option value="">All Time</option>
                    <option value="today">Today</option>
                    <option value="1day">1 day ago</option>
                    <option value="2days">2 days ago</option>
                    <option value="3days">3 days ago</option>
                    <option value="3plus">3+ days ago</option>
                  </select>
                </div>

                 {/* Tefsir Filter */}
                 <div className="space-y-3">
                   <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                     <BookOpen className="h-4 w-4" />
                     Tefsir Filter
                   </label>
                   <div className="relative">
                     <select
                       value={tefsirFilter ? "tefsir_only" : ""}
                       onChange={(e) => {
                         setTefsirFilter(e.target.value === "tefsir_only");
                         setCurrentPage(1);
                       }}
                       className="focus-ring w-full appearance-none rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm shadow-xs transition-colors hover:border-ring/45"
                     >
                      <option value="">All Students (Default)</option>
                      <option value="tefsir_only">
                        Tefsir: {'"'}On Progress{'"'} Students Only
                      </option>
                    </select>
                  </div>
                </div>

                 {/* Filter Actions */}
                 <div className="space-y-3 flex flex-col justify-end">
                   <Button
                     onClick={() => {
                       setProgressFilter("");
                       setStatusFilter("");
                       setLastSeenFilter("");
                       setTefsirFilter(false);
                       setCurrentPage(1);
                     }}
                     variant="outline"
                     className="w-full"
                     size="lg"
                   >
                     Clear all filters
                   </Button>
                 </div>
              </div>

               {/* Active Filter Summary */}
               {(progressFilter ||
                 statusFilter ||
                 lastSeenFilter ||
                 tefsirFilter) && (
                 <div className="mt-5 border-t border-border pt-5">
                   <div className="flex flex-wrap items-center gap-2">
                     <span className="text-sm font-medium text-muted-foreground">
                       Active filters:
                     </span>
                     {progressFilter && (
                       <Badge variant="info">Progress: {progressFilter}</Badge>
                     )}
                     {statusFilter && (
                       <Badge variant="success">Exam: {statusFilter}</Badge>
                     )}
                     {lastSeenFilter && (
                       <Badge variant="warning">
                         Last seen: {lastSeenFilter}
                       </Badge>
                     )}
                     {tefsirFilter && (
                       <Badge variant="secondary">
                         <BookOpen className="size-3" />
                         Tefsir: On Progress only
                       </Badge>
                     )}
                   </div>
                 </div>
               )}
             </CardContent>
           </Card>

         {/* Results Section */}
         <div className="mt-6 space-y-5">
           {/* Results Header */}
           <div className="surface p-4 sm:p-5">
             <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
               <div className="flex flex-wrap items-center gap-3">
                 <h2 className="text-xl font-bold tracking-tight">
                   Student Results
                 </h2>
                 {tefsirFilter && (
                   <Badge variant="info">
                     <BookOpen className="size-3" />
                     Tefsir: On Progress only
                   </Badge>
                 )}
               </div>
               <div className="rounded-lg bg-muted px-3 py-1.5 text-sm text-muted-foreground">
                 Showing {(currentPage - 1) * itemsPerPage + 1}-
                 {Math.min(
                   currentPage * itemsPerPage,
                   data?.pagination?.totalRecords ?? 0
                 )}{" "}
                 of {data?.pagination?.totalRecords ?? 0} students
               </div>
             </div>
           </div>

           {/* Table */}
           <Card className="shadow-lg border-0">
             <CardContent className="p-6">
               <CustomViewAllTable
                 columns={columns}
                 rows={rows}
                 totalRows={data?.pagination?.totalRecords ?? rows.length}
                 page={currentPage}
                 pageSize={itemsPerPage}
                 onPageChange={setCurrentPage}
                 onPageSizeChange={setItemsPerPage}
                 searchValue={searchTerm}
                 onSearch={setSearchTerm}
                 isLoading={isLoading}
                 onActivePackageClick={handleActivePackageClick}
               />
             </CardContent>
           </Card>
         </div>

          <Dialog
            open={isPackageDialogOpen}
            onOpenChange={setIsPackageDialogOpen}
          >
            <DialogContent className="w-[95vw] max-w-lg sm:max-w-2xl lg:max-w-4xl h-[85vh] sm:h-[80vh] p-6">
              <DialogHeader className="mb-5">
                <DialogTitle className="text-xl font-bold tracking-tight">
                  Package details — {selectedStudentName}
                </DialogTitle>
              </DialogHeader>
              <div className="max-h-[70vh] space-y-3 overflow-y-auto">
              {availablePackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={cn(
                    "rounded-xl border p-4 shadow-xs transition-colors",
                    pkg.isActive
                      ? "border-primary/40 bg-primary/6"
                      : "border-border bg-card"
                  )}
                >
                  <div className="space-y-3.5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <h3 className="text-base font-semibold">{pkg.name}</h3>
                      {pkg.isActive && <Badge>Active package</Badge>}
                    </div>

                    {pkg.status === "inprogress" && pkg.progressDetails && (
                      <div className="rounded-lg bg-muted p-2.5 text-xs sm:text-sm">
                        <div className="mb-0.5 font-medium">Current</div>
                        <div className="break-words text-muted-foreground">
                          {pkg.progressDetails}
                        </div>
                      </div>
                    )}

                    {(pkg.status === "inprogress" ||
                      pkg.status === "completed") && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-muted-foreground">
                            {pkg.completedChapters}/{pkg.totalChapters} chapters
                          </span>
                          <span className="font-semibold tabular-nums">
                            {pkg.progressPercentage}%
                          </span>
                        </div>
                        <div
                          className="h-2 overflow-hidden rounded-full bg-muted"
                          role="progressbar"
                          aria-valuenow={pkg.progressPercentage}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${pkg.name} progress`}
                        >
                          <div
                            className={cn(
                              "h-full rounded-full transition-[width] duration-500 ease-out-soft",
                              pkg.status === "completed"
                                ? "bg-success"
                                : pkg.isActive
                                ? "bg-primary"
                                : "bg-muted-foreground/50"
                            )}
                            style={{ width: `${pkg.progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <Badge
                      variant={
                        pkg.status === "completed"
                          ? "success"
                          : pkg.status === "inprogress"
                          ? pkg.isActive
                            ? "info"
                            : "warning"
                          : "muted"
                      }
                    >
                      {pkg.status === "completed"
                        ? "Done"
                        : pkg.status === "inprogress"
                        ? "In progress"
                        : "Pending"}
                    </Badge>
                  </div>
                </div>
              ))}
              {availablePackages.length === 0 && (
                <div className="py-10 text-center">
                  <Package className="mx-auto mb-3 size-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    No packages available
                  </p>
                </div>
              )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

export default Page;
