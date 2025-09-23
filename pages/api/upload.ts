/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import formidable from "formidable";

const UPLOAD_DIR = path.join(process.cwd(), "fuad");
const COURSE_DIR = path.join(UPLOAD_DIR, "course");

export const config = {
  api: {
    bodyParser: false,
    bodySizeLimit: "2000mb", // <-- Add this line to increase the limit
  },
};
function parseForm(req: NextApiRequest): Promise<{ fields: any; files: any }> {
  return new Promise((resolve, reject) => {
    const form = formidable({ 
      multiples: false,
      maxTotalFileSize: 2000 * 1024 * 1024, // 2GB total limit
      maxFileSize: 2000 * 1024 * 1024 // 2GB per file limit
    });
    form.parse(req, (err: any, fields: any, files: any) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

function getTimestampUUID(ext: string) {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}.${ext}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.status(405).end("Method Not Allowed");
    return;
  }

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  if (!fs.existsSync(COURSE_DIR)) {
    fs.mkdirSync(COURSE_DIR, { recursive: true });
    console.log("Created course folder at:", COURSE_DIR);
  }
  // Remove this else block if you don't want the log
  // else {
  //   console.log("Course folder exists at:", COURSE_DIR);
  // }

  try {
    const { fields, files } = await parseForm(req);
    let { filename, chunkIndex, totalChunks } = fields;

    // Debug: log received file fields
    console.log("Received file fields:", Object.keys(files));

    // Ensure fields are strings, not arrays
    if (Array.isArray(filename)) filename = filename[0];
    if (Array.isArray(chunkIndex)) chunkIndex = chunkIndex[0];
    if (Array.isArray(totalChunks)) totalChunks = totalChunks[0];

    let chunkFile = files.chunk;

    // Fallback: support 'video' field if chunk is missing
    if (!chunkFile && files.video) {
      chunkFile = files.video;
    }

    // Handle array or single file
    if (Array.isArray(chunkFile)) {
      chunkFile = chunkFile[0];
    }

    if (!chunkFile || !chunkFile.filepath) {
      console.error("Chunk file missing or invalid:", chunkFile);
      res.status(400).json({
        error: "Chunk file missing or invalid",
        receivedFields: Object.keys(files),
      });
      return;
    }

    // Always use timestamp UUID for filename and chunk folder
    let ext = "mp4";
    if (chunkFile.originalFilename) {
      const parts = chunkFile.originalFilename.split(".");
      if (parts.length > 1) ext = parts.pop() as string;
    }
    if (!filename || filename === "") {
      filename = getTimestampUUID(ext);
    }
    // Use the same timestamp UUID for chunk folder and final video
    const chunkFolder = path.join(
      COURSE_DIR,
      filename.replace(/\.[^/.]+$/, "") + "_chunks"
    );
    if (!fs.existsSync(chunkFolder)) {
      fs.mkdirSync(chunkFolder, { recursive: true });
    }
    const chunkPath = path.join(chunkFolder, `chunk_${chunkIndex}`);
    console.log("Saving chunk:", chunkPath); // <-- Add this log
    const readStream = fs.createReadStream(chunkFile.filepath);
    const writeStream = fs.createWriteStream(chunkPath);
    await new Promise<void>((resolve, reject) => {
      readStream.pipe(writeStream);
      writeStream.on("finish", () => resolve());
      writeStream.on("error", reject);
      readStream.on("error", reject);
    });
    // If last chunk, join all
    if (parseInt(chunkIndex) + 1 === parseInt(totalChunks)) {
      // Always rename final file to .mp4
      const baseName = filename.replace(/\.[^/.]+$/, "");
      const videoPath = path.join(COURSE_DIR, `${baseName}.mp4`);
      console.log("Joining chunks to:", videoPath); // <-- Add this log
      const finalWriteStream = fs.createWriteStream(videoPath);
      try {
        for (let i = 0; i < parseInt(totalChunks); i++) {
          const chunkFilePath = path.join(chunkFolder, `chunk_${i}`);
          console.log("Reading chunk:", chunkFilePath); // <-- Add this log
          if (!fs.existsSync(chunkFilePath)) {
            console.error("Missing chunk file:", chunkFilePath);
            continue;
          }
          const chunk = fs.readFileSync(chunkFilePath);
          finalWriteStream.write(chunk);
        }
        finalWriteStream.end();
        await new Promise<void>((resolve, reject) => {
          finalWriteStream.on("finish", () => resolve());
          finalWriteStream.on("error", (err) => {
            console.error("finalWriteStream error:", err);
            reject(err);
          });
        });
        // Clean up temp chunks
        fs.rmSync(chunkFolder, { recursive: true, force: true });
        console.log("Deleted chunk folder:", chunkFolder); // <-- Add this log
      } catch (err) {
        console.error("Error joining chunks:", err);
        res.status(500).json({ error: "Error joining chunks", details: err });
        return;
      }
      // Respond with .mp4 filename
      res.status(200).json({ success: true, filename: `${baseName}.mp4` });
      return;
    }
    res.status(200).json({ success: true, filename }); // Return the uuid filename
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed", details: err });
  }
}
