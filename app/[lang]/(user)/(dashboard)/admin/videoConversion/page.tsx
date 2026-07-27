"use client";

import React from "react";
import {
  Video,
  RefreshCw,
  CheckCircle,
  Clock,
  PlayCircle,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Spinner from "@/components/ui/spinner";
import { StatCard } from "@/components/custom/common/page-shell";
import toast from "react-hot-toast";

interface VideoFile {
  filename: string;
  baseName: string;
  isConverted: boolean;
  hlsDir: string | null;
  manifestPath: string | null;
  jobId?: string;
  status?: "pending" | "queued" | "processing" | "completed" | "failed";
}

interface VideoStats {
  total: number;
  converted: number;
  pending: number;
}

const initialStats: VideoStats = {
  total: 0,
  converted: 0,
  pending: 0,
};

export default function VideoConversionPage() {
  const [videos, setVideos] = React.useState<VideoFile[]>([]);
  const [stats, setStats] = React.useState<VideoStats>(initialStats);
  const [isLoading, setIsLoading] = React.useState(false);
  const [converting, setConverting] = React.useState<string[]>([]);

  const fetchVideos = React.useCallback(
    async (forceRefresh = false) => {
      if (!forceRefresh && isLoading) {
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch("/api/convert-video");
        const data = await response.json();

        if (data.success) {
          setVideos(data.files || []);
          setStats({
            total: data.total || 0,
            converted: data.converted || 0,
            pending: data.pending || 0,
          });
        } else {
          toast.error(data.error || "Failed to fetch videos");
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to fetch videos";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading],
  );

  React.useEffect(() => {
    if (videos.length === 0 && !isLoading) {
      fetchVideos();
    }
  }, [videos.length, isLoading, fetchVideos]);

  React.useEffect(() => {
    const hasActiveConversions = videos.some(
      (video) =>
        video.jobId &&
        (video.status === "pending" ||
          video.status === "queued" ||
          video.status === "processing"),
    );

    if (!hasActiveConversions) {
      return;
    }

    const interval = setInterval(async () => {
      const videosWithJobs = videos.filter(
        (video) =>
          video.jobId &&
          (video.status === "pending" ||
            video.status === "queued" ||
            video.status === "processing"),
      );

      if (videosWithJobs.length === 0) {
        return;
      }

      let needsRefresh = false;

      await Promise.all(
        videosWithJobs.map(async (video) => {
          if (!video.jobId) return;

          try {
            const response = await fetch(
              `/api/convert-video/status?jobId=${video.jobId}`,
            );
            const data = await response.json();

            if (data.success && data.job) {
              const jobStatus = data.job.status;

              if (jobStatus === "completed") {
                setVideos((prev) =>
                  prev.map((item) =>
                    item.filename === video.filename
                      ? { ...item, status: "completed", isConverted: true }
                      : item,
                  ),
                );
                needsRefresh = true;
              } else if (jobStatus === "failed") {
                setVideos((prev) =>
                  prev.map((item) =>
                    item.filename === video.filename
                      ? { ...item, status: "failed" }
                      : item,
                  ),
                );
                needsRefresh = true;
              } else if (jobStatus === "processing") {
                setVideos((prev) =>
                  prev.map((item) =>
                    item.filename === video.filename
                      ? { ...item, status: "processing" }
                      : item,
                  ),
                );
              } else if (jobStatus === "pending") {
                setVideos((prev) =>
                  prev.map((item) =>
                    item.filename === video.filename
                      ? { ...item, status: "pending" }
                      : item,
                  ),
                );
              }
            }
          } catch (error) {
            console.error(
              `Error checking status for ${video.filename}:`,
              error,
            );
          }
        }),
      );

      if (needsRefresh) {
        fetchVideos(true);
      }
    }, 5000);

    const fullRefreshInterval = setInterval(() => {
      fetchVideos(true);
    }, 10000);

    return () => {
      clearInterval(interval);
      clearInterval(fullRefreshInterval);
    };
  }, [videos, fetchVideos]);

  const handleConvert = async (filename: string) => {
    try {
      setConverting((prev) => [
        ...prev.filter((name) => name !== filename),
        filename,
      ]);

      const response = await fetch("/api/convert-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Conversion queued successfully");
        setVideos((prev) =>
          prev.map((video) =>
            video.filename === filename
              ? { ...video, jobId: data.jobId, status: "queued" }
              : video,
          ),
        );
        setTimeout(() => {
          fetchVideos(true);
        }, 2000);
      } else {
        toast.error(data.error || "Failed to queue conversion");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to queue conversion";
      toast.error(message);
    } finally {
      setConverting((prev) => prev.filter((name) => name !== filename));
    }
  };

  const handleConvertAll = async () => {
    try {
      setConverting((prev) => [
        ...prev.filter((name) => name !== "__ALL__"),
        "__ALL__",
      ]);

      const response = await fetch("/api/convert-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ convertAll: true }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          `Queued ${data.jobs?.length || 0} file(s) for conversion`,
        );

        if (Array.isArray(data.jobs)) {
          setVideos((prev) =>
            prev.map((video) => {
              const job = data.jobs.find(
                (item: { filename: string }) =>
                  item.filename === video.filename,
              );
              if (job?.jobId && !job.status?.includes("error")) {
                return { ...video, jobId: job.jobId, status: "queued" };
              }
              return video;
            }),
          );
        }

        setTimeout(() => {
          fetchVideos(true);
        }, 2000);
      } else {
        toast.error(data.error || "Failed to queue conversions");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to queue conversions";
      toast.error(message);
    } finally {
      setConverting((prev) => prev.filter((name) => name !== "__ALL__"));
    }
  };

  const pendingVideos = videos.filter((video) => !video.isConverted);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="surface-glass sticky top-0 z-30 shrink-0 shadow-xs">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Video Conversion
            </h1>
            <p className="text-sm text-muted-foreground">
              Convert MP4 videos to HLS for better streaming performance
            </p>
          </div>
          {pendingVideos.length > 0 && (
            <Button
              onClick={handleConvertAll}
              disabled={converting.includes("__ALL__")}
            >
              {converting.includes("__ALL__") ? (
                <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Video className="size-4" />
              )}
              Convert all ({pendingVideos.length})
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
          <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
            <StatCard
              label="Total Videos"
              value={stats.total}
              icon={Video}
              tone="primary"
            />
            <StatCard
              label="Converted"
              value={stats.converted}
              icon={CheckCircle}
              tone="success"
            />
            <StatCard
              label="Pending"
              value={stats.pending}
              icon={Clock}
              tone="warning"
            />
          </div>

          <div className="flex items-center justify-between">
            <Card className="w-full">
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Video Files</CardTitle>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => fetchVideos(true)}
                  disabled={isLoading}
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Spinner />
                ) : videos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <Video className="size-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      No MP4 videos found.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Filename</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {videos.map((video) => (
                        <TableRow key={video.filename}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Video className="size-4 text-muted-foreground" />
                              <span className="font-mono text-sm">
                                {video.filename}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {video.isConverted ||
                            video.status === "completed" ? (
                              <Badge variant="success">Converted</Badge>
                            ) : video.status === "processing" ? (
                              <Badge variant="info">
                                <span className="size-2 animate-pulse rounded-full bg-current" />
                                Processing
                              </Badge>
                            ) : video.status === "queued" ? (
                              <Badge variant="muted">Queued</Badge>
                            ) : video.status === "failed" ? (
                              <Badge variant="destructive">Failed</Badge>
                            ) : (
                              <Badge variant="warning">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {video.isConverted ||
                            video.status === "completed" ? (
                              <Badge variant="success">
                                <CheckCircle className="size-3" />
                                Ready
                              </Badge>
                            ) : video.status === "processing" ||
                              video.status === "queued" ? (
                              <Badge variant="muted">In progress</Badge>
                            ) : video.status === "failed" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleConvert(video.filename)}
                                disabled={converting.includes(video.filename)}
                              >
                                {converting.includes(video.filename) ? (
                                  <div className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                ) : (
                                  <AlertTriangle className="size-3" />
                                )}
                                Retry
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="gap-2"
                                onClick={() => handleConvert(video.filename)}
                                disabled={converting.includes(video.filename)}
                              >
                                {converting.includes(video.filename) ? (
                                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                  <PlayCircle className="h-3 w-3" />
                                )}
                                Convert
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
