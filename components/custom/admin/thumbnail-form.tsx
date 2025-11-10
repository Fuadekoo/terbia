"use client";

import {
  updateCoursePackageThumbnail,
  uploadCoursePackageThumbnailFile,
} from "@/actions/admin/creatingCoursesPackage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { coursePackage } from "@prisma/client";
import {
  AlertCircle,
  ImageIcon,
  Loader2,
  Pencil,
  PlusCircle,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

interface ThumbnailFormProps {
  initialData: Pick<coursePackage, "thumbnail">;
  coursesPackageId: string;
}

const resolveThumbnailSrc = (value: string) => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  if (value.startsWith("/")) {
    return value;
  }
  return `/api/thumbnails/${value}`;
};

export const ThumbnailForm = ({
  initialData,
  coursesPackageId,
}: ThumbnailFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [thumbnailValue, setThumbnailValue] = useState(
    initialData?.thumbnail ?? ""
  );
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setThumbnailValue(initialData?.thumbnail ?? "");
  }, [initialData?.thumbnail]);

  const thumbnailSrc = useMemo(
    () => resolveThumbnailSrc(thumbnailValue),
    [thumbnailValue]
  );

  const toggleEdit = () => setIsEditing((prev) => !prev);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (file.type && !allowedTypes.includes(file.type)) {
      toast.error("Please upload a PNG, JPG, WEBP, or GIF image.");
      event.target.value = "";
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error("Please upload an image smaller than 5MB.");
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("coursesPackageId", coursesPackageId);

      const result = await uploadCoursePackageThumbnailFile(formData);
      if (result.status === 200) {
        const newValue = result.data?.filename ?? result.data?.url ?? "";
        setThumbnailValue(newValue);
        toast.success("Thumbnail uploaded successfully");
        toggleEdit();
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to upload thumbnail");
      }
    } catch (error) {
      console.error("Thumbnail upload error:", error);
      toast.error("Something went wrong while uploading the thumbnail.");
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleOpenRemoveDialog = () => {
    setConfirmOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!isRemoving) {
      setConfirmOpen(open);
    }
  };

  const handleCancelRemove = () => {
    if (!isRemoving) {
      setConfirmOpen(false);
    }
  };

  const handleRemoveConfirm = async () => {
    setIsRemoving(true);
    try {
      const result = await updateCoursePackageThumbnail(coursesPackageId, null);
      if (result.status === 200) {
        setThumbnailValue("");
        toast.success("Thumbnail removed successfully");
        setConfirmOpen(false);
        toggleEdit();
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to remove thumbnail");
      }
    } catch (error) {
      console.error("Thumbnail removal error:", error);
      toast.error("Something went wrong while removing the thumbnail.");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="mt-6 border bg-blue-100 rounded-md p-4">
      <div className="font-medium flex items-center justify-between">
        Courses Package thumbnail
        <Button onClick={toggleEdit} variant="ghost" disabled={isUploading}>
          {isEditing ? (
            "Cancel"
          ) : thumbnailValue ? (
            <>
              <Pencil className="w-4 h-4 mr-2" />
              Edit Thumbnail
            </>
          ) : (
            <>
              <PlusCircle className="w-4 h-4 mr-2" />
              Add Thumbnail
            </>
          )}
        </Button>
      </div>

      {!isEditing && (
        <div className="mt-4">
          {thumbnailSrc ? (
            <div className="relative aspect-video rounded-md overflow-hidden border border-blue-200 bg-white">
              <Image
                alt="Course package thumbnail"
                src={thumbnailSrc}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority={false}
              />
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-blue-300 bg-blue-50 text-blue-600">
              <ImageIcon className="mr-2 h-5 w-5" />
              <span className="text-sm">No thumbnail added yet</span>
            </div>
          )}
        </div>
      )}

      {isEditing && (
        <div className="mt-4 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex items-center gap-2">
            <Button onClick={handleUploadClick} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Choose Image
                </>
              )}
            </Button>
            {thumbnailValue && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleOpenRemoveDialog}
                disabled={isRemoving || isUploading}
              >
                {isRemoving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </>
                )}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Recommended aspect ratio 16:9. Supported formats: PNG, JPG, WEBP,
            GIF. Maximum size 5MB.
          </p>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Remove Thumbnail
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this thumbnail? This action will
              delete the stored image file and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleCancelRemove}
              disabled={isRemoving}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveConfirm}
              disabled={isRemoving}
              className="w-full sm:w-auto"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Thumbnail"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
