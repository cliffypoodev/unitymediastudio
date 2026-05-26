/**
 * Cross-platform Media Picker
 *
 * On mobile: Uses expo-image-picker and expo-media-library
 * On web: Uses File System Access API with permission prompt
 */
import { Platform, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";

export interface MediaAsset {
  id: string;
  uri: string;
  filename: string;
  mediaType: "photo" | "video";
  width: number;
  height: number;
  duration?: number;
  creationTime?: number;
  file?: File; // Only available on web
}

export interface MediaPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
}

/**
 * Check if File System Access API is available (modern browsers)
 */
const hasFileSystemAccess = () => {
  if (Platform.OS !== "web") return false;
  return "showOpenFilePicker" in window;
};

/**
 * Request permission to access media library
 * On web, this will prompt for file access
 */
export async function requestMediaPermission(): Promise<MediaPermissionStatus> {
  if (Platform.OS === "web") {
    // On web, we check if File System Access API is available
    // Actual permission is requested when picking files
    if (hasFileSystemAccess()) {
      return { granted: true, canAskAgain: true };
    }
    // Fallback to standard file input (always "granted")
    return { granted: true, canAskAgain: true };
  }

  // Native platforms use MediaLibrary
  const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();
  return {
    granted: status === "granted",
    canAskAgain: canAskAgain ?? true,
  };
}

/**
 * Pick a single video from device
 */
export async function pickVideo(): Promise<MediaAsset | null> {
  if (Platform.OS === "web") {
    return pickMediaWeb("video");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["videos"],
    allowsMultipleSelection: false,
    quality: 1,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  return {
    id: Date.now().toString(),
    uri: asset.uri,
    filename: asset.fileName || `video_${Date.now()}.mp4`,
    mediaType: "video",
    width: asset.width,
    height: asset.height,
    duration: asset.duration || 0,
  };
}

/**
 * Pick a single image from device
 */
export async function pickImage(): Promise<MediaAsset | null> {
  if (Platform.OS === "web") {
    return pickMediaWeb("photo");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: false,
    quality: 1,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  return {
    id: Date.now().toString(),
    uri: asset.uri,
    filename: asset.fileName || `image_${Date.now()}.jpg`,
    mediaType: "photo",
    width: asset.width,
    height: asset.height,
  };
}

/**
 * Pick multiple videos from device
 */
export async function pickMultipleVideos(): Promise<MediaAsset[]> {
  if (Platform.OS === "web") {
    return pickMultipleMediaWeb("video");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["videos"],
    allowsMultipleSelection: true,
    quality: 1,
  });

  if (result.canceled || !result.assets) {
    return [];
  }

  return result.assets.map((asset, index) => ({
    id: `${Date.now()}_${index}`,
    uri: asset.uri,
    filename: asset.fileName || `video_${Date.now()}_${index}.mp4`,
    mediaType: "video" as const,
    width: asset.width,
    height: asset.height,
    duration: asset.duration || 0,
  }));
}

/**
 * Get all videos from device library
 * On web, this opens a directory picker
 */
export async function getAllVideos(): Promise<MediaAsset[]> {
  if (Platform.OS === "web") {
    return pickMultipleMediaWeb("video");
  }

  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== "granted") {
    return [];
  }

  const assets: MediaAsset[] = [];
  let after: string | undefined = undefined;
  let hasNextPage = true;

  while (hasNextPage) {
    const result = await MediaLibrary.getAssetsAsync({
      mediaType: "video",
      sortBy: MediaLibrary.SortBy.creationTime,
      first: 100,
      after,
    });

    for (const asset of result.assets) {
      assets.push({
        id: asset.id,
        uri: asset.uri,
        filename: asset.filename,
        mediaType: "video",
        width: asset.width,
        height: asset.height,
        duration: asset.duration,
        creationTime: asset.creationTime,
      });
    }

    hasNextPage = result.hasNextPage;
    after = result.endCursor;
  }

  return assets;
}

/**
 * Web-specific: Pick media using File System Access API or file input
 */
async function pickMediaWeb(type: "photo" | "video"): Promise<MediaAsset | null> {
  const accept = type === "video" ? "video/*" : "image/*";

  try {
    // Try modern File System Access API first
    if (hasFileSystemAccess()) {
      const [fileHandle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: type === "video" ? "Video files" : "Image files",
            accept: {
              [type === "video" ? "video/*" : "image/*"]:
                type === "video"
                  ? [".mp4", ".mov", ".webm", ".avi", ".mkv"]
                  : [".jpg", ".jpeg", ".png", ".gif", ".webp"],
            },
          },
        ],
        multiple: false,
      });

      const file = await fileHandle.getFile();
      const uri = URL.createObjectURL(file);

      // Get video/image dimensions
      const dimensions = await getMediaDimensions(uri, type);

      return {
        id: `web_${Date.now()}`,
        uri,
        filename: file.name,
        mediaType: type,
        width: dimensions.width,
        height: dimensions.height,
        duration: dimensions.duration,
        file,
      };
    }

    // Fallback to file input
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        const uri = URL.createObjectURL(file);
        const dimensions = await getMediaDimensions(uri, type);

        resolve({
          id: `web_${Date.now()}`,
          uri,
          filename: file.name,
          mediaType: type,
          width: dimensions.width,
          height: dimensions.height,
          duration: dimensions.duration,
          file,
        });
      };

      input.oncancel = () => resolve(null);
      input.click();
    });
  } catch (err) {
    // User cancelled or API not supported
    console.log("File picker error:", err);
    return null;
  }
}

/**
 * Web-specific: Pick multiple media files
 */
async function pickMultipleMediaWeb(type: "photo" | "video"): Promise<MediaAsset[]> {
  const accept = type === "video" ? "video/*" : "image/*";

  try {
    // Try modern File System Access API first
    if (hasFileSystemAccess()) {
      const fileHandles = await (window as any).showOpenFilePicker({
        types: [
          {
            description: type === "video" ? "Video files" : "Image files",
            accept: {
              [type === "video" ? "video/*" : "image/*"]:
                type === "video"
                  ? [".mp4", ".mov", ".webm", ".avi", ".mkv"]
                  : [".jpg", ".jpeg", ".png", ".gif", ".webp"],
            },
          },
        ],
        multiple: true,
      });

      const assets: MediaAsset[] = [];
      for (let i = 0; i < fileHandles.length; i++) {
        const file = await fileHandles[i].getFile();
        const uri = URL.createObjectURL(file);
        const dimensions = await getMediaDimensions(uri, type);

        assets.push({
          id: `web_${Date.now()}_${i}`,
          uri,
          filename: file.name,
          mediaType: type,
          width: dimensions.width,
          height: dimensions.height,
          duration: dimensions.duration,
          file,
        });
      }

      return assets;
    }

    // Fallback to file input with multiple
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.multiple = true;

      input.onchange = async (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (!files || files.length === 0) {
          resolve([]);
          return;
        }

        const assets: MediaAsset[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const uri = URL.createObjectURL(file);
          const dimensions = await getMediaDimensions(uri, type);

          assets.push({
            id: `web_${Date.now()}_${i}`,
            uri,
            filename: file.name,
            mediaType: type,
            width: dimensions.width,
            height: dimensions.height,
            duration: dimensions.duration,
            file,
          });
        }

        resolve(assets);
      };

      input.oncancel = () => resolve([]);
      input.click();
    });
  } catch (err) {
    console.log("File picker error:", err);
    return [];
  }
}

/**
 * Get dimensions of media file (and duration for video)
 */
async function getMediaDimensions(
  uri: string,
  type: "photo" | "video"
): Promise<{ width: number; height: number; duration?: number }> {
  return new Promise((resolve) => {
    if (type === "video") {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration * 1000, // Convert to milliseconds
        });
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => {
        resolve({ width: 1920, height: 1080, duration: 0 });
      };
      video.src = uri;
    } else {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.onerror = () => {
        resolve({ width: 1920, height: 1080 });
      };
      img.src = uri;
    }
  });
}

/**
 * Show permission denied alert with instructions
 */
export function showPermissionDeniedAlert(type: "media" | "camera" = "media") {
  const title = type === "media" ? "Media Access Required" : "Camera Access Required";
  const message = Platform.OS === "web"
    ? `Please allow ${type} access when prompted by your browser to use this feature.`
    : `Please enable ${type} access in your device settings to use this feature.`;

  Alert.alert(title, message, [{ text: "OK" }]);
}
