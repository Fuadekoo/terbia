"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { toast } from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getStudents, type AdminStudentRow } from "@/actions/admin/students";

const PAGE_SIZE = 20;

/**
 * Public origin used when building shareable student links. Comes from
 * NEXT_PUBLIC_BASE_URL so copied links always point at the real domain,
 * not whatever host the admin happens to be browsing from.
 */
const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");

export default function StudentList({ lang = "en" }: { lang?: string }) {
  const [rows, setRows] = useState<AdminStudentRow[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Debounce the search box so typing doesn't hammer the server action.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getStudents({ search, status, page, pageSize: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setRows(res.data.rows);
          setTotal(res.data.total);
          setTotalPages(res.data.totalPages);
          setStatuses(res.data.statuses);
        } else {
          toast.error(res.error || "Failed to fetch students");
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to fetch students");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, status, page, refreshKey]);

  const studentHref = (wdt_ID: number) => `/${lang}/student/${wdt_ID}`;

  // Copy the absolute portal URL (e.g. https://terbia.darelkubra.com/en/student/1001)
  // so it can be pasted straight into a chat or browser.
  const handleCopy = async (wdt_ID: number) => {
    const origin = BASE_URL || window.location.origin;
    const url = `${origin}${studentHref(wdt_ID)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(wdt_ID);
      toast.success("Link copied");
      setTimeout(() => setCopiedId((id) => (id === wdt_ID ? null : id)), 1500);
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by ID, name, phone, package…"
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <Users className="size-3.5" />
            {total} student{total === 1 ? "" : "s"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Status filter */}
      {statuses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {["all", ...statuses].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
                status === s
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent/50"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Ustaz</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Portal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No students found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((s) => (
                <TableRow key={s.wdt_ID}>
                  <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                    {s.wdt_ID}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={studentHref(s.wdt_ID)}
                      target="_blank"
                      className="hover:text-primary hover:underline"
                    >
                      {s.name || "—"}
                    </Link>
                    {s.isKid ? (
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        kid
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.phoneno || "—"}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate">
                    {s.activePackageName || s.package || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.ustazname || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        s.status?.toLowerCase() === "active"
                          ? "default"
                          : "secondary"
                      }
                      className="capitalize"
                    >
                      {s.status || "unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(s.wdt_ID)}
                        title="Copy portal link"
                      >
                        {copiedId === s.wdt_ID ? (
                          <>
                            Copied
                            <Check className="size-3.5" />
                          </>
                        ) : (
                          <>
                            Copy
                            <Copy className="size-3.5" />
                          </>
                        )}
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={studentHref(s.wdt_ID)} target="_blank">
                          Open
                          <ExternalLink className="size-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Page {page} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="size-4" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
