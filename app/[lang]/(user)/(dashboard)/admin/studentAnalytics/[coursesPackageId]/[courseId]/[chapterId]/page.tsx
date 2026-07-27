"use client";
import React, { useState } from "react";
import CustomTable from "@/components/custom/admin/custom-table";
import useAction from "@/hooks/useAction";
import { getStudentAnalyticsperchapter } from "@/actions/admin/analysis";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssingingProgressConfirmModal } from "@/components/modals/confirm-modal";
import { updateStartingProgress } from "@/actions/student/progress";
import toast from "react-hot-toast";

function Page() {
  const params = useParams();
  const chapterId = params?.chapterId as string;
  const coursesPackageId = params?.coursesPackageId as string;
  const courseId = params?.courseId as string;
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [progressFilter, setProgressFilter] = useState<
    "notstarted" | "inprogress" | "completed" | ""
  >("");

  const [data,refresh , isLoading] = useAction(
    getStudentAnalyticsperchapter,
    [true, () => {}],
    chapterId as string,
    searchTerm,
    currentPage,
    itemsPerPage,
    progressFilter || undefined // Pass undefined if no filter selected
  );

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "phoneNo", label: "Phone Number" },
    { key: "studentProgress", label: "Student Progress" },
    // { key: "chatid", label: "Telegram Link" },
  ];
  const rows =
    data && "data" in data
      ? data.data.map((row) => ({
          id: String(row.id ?? ""),
          name: row.name ?? "",
          phoneNo: row.phoneNo ?? "",
          studentProgress: row.studentProgress ?? "",
          // chatid: row.chatid ?? "",
        }))
      : [];

  // --- Selection state for this page (parallel to CustomTable) ---
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string | number>>(
    new Set()
  );

  // Handle select all
  // const allSelected =
  //   rows.length > 0 && rows.every((row) => selectedRowIds.has(row.id));
  // const someSelected = rows.some((row) => selectedRowIds.has(row.id));

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      setSelectedRowIds(new Set(rows.map((row) => row.id)));
    } else if (checked === false) {
      setSelectedRowIds(new Set());
    }
  };

  const handleSelectRow = (
    rowId: string | number,
    checked: boolean | "indeterminate"
  ) => {
    if (checked === true) {
      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        next.add(rowId);
        return next;
      });
    } else if (checked === false) {
      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        next.delete(rowId);
        return next;
      });
    }
  };

  return (
    <div className="m-2 overflow-y-auto">
      <Link
        href={`/en/admin/coursesPackages/${coursesPackageId}/${courseId}`}
        className="flex items-center text-sm hover:opacity-75 transition mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Chapters setup
      </Link>
      <h1 className="text-xl font-bold mb-4">Student Analytics Per Chapter</h1>
      {/* Progress Filter */}
      <div className="m-1 ">
        <label className="mr-2 font-medium">
          Assign Selected Students To start their progress from this Chapter:
        </label>
        <AssingingProgressConfirmModal
          onConfirm={async () => {
            try {
              if (selectedRowIds.size > 0) {
                for (const rowId of selectedRowIds) {
                  await updateStartingProgress(
                    Number(rowId),
                    coursesPackageId as string,
                    chapterId as string
                  );
                }
                refresh();// Trigger a refresh
                toast.success("Progress updated successfully");
              }
            } catch {
              toast.error("Something went wrong while updating progress");
            }
          }}
          chapterName={data?.data[0]?.chapterTitle ?? "Chapter"}
        >
          <Button
            type="button"
            disabled={isLoading||selectedRowIds.size === 0}
            className="mb-2"
          >
            Assign
          </Button>
        </AssingingProgressConfirmModal>
        <br />
        <label className="mr-2 font-medium">Filter by Progress:</label>
        <select
          value={progressFilter}
          onChange={(e) => {
            setProgressFilter(
              e.target.value as "notstarted" | "inprogress" | "completed" | ""
            );
            setCurrentPage(1); // Reset page to 1 when filter changes
          }}
          className="border border-gray-300 rounded px-2 py-1"
        >
          <option value="">All</option>
          <option value="notstarted">Not Started</option>
          <option value="inprogress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <div>
        <CustomTable
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
          // Pass selection state and handlers to CustomTable
          selectedRowIds={selectedRowIds}
          onSelectAll={handleSelectAll}
          onSelectRow={handleSelectRow}
        />
      </div>
      {isLoading && <div>Loading...</div>}
    </div>
  );
}

export default Page;
