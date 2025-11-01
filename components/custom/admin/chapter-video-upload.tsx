"use client";

import { useState } from "react";
import { Video, Save, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import VideoUploadButton from "@/components/VideoUploadButton";
import Player from "@/components/stream/Player";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { updateChapterVideo } from "@/actions/admin/chapter-video";

interface ChapterVideoUploadProps {
  coursesPackageId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData: any;
  courseId: string;
  chapterId: string;
}

export function ChapterVideoUpload({
  coursesPackageId,
  initialData,
  courseId,
  chapterId,
}: ChapterVideoUploadProps) {
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isUploadComplete, setIsUploadComplete] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const router = useRouter();

  const handleVideoSelect = (file: File) => {
    if (isUploading) return;

    setSelectedVideo(file);
    setIsSaved(false);
    setIsUploadComplete(false);
    setIsUploading(true);
    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || "mp4";
    setUploadedVideoUrl(
      `${timestamp}-${Math.floor(Math.random() * 100000)}.${ext}`
    );
  };

  const handleUploadComplete = (filename?: string) => {
    setIsUploadComplete(true);
    setIsUploading(false);
    if (filename) {
      setUploadedVideoUrl(filename);
    }
  };

  const handleVideoRemove = () => {
    setSelectedVideo(null);
    setUploadedVideoUrl(null);
    setIsSaved(false);
    setIsUploadComplete(false);
    setIsUploading(false);
  };

  const handleDeleteClick = () => {
    if (!initialData.customVideo) {
      toast.error("No custom video to delete");
      return;
    }
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      console.log("Deleting video:", { chapterId });
      
      const result = await updateChapterVideo(chapterId, null);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to delete video");
      }

      console.log("Delete result:", result);

      initialData.customVideo = null;
      setPlayerKey((prev) => prev + 1);

      toast.success("Custom video deleted successfully!");
      router.refresh();
    } catch (error) {
      console.error("Error deleting video:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete video";
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
  };

  const handleSaveVideo = async () => {
    if (!uploadedVideoUrl) {
      toast.error("No video to save");
      return;
    }

    setIsSaving(true);
    try {
      console.log("Saving video:", { chapterId, uploadedVideoUrl });
      
      const result = await updateChapterVideo(chapterId, uploadedVideoUrl);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to save video");
      }

      console.log("Save result:", result);

      if (result.chapter && result.chapter.customVideo) {
        initialData.customVideo = result.chapter.customVideo;
      }

      setSelectedVideo(null);
      setUploadedVideoUrl(null);
      setIsSaved(true);
      setIsUploadComplete(false);
      setPlayerKey((prev) => prev + 1);

      toast.success("Video saved successfully!");
      router.refresh();
    } catch (error) {
      console.error("Error saving video:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save video";
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const getVideoSrc = () => {
    if (selectedVideo) {
      return URL.createObjectURL(selectedVideo);
    } else {
      const videoUrl = initialData.customVideo;
      if (!videoUrl) return null;
      // If it's already a filename (no path), use it directly
      if (!videoUrl.includes('/')) {
        return `/api/videos/${videoUrl}`;
      }
      // If it's a full path, extract the filename
      const filename = videoUrl.replace(/^\/?(api\/videos\/)?/, "");
      return `/api/videos/${filename}`;
    }
  };

  const getVideoType = () => {
    if (selectedVideo) return "url";

    const videoUrl = initialData.customVideo;
    if (videoUrl) {
      if (videoUrl.startsWith("http")) return "url";
      return "direct";
    }

    const fallbackUrl = initialData.videoUrl;
    if (fallbackUrl) {
      if (fallbackUrl.startsWith("http")) return "url";
      return "direct";
    }

    return "local";
  };

  const videoSrc = getVideoSrc();
  const videoType = getVideoType();
  const hasExistingVideo = initialData.customVideo || initialData.videoUrl;
  const hasCustomVideo = initialData.customVideo;
  const shouldShowPlayer = selectedVideo || hasCustomVideo;
  const hasUnsavedVideo =
    selectedVideo && uploadedVideoUrl && !isSaved && isUploadComplete;

  return (
    <div className="space-y-4">
      <div className="mt-4">
        {videoSrc && shouldShowPlayer ? (
          <div className="relative">
            <Player
              key={`player-${playerKey}-${
                hasCustomVideo ? "custom" : "default"
              }`}
              src={videoSrc}
              type={videoType}
              title={`Chapter video player - ${
                initialData.customVideo ? "Custom Video" : "Database Video"
              }`}
            />
            {hasUnsavedVideo && (
              <div className="absolute top-2 right-2">
                <div className="bg-amber-100 text-amber-800 px-2 py-1 rounded-md text-xs font-medium">
                  Unsaved changes
                </div>
              </div>
            )}
            {hasExistingVideo && !selectedVideo && (
              <div className="absolute top-2 left-2">
                <div className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs font-medium">
                  {initialData.customVideo ? "Custom Video" : "Database Video"}
                </div>
              </div>
            )}
            {selectedVideo && (
              <div className="absolute top-2 right-2">
                <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs font-medium">
                  {hasExistingVideo ? "Replacing Video" : "New Video"}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full aspect-video rounded-xl bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300">
            <div className="text-center">
              <Video className="h-12 w-12 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500">
                {initialData.videoUrl && !initialData.customVideo
                  ? "No custom video uploaded"
                  : "No video uploaded"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {initialData.videoUrl && !initialData.customVideo
                  ? "Upload a custom video to override the database video"
                  : "Upload a video to get started"}
              </p>
            </div>
          </div>
        )}
      </div>

      <VideoUploadButton
        coursesPackageId={coursesPackageId}
        initialData={initialData}
        courseId={courseId}
        chapterId={chapterId}
        onVideoSelect={handleVideoSelect}
        onVideoRemove={handleVideoRemove}
        onUploadComplete={handleUploadComplete}
        selectedVideo={selectedVideo}
        disabled={isUploading}
        lang="en"
      />

      {hasUnsavedVideo && (
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-800">
              Video uploaded successfully. Click save to store in database.
            </span>
          </div>
          <Button
            onClick={handleSaveVideo}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : isSaved ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Video
              </>
            )}
          </Button>
        </div>
      )}

      {hasCustomVideo && !selectedVideo && (
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Custom video is active and saved in database.
            </span>
          </div>
          <Button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            variant="destructive"
            size="sm"
          >
            Delete Custom Video
          </Button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Delete Custom Video
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the custom video? 
              This action cannot be undone and will revert to the original database video.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Video"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
