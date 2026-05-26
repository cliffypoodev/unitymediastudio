/**
 * Cloud Upload Utilities
 * Upload local videos to cloud storage to get public URLs
 */
import * as FileSystem from "expo-file-system";
import { Alert } from "react-native";

/**
 * Upload a video file to temporary cloud storage
 * This is a placeholder - you'll need to implement with your preferred service
 *
 * Options:
 * 1. Cloudinary (free tier available)
 * 2. AWS S3 with presigned URLs
 * 3. Firebase Storage
 * 4. Imgur (for videos)
 */
export async function uploadVideoToCloud(localUri: string): Promise<string> {
  throw new Error(
    "Cloud upload not configured.\n\n" +
    "To enable video stitching with local files:\n\n" +
    "1. Set up a cloud storage service (Cloudinary, S3, etc.)\n" +
    "2. Implement the uploadVideoToCloud function\n" +
    "3. Upload videos and get public URLs\n" +
    "4. Use JSON2Video API with public URLs\n\n" +
    "For now, use the Export fallback to save clips separately."
  );
}

/**
 * Upload multiple videos and return public URLs
 */
export async function uploadMultipleVideos(
  localUris: string[],
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const publicUrls: string[] = [];

  for (let i = 0; i < localUris.length; i++) {
    onProgress?.(i + 1, localUris.length);
    const url = await uploadVideoToCloud(localUris[i]);
    publicUrls.push(url);
  }

  return publicUrls;
}

/**
 * Example Cloudinary implementation (requires API key)
 */
export async function uploadToCloudinary(
  localUri: string,
  cloudName: string,
  uploadPreset: string
): Promise<string> {
  const formData = new FormData();

  // Get file info
  const fileInfo = await FileSystem.getInfoAsync(localUri);
  if (!fileInfo.exists) {
    throw new Error("File not found");
  }

  // Prepare file for upload
  const filename = localUri.split("/").pop() || "video.mp4";

  formData.append("file", {
    uri: localUri,
    type: "video/mp4",
    name: filename,
  } as any);

  formData.append("upload_preset", uploadPreset);
  formData.append("resource_type", "video");

  // Upload to Cloudinary
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  const data = await response.json();
  return data.secure_url; // Public HTTPS URL
}

/**
 * Show instructions for setting up cloud upload
 */
export function showCloudUploadInstructions() {
  Alert.alert(
    "Cloud Upload Required",
    "To stitch local videos with transitions:\n\n" +
    "1. Videos must be uploaded to cloud storage\n" +
    "2. Get public HTTPS URLs\n" +
    "3. Use JSON2Video API with those URLs\n\n" +
    "Popular Options:\n" +
    "• Cloudinary (free tier: 25GB)\n" +
    "• AWS S3 (pay per use)\n" +
    "• Firebase Storage\n\n" +
    "Current workaround: Use 'Export' to save clips separately, then edit in iMovie/CapCut manually."
  );
}
