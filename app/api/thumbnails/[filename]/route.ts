import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { extname, join } from "path";

const mimeMap: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const filePath = join(process.cwd(), "docs", "thumbnails", filename);
    const fileBuffer = await readFile(filePath);
    const ext = extname(filename).toLowerCase();
    const contentType = mimeMap[ext] ?? "application/octet-stream";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving thumbnail:", error);
    return new NextResponse("Thumbnail not found", { status: 404 });
  }
}

