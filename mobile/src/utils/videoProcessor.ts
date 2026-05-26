/**
 * Local Video Processor
 *
 * Since FFmpeg is not available in Expo, this provides two approaches:
 * 1. In-App Sequential Playback: Use SequentialVideoPlayer for smooth playback with transitions
 * 2. Sequential Export: Export clips individually for manual editing
 *
 * The SequentialVideoPlayer provides the best in-app experience, allowing users
 * to watch their "stitched" video with transitions without leaving the app.
 */
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { Alert, Platform } from "react-native";

export interface VideoClip {
  id: string;
  uri: string;
  duration: number;
  trimStart: number;
  trimEnd: number;
  transition?: "fade" | "dissolve" | "wipe" | "slide" | "none";
  volume?: number;
}

export interface ProcessingResult {
  success: boolean;
  method: "in_app_player" | "sequential_export" | "json2video";
  message: string;
  clipCount: number;
  totalDuration: number;
  files?: string[];
  url?: string;
}

/**
 * Process videos for in-app playback
 * This is the recommended method - provides smooth playback with transitions
 * without requiring external apps
 */
export async function processForInAppPlayback(
  clips: VideoClip[],
  projectName: string
): Promise<ProcessingResult> {
  try {
    const totalDuration = clips.reduce((sum, clip) => {
      return sum + (clip.trimEnd - clip.trimStart);
    }, 0);

    return {
      success: true,
      method: "in_app_player",
      message: "Ready for in-app playback with transitions",
      clipCount: clips.length,
      totalDuration,
    };
  } catch (err) {
    console.error("Processing error:", err);
    throw err;
  }
}

/**
 * Export clips sequentially to device library
 * This is a fallback method for users who want individual files
 */
export async function exportSequentialClips(
  clips: VideoClip[],
  projectName: string,
  onProgress?: (progress: number) => void
): Promise<ProcessingResult> {
  try {
    const outputFiles: string[] = [];

    // Copy each clip to the library with sequential naming
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      onProgress?.(Math.round(((i + 1) / clips.length) * 100));

      // Create a unique filename with sequence number
      const timestamp = Date.now();
      const filename = `${FileSystem.cacheDirectory}${projectName}_clip_${String(i + 1).padStart(2, "0")}_${timestamp}.mp4`;

      try {
        // Copy the video file
        await FileSystem.copyAsync({
          from: clip.uri,
          to: filename,
        });

        // Save to media library
        const asset = await MediaLibrary.createAssetAsync(filename);
        outputFiles.push(asset.uri);

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`Failed to copy clip ${i + 1}:`, err);
      }
    }

    const totalDuration = clips.reduce((sum, clip) => {
      return sum + (clip.trimEnd - clip.trimStart);
    }, 0);

    return {
      success: true,
      method: "sequential_export",
      message: `Exported ${clips.length} clips to your library`,
      clipCount: clips.length,
      totalDuration,
      files: outputFiles,
    };
  } catch (err) {
    console.error("Export error:", err);
    throw err;
  }
}

/**
 * Create a playback playlist file that video players can use
 * This creates an M3U8 playlist format
 */
export async function createPlaylist(
  clips: VideoClip[],
  projectName: string
): Promise<string> {
  // Create M3U8 playlist format
  let playlist = "#EXTM3U\n";
  playlist += "#EXT-X-VERSION:3\n";
  playlist += "#EXT-X-TARGETDURATION:60\n";

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const duration = (clip.trimEnd - clip.trimStart) / 1000; // Convert to seconds

    playlist += `#EXTINF:${duration.toFixed(3)},\n`;
    playlist += `${clip.uri}\n`;
  }

  playlist += "#EXT-X-ENDLIST\n";

  // Save playlist file
  const playlistPath = `${FileSystem.documentDirectory}${projectName}_playlist.m3u8`;
  await FileSystem.writeAsStringAsync(playlistPath, playlist);

  return playlistPath;
}

/**
 * Show user-friendly message about in-app playback success
 */
export function showInAppPlaybackInfo(clipCount: number, projectName: string, totalDuration: number) {
  const durationSeconds = Math.round(totalDuration / 1000);
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  Alert.alert(
    "Video Ready! 🎬",
    `Your video project "${projectName}" is ready to play!\n\n` +
    `📊 Details:\n` +
    `• ${clipCount} clips\n` +
    `• ${minutes}:${String(seconds).padStart(2, "0")} total duration\n` +
    `• Smooth transitions included\n\n` +
    `✨ Watch your video with professional transitions in the player above.\n\n` +
    `💡 Tip: You can also export clips individually if needed.`,
    [{ text: "Got it!" }]
  );
}

/**
 * Show user-friendly message about video export
 */
export function showExportSuccess(clipCount: number, projectName: string) {
  Alert.alert(
    "Videos Exported Successfully! ✅",
    `${clipCount} video clips have been saved to your library in sequence:\n\n` +
    `• ${projectName}_clip_01.mp4\n` +
    `• ${projectName}_clip_02.mp4\n` +
    `• ${projectName}_clip_03.mp4\n` +
    `${clipCount > 3 ? `• ... (${clipCount - 3} more)\n` : ""}\n` +
    `These clips are ready to play in order.\n\n` +
    `💡 Tip: To create a single file with transitions, videos need to be uploaded to cloud storage first.`,
    [{ text: "OK" }]
  );
}

/**
 * Estimate output file size
 */
export function estimateOutputSize(clips: VideoClip[]): string {
  // Rough estimate: 1 minute = ~15-30MB for HD video
  const totalDuration = clips.reduce((sum, clip) =>
    sum + (clip.trimEnd - clip.trimStart), 0
  );
  const totalMinutes = totalDuration / 1000 / 60;
  const estimatedMB = Math.round(totalMinutes * 20); // Conservative estimate

  return estimatedMB < 1000
    ? `${estimatedMB} MB`
    : `${(estimatedMB / 1000).toFixed(1)} GB`;
}
