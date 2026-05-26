/**
 * AI Image Upscaling API
 *
 * Uses image-upscaling.net free API (no signup required)
 * Documentation: https://image-upscaling.net/api.html
 *
 * This API uses a client_id cookie system for authentication.
 * Generate a random 32-character hex string as your client_id.
 *
 * Free quota: ~10-15 images per day per IP
 *
 * DO NOT MODIFY THIS FILE unless the API stops working.
 * If it breaks, check https://image-upscaling.net/api.html for updates.
 */

import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";

const API_BASE_URL = "https://image-upscaling.net";

// Max file size in bytes (2MB - API has strict limits)
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// Generate a random 32-character hex client ID
const generateClientId = (): string => {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Store client_id for session persistence
let storedClientId: string | null = null;

const getClientId = (): string => {
  if (!storedClientId) {
    storedClientId = generateClientId();
  }
  return storedClientId;
};

export type UpscaleModel = "general" | "plus" | "diffuser";
export type UpscaleScale = 1 | 2 | 3 | 4;

export interface UpscaleOptions {
  scale?: UpscaleScale; // 1x, 2x, 3x, 4x (default: 2)
  model?: UpscaleModel; // general (up to 16k), plus (up to 32MP), diffuser (up to 4MP with AI enhancement)
  faceEnhance?: boolean; // Enable face enhancement (plus/general models only)
  prompt?: string; // Text prompt for diffuser model
  creativity?: number; // 0-1 for diffuser model
}

interface UpscaleStatus {
  pending: Array<{ id: string; filename: string }>;
  processing: Array<{ id: string; filename: string; progress?: number }>;
  processed: Array<string | {
    id: string;
    filename: string;
    url: string;
    width: number;
    height: number;
  }>;
  failed: Array<{ id: string; filename: string; error?: string }>;
}

/**
 * Compress image to meet API size requirements
 */
const compressImageIfNeeded = async (imageUri: string): Promise<string> => {
  try {
    // Check file size
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (!fileInfo.exists) {
      throw new Error("Image file not found");
    }

    const fileSize = "size" in fileInfo ? fileInfo.size : 0;
    console.log("[Upscale] Original file size:", (fileSize / 1024 / 1024).toFixed(2), "MB");

    // If file is small enough, return original
    if (fileSize <= MAX_FILE_SIZE) {
      return imageUri;
    }

    // Start with aggressive compression
    console.log("[Upscale] Compressing image to meet API requirements...");
    let compressed = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 1536 } }],
      {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    let compressedInfo = await FileSystem.getInfoAsync(compressed.uri);
    let compressedSize = "size" in compressedInfo ? compressedInfo.size : 0;
    console.log("[Upscale] Compressed file size:", (compressedSize / 1024 / 1024).toFixed(2), "MB");

    // If still too large, compress even more
    if (compressedSize > MAX_FILE_SIZE) {
      console.log("[Upscale] Further compression needed...");
      compressed = await ImageManipulator.manipulateAsync(
        compressed.uri,
        [{ resize: { width: 1024 } }],
        {
          compress: 0.6,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      compressedInfo = await FileSystem.getInfoAsync(compressed.uri);
      compressedSize = "size" in compressedInfo ? compressedInfo.size : 0;
      console.log("[Upscale] Final file size:", (compressedSize / 1024 / 1024).toFixed(2), "MB");
    }

    // If STILL too large, go maximum compression
    if (compressedSize > MAX_FILE_SIZE) {
      console.log("[Upscale] Maximum compression required...");
      compressed = await ImageManipulator.manipulateAsync(
        compressed.uri,
        [{ resize: { width: 800 } }],
        {
          compress: 0.5,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
    }

    return compressed.uri;
  } catch (err: any) {
    console.error("[Upscale] Compression error:", err);
    // Return original if compression fails
    return imageUri;
  }
};

/**
 * Upload an image for AI upscaling
 *
 * @param imageUri - Local file URI of the image to upscale
 * @param options - Upscaling options (scale, model, etc.)
 * @returns The upload response with task ID
 */
export const uploadForUpscale = async (
  imageUri: string,
  options: UpscaleOptions = {}
): Promise<{ success: boolean; taskId?: string; error?: string }> => {
  const clientId = getClientId();
  const { scale = 2, model = "plus", faceEnhance = false, prompt, creativity } = options;

  try {
    console.log("[Upscale] Uploading image for upscaling...");
    console.log("[Upscale] Client ID:", clientId);
    console.log("[Upscale] Scale:", scale, "Model:", model);

    // Compress image if needed
    const processedUri = await compressImageIfNeeded(imageUri);

    // Determine file type from URI
    const fileExtension = processedUri.split(".").pop()?.toLowerCase() || "jpg";
    const mimeType =
      fileExtension === "png"
        ? "image/png"
        : fileExtension === "webp"
        ? "image/webp"
        : "image/jpeg";

    // Create form data with proper file structure for React Native
    const formData = new FormData();
    formData.append("image", {
      uri: processedUri,
      type: mimeType,
      name: `image.${fileExtension}`,
    } as any);
    formData.append("scale", scale.toString());
    formData.append("model", model);

    if (faceEnhance && (model === "plus" || model === "general")) {
      formData.append("fx", "");
    }

    if (model === "diffuser") {
      if (prompt) formData.append("prompt", prompt);
      if (creativity !== undefined) formData.append("creativity", creativity.toString());
    }

    const uploadResponse = await fetch(`${API_BASE_URL}/upscaling_upload`, {
      method: "POST",
      headers: {
        Cookie: `client_id=${clientId}`,
      },
      body: formData,
    });

    const responseText = await uploadResponse.text();
    console.log("[Upscale] Upload response:", responseText);

    if (!uploadResponse.ok) {
      return { success: false, error: `Upload failed: ${uploadResponse.status}` };
    }

    // Parse response - it returns the task info
    try {
      const data = JSON.parse(responseText);
      if (data.error) {
        return { success: false, error: data.error };
      }
      // The response contains the uploaded image info
      return { success: true, taskId: data.id || "pending" };
    } catch {
      // If not JSON, upload was successful - poll for status
      return { success: true, taskId: "pending" };
    }
  } catch (err: any) {
    console.error("[Upscale] Upload error:", err);
    return { success: false, error: err.message || "Upload failed" };
  }
};

/**
 * Check the status of upscaling tasks
 *
 * @returns Status of all pending/processing/processed images
 */
export const getUpscaleStatus = async (): Promise<UpscaleStatus | null> => {
  const clientId = getClientId();

  try {
    const response = await fetch(`${API_BASE_URL}/upscaling_get_status`, {
      method: "GET",
      headers: {
        Cookie: `client_id=${clientId}`,
      },
    });

    if (!response.ok) {
      console.error("[Upscale] Status check failed:", response.status);
      return null;
    }

    const data = await response.json();
    console.log("[Upscale] Status:", JSON.stringify(data));
    return data as UpscaleStatus;
  } catch (err: any) {
    console.error("[Upscale] Status check error:", err);
    return null;
  }
};

/**
 * Download an upscaled image
 *
 * @param imageUrl - URL of the processed image from status response
 * @param deleteAfterDownload - Whether to delete from server after download
 * @returns The image data as base64 or blob URL
 */
export const downloadUpscaledImage = async (
  imageUrl: string,
  deleteAfterDownload = true
): Promise<string | null> => {
  const clientId = getClientId();

  try {
    const url = deleteAfterDownload
      ? `${imageUrl}?delete_after_download=1`
      : imageUrl;

    const response = await fetch(url, {
      headers: {
        Cookie: `client_id=${clientId}`,
      },
    });

    if (!response.ok) {
      console.error("[Upscale] Download failed:", response.status);
      return null;
    }

    const blob = await response.blob();

    // Convert blob to base64 data URI
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err: any) {
    console.error("[Upscale] Download error:", err);
    return null;
  }
};

/**
 * High-level function to upscale an image and wait for result
 *
 * @param imageUri - Local file URI of the image
 * @param options - Upscaling options
 * @param onProgress - Progress callback (0-100)
 * @returns The upscaled image URI or null on failure
 */
export const upscaleImage = async (
  imageUri: string,
  options: UpscaleOptions = {},
  onProgress?: (progress: number, status: string) => void
): Promise<{ success: boolean; imageUri?: string; error?: string }> => {
  try {
    // Step 1: Upload
    onProgress?.(10, "Uploading image...");
    const uploadResult = await uploadForUpscale(imageUri, options);

    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error };
    }

    // Step 2: Poll for completion
    onProgress?.(20, "Processing with AI...");

    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;
    let lastProgress = 20;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;

      const status = await getUpscaleStatus();

      if (!status) {
        continue;
      }

      // Check if our image is processed
      if (status.processed && status.processed.length > 0) {
        const processed = status.processed[0]; // Get most recent
        onProgress?.(90, "Downloading upscaled image...");

        // The API returns processed as either a string URL or an object
        const downloadUrl = typeof processed === "string"
          ? (processed.startsWith("http") ? processed : `${API_BASE_URL}${processed}`)
          : (processed.url.startsWith("http") ? processed.url : `${API_BASE_URL}${processed.url}`);

        const imageData = await downloadUpscaledImage(downloadUrl);

        if (imageData) {
          onProgress?.(100, "Complete!");
          return { success: true, imageUri: imageData };
        } else {
          return { success: false, error: "Failed to download upscaled image" };
        }
      }

      // Check if failed
      if (status.failed && status.failed.length > 0) {
        const failed = status.failed[0];
        return { success: false, error: failed.error || "Upscaling failed" };
      }

      // Update progress based on processing status
      if (status.processing && status.processing.length > 0) {
        const processing = status.processing[0];
        const serverProgress = processing.progress || 50;
        lastProgress = Math.min(20 + serverProgress * 0.7, 85);
        onProgress?.(lastProgress, "AI enhancing image...");
      } else if (status.pending && status.pending.length > 0) {
        lastProgress = Math.min(lastProgress + 2, 40);
        onProgress?.(lastProgress, "Waiting in queue...");
      }
    }

    return { success: false, error: "Upscaling timed out. Please try again." };
  } catch (err: any) {
    console.error("[Upscale] Error:", err);
    return { success: false, error: err.message || "Upscaling failed" };
  }
};

/**
 * Get account/quota info
 */
export const getAccountInfo = async (): Promise<{
  credits?: number;
  dailyQuota?: number;
} | null> => {
  const clientId = getClientId();

  try {
    const response = await fetch(`${API_BASE_URL}/get_account_info`, {
      headers: {
        Cookie: `client_id=${clientId}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
};
