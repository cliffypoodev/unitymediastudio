import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Modal,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { STUDIO } from "../utils/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const isWeb = Platform.OS === "web";

// Map old TWILIGHT names to STUDIO for compatibility
const TWILIGHT = {
  void: STUDIO.void,
  dark: STUDIO.dark,
  shadow: STUDIO.charcoal,
  dusk: STUDIO.slate,
  purple: STUDIO.border,
  gold: STUDIO.amber,
  amber: STUDIO.woodLight,
  bronze: STUDIO.wood,
  cyan: STUDIO.swirlCyan,
  teal: STUDIO.swirlBlue,
  wolf: STUDIO.nickelDark,
  fur: STUDIO.nickelLight,
  midna: STUDIO.swirlOrange,
};

// Web version component
function DownloadScreenWeb() {
  const insets = useSafeAreaInsets();
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const handleOpenYtmp3 = () => {
    const url = youtubeUrl.trim()
      ? `https://cnvmp3.com/v53?url=${encodeURIComponent(youtubeUrl)}`
      : "https://cnvmp3.com/v53";
    window.open(url, "_blank");
  };

  return (
    <View style={{ flex: 1, backgroundColor: TWILIGHT.void }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-8">
          <Text className="text-3xl font-bold mb-2" style={{ color: STUDIO.text }}>
            YouTube Audio Download
          </Text>
          <Text className="text-base" style={{ color: STUDIO.nickelDark }}>
            Download audio from YouTube videos
          </Text>
        </View>

        <View
          className="p-4 rounded-xl mb-6"
          style={{ backgroundColor: STUDIO.charcoal, borderWidth: 1, borderColor: STUDIO.border }}
        >
          <View className="flex-row items-start mb-2">
            <Ionicons name="information-circle" size={24} color={STUDIO.amber} style={{ marginRight: 8 }} />
            <Text className="text-lg font-semibold flex-1" style={{ color: STUDIO.text }}>
              Web Version Notice
            </Text>
          </View>
          <Text className="text-sm leading-5" style={{ color: STUDIO.nickelDark }}>
            The full YouTube search and download features require the native mobile app. On web, you can use cnvmp3.com/v53 to download audio manually.
          </Text>
        </View>

        <View className="mb-4">
          <Text className="text-sm font-semibold mb-2" style={{ color: STUDIO.nickelDark }}>
            YOUTUBE URL (OPTIONAL)
          </Text>
          <TextInput
            value={youtubeUrl}
            onChangeText={setYoutubeUrl}
            placeholder="Paste YouTube URL here..."
            placeholderTextColor={STUDIO.nickelDark}
            className="px-4 py-3 rounded-xl text-base"
            style={{
              backgroundColor: STUDIO.dark,
              color: STUDIO.text,
              borderWidth: 1,
              borderColor: STUDIO.border,
            }}
          />
        </View>

        <Pressable onPress={handleOpenYtmp3} className="mb-6">
          {({ pressed }) => (
            <LinearGradient
              colors={[TWILIGHT.gold, TWILIGHT.amber] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 12,
                padding: 16,
                opacity: pressed ? 0.8 : 1,
              }}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="cloud-download" size={24} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text className="text-white text-lg font-bold">
                  Open cnvmp3.com
                </Text>
              </View>
            </LinearGradient>
          )}
        </Pressable>

        <View className="mb-6">
          <Text className="text-lg font-bold mb-3" style={{ color: STUDIO.text }}>
            How to Download:
          </Text>

          <View className="mb-3">
            <View className="flex-row items-start mb-2">
              <View
                className="w-6 h-6 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: STUDIO.amber }}
              >
                <Text className="text-white text-xs font-bold">1</Text>
              </View>
              <Text className="flex-1" style={{ color: STUDIO.nickelLight }}>
                Paste a YouTube URL in the field above (optional)
              </Text>
            </View>
          </View>

          <View className="mb-3">
            <View className="flex-row items-start mb-2">
              <View
                className="w-6 h-6 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: STUDIO.amber }}
              >
                <Text className="text-white text-xs font-bold">2</Text>
              </View>
              <Text className="flex-1" style={{ color: STUDIO.nickelLight }}>
                {"Tap \"Open cnvmp3.com\" to open the converter in a new tab"}
              </Text>
            </View>
          </View>

          <View className="mb-3">
            <View className="flex-row items-start mb-2">
              <View
                className="w-6 h-6 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: STUDIO.amber }}
              >
                <Text className="text-white text-xs font-bold">3</Text>
              </View>
              <Text className="flex-1" style={{ color: STUDIO.nickelLight }}>
                If you provided a URL, it will be pre-filled. Otherwise, paste one there
              </Text>
            </View>
          </View>

          <View className="mb-3">
            <View className="flex-row items-start mb-2">
              <View
                className="w-6 h-6 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: STUDIO.amber }}
              >
                <Text className="text-white text-xs font-bold">4</Text>
              </View>
              <Text className="flex-1" style={{ color: STUDIO.nickelLight }}>
                Click convert and download your MP3 file
              </Text>
            </View>
          </View>
        </View>

        <View
          className="p-4 rounded-xl"
          style={{ backgroundColor: STUDIO.dark, borderWidth: 1, borderColor: STUDIO.border }}
        >
          <View className="flex-row items-start">
            <Ionicons name="bulb" size={20} color={STUDIO.amber} style={{ marginRight: 8, marginTop: 2 }} />
            <View className="flex-1">
              <Text className="font-semibold mb-1" style={{ color: STUDIO.text }}>
                Pro Tip
              </Text>
              <Text className="text-sm" style={{ color: STUDIO.nickelDark }}>
                For the full experience with YouTube search, in-app downloads, and audio library management, download the Unity Studios mobile app!
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Native version - Import native modules only when not on web
function DownloadScreenNative() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { WebView } = require("react-native-webview");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const FileSystem = require("expo-file-system");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Haptics = require("expo-haptics");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Clipboard = require("expo-clipboard");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useAudioStore } = require("../state/audioStore");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useNavigation } = require("@react-navigation/native");

  const navigation = useNavigation();
  const addTrack = useAudioStore((s: any) => s.addTrack);
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState("");
  const [mode, setMode] = useState<"search" | "manual">("search");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadingTitle, setDownloadingTitle] = useState("");
  const [selectedResult, setSelectedResult] = useState<any | null>(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState("");
  const webViewRef = useRef<any>(null);
  const [continuationToken, setContinuationToken] = useState<string | null>(null);

  const downloadRef = useRef<any>(null);
  const isCancelledRef = useRef(false);
  const currentVideoTitleRef = useRef<string>("");
  const currentVideoIdRef = useRef<string>("");

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    Keyboard.dismiss();
    setError(null);
    setSearchResults([]);
    setContinuationToken(null);
    setIsSearching(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const response = await fetch("https://www.youtube.com/youtubei/v1/search?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "WEB",
              clientVersion: "2.20231219.01.00",
            },
          },
          query: searchQuery,
        }),
      });

      if (!response.ok) {
        throw new Error("Search failed. Please try again.");
      }

      const data = await response.json();
      const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

      const videos: any[] = [];
      for (const section of contents) {
        const items = section?.itemSectionRenderer?.contents || [];
        for (const item of items) {
          const videoRenderer = item?.videoRenderer;
          if (videoRenderer) {
            videos.push({
              videoId: videoRenderer.videoId,
              title: videoRenderer.title?.runs?.[0]?.text || "",
              channelTitle: videoRenderer.ownerText?.runs?.[0]?.text || "",
              thumbnail: videoRenderer.thumbnail?.thumbnails?.[0]?.url || "",
              duration: videoRenderer.lengthText?.simpleText || "",
            });
          }
        }
      }

      if (videos.length === 0) {
        throw new Error("No results found. Try a different search term.");
      }

      const continuationData = contents.find((section: any) =>
        section?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token
      );

      if (continuationData) {
        const token = continuationData.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
        setContinuationToken(token);
      }

      setSearchResults(videos);
    } catch (err) {
      console.log("Search error:", err);
      setError(err instanceof Error ? err.message : "Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const loadMoreResults = async () => {
    if (!continuationToken || isLoadingMore || isSearching) {
      return;
    }

    setIsLoadingMore(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const response = await fetch("https://www.youtube.com/youtubei/v1/search?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "WEB",
              clientVersion: "2.20231219.01.00",
            },
          },
          continuation: continuationToken,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to load more results");
      }

      const data = await response.json();
      const continuationContents = data?.onResponseReceivedCommands?.[0]?.appendContinuationItemsAction?.continuationItems || [];

      const videos: any[] = [];

      for (const item of continuationContents) {
        const itemSection = item?.itemSectionRenderer?.contents;
        if (itemSection) {
          for (const videoItem of itemSection) {
            const videoRenderer = videoItem?.videoRenderer;
            if (videoRenderer) {
              videos.push({
                videoId: videoRenderer.videoId,
                title: videoRenderer.title?.runs?.[0]?.text || "",
                channelTitle: videoRenderer.ownerText?.runs?.[0]?.text || "",
                thumbnail: videoRenderer.thumbnail?.thumbnails?.[0]?.url || "",
                duration: videoRenderer.lengthText?.simpleText || "",
              });
            }
          }
        } else {
          const videoRenderer = item?.videoRenderer;
          if (videoRenderer) {
            videos.push({
              videoId: videoRenderer.videoId,
              title: videoRenderer.title?.runs?.[0]?.text || "",
              channelTitle: videoRenderer.ownerText?.runs?.[0]?.text || "",
              thumbnail: videoRenderer.thumbnail?.thumbnails?.[0]?.url || "",
              duration: videoRenderer.lengthText?.simpleText || "",
            });
          }
        }
      }

      const nextContinuation = continuationContents.find((item: any) =>
        item?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token
      );

      if (nextContinuation) {
        const token = nextContinuation.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
        setContinuationToken(token);
      } else {
        setContinuationToken(null);
      }

      setSearchResults(prev => [...prev, ...videos]);
    } catch (err) {
      console.log("Load more error:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleRefresh = async () => {
    if (!searchQuery.trim()) return;

    setIsRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await handleSearch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const onDownloadProgress = useCallback((downloadProgress: any) => {
    const progress = downloadProgress.totalBytesExpectedToWrite > 0
      ? downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite
      : 0;
    setDownloadProgress(progress);
  }, []);

  const downloadFromVideoId = async (videoId: string, videoTitle?: string) => {
    setError(null);
    setStatus("Opening cnvmp3.com...");
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadingTitle(videoTitle || "");
    isCancelledRef.current = false;

    currentVideoIdRef.current = videoId;
    currentVideoTitleRef.current = videoTitle || "";

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let title = videoTitle || `YouTube_${videoId}`;

      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

      setStatus("Converting video (this may take a minute)...");

      const ytmp3Result = await new Promise<{ url: string; title: string } | null>((resolve) => {
        const ytmp3Url = `https://cnvmp3.com/v53?url=${encodeURIComponent(youtubeUrl)}`;
        setWebViewUrl(ytmp3Url);
        setShowWebView(true);

        (global as any).ytmp3Resolver = resolve;

        setTimeout(() => {
          if ((global as any).ytmp3Resolver === resolve) {
            (global as any).ytmp3Resolver = null;
            resolve(null);
          }
        }, 120000);
      });

      setShowWebView(false);
      setWebViewUrl("");
      (global as any).ytmp3Resolver = null;

      if (isCancelledRef.current) {
        throw new Error("Download cancelled");
      }

      if (!ytmp3Result || !ytmp3Result.url) {
        throw new Error("Unable to get download link. Please try again.");
      }

      const downloadUrl = ytmp3Result.url;
      title = ytmp3Result.title || title;
      setDownloadingTitle(title);

      setStatus("Downloading audio...");

      const fileName = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.mp3`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        fileUri,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "*/*",
            "Referer": "https://cnvmp3.com/v53",
          },
        },
        onDownloadProgress
      );

      downloadRef.current = downloadResumable;
      const downloadResult = await downloadResumable.downloadAsync();
      downloadRef.current = null;

      if (isCancelledRef.current) {
        try {
          await FileSystem.deleteAsync(fileUri, { idempotent: true });
        } catch {}
        throw new Error("Download cancelled");
      }

      if (!downloadResult || (downloadResult.status !== 200 && downloadResult.status !== 206)) {
        throw new Error("Download failed");
      }

      const fileInfo = await FileSystem.getInfoAsync(fileUri);

      if (!fileInfo.exists || (fileInfo as any).size < 10000) {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        throw new Error("Downloaded file is invalid");
      }

      const newTrack = {
        id: `track_${Date.now()}`,
        name: title,
        uri: fileUri,
        duration: 0,
        sourceUrl: youtubeUrl,
        createdAt: Date.now(),
      };

      addTrack(newTrack);
      setStatus("Download complete!");
      setDownloadProgress(1);
      setSearchQuery("");
      setSearchResults([]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTimeout(() => {
        setIsDownloading(false);
        setDownloadingTitle("");
        navigation.navigate("MusicLibrary");
      }, 800);
    } catch (err) {
      console.log("Download error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to download. Try a different video.";

      if (errorMessage !== "Download cancelled") {
        setError(errorMessage);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      setIsDownloading(false);
      setDownloadingTitle("");
      downloadRef.current = null;
    }
  };

  const openManualConverter = () => {
    setWebViewUrl("https://cnvmp3.com/v53");
    setShowWebView(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const cancelDownload = async () => {
    isCancelledRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (downloadRef.current) {
      try {
        await downloadRef.current.pauseAsync();
      } catch (e) {
        console.log("Error pausing download:", e);
      }
    }

    setStatus("Download cancelled");
    setIsDownloading(false);
    setDownloadingTitle("");
    setDownloadProgress(0);
    downloadRef.current = null;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <LinearGradient
        colors={[TWILIGHT.void, TWILIGHT.dark, TWILIGHT.shadow]}
        style={{ flex: 1, paddingTop: insets.top }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {/* Download Progress Bar - Fixed at top */}
        {isDownloading && (
          <View
            className="border-b"
            style={{ backgroundColor: TWILIGHT.shadow, borderBottomColor: TWILIGHT.purple }}
          >
            <View className="px-4 py-3">
              <View className="flex-row items-center mb-2">
                <ActivityIndicator size="small" color={TWILIGHT.gold} />
                <Text
                  className="text-sm font-medium ml-3 flex-1"
                  numberOfLines={1}
                  style={{ color: TWILIGHT.gold }}
                >
                  {status}
                </Text>
                <Pressable
                  onPress={cancelDownload}
                  className="ml-2 px-3 py-1 rounded-full"
                  style={{ backgroundColor: TWILIGHT.dusk }}
                >
                  <Text className="text-xs font-semibold" style={{ color: TWILIGHT.gold }}>
                    Cancel
                  </Text>
                </Pressable>
              </View>
              {downloadingTitle ? (
                <Text
                  className="text-xs mb-2"
                  numberOfLines={1}
                  style={{ color: TWILIGHT.fur }}
                >
                  {downloadingTitle}
                </Text>
              ) : null}
              <View
                className="h-1 rounded-full overflow-hidden"
                style={{ backgroundColor: TWILIGHT.dusk }}
              >
                <View
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: TWILIGHT.gold,
                    width: `${Math.round(downloadProgress * 100)}%`,
                  }}
                />
              </View>
            </View>
          </View>
        )}

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={TWILIGHT.gold}
              colors={[TWILIGHT.gold]}
            />
          }
        >
          {/* Header */}
          <View className="mb-6">
            <Text className="text-4xl font-bold mb-3" style={{ color: TWILIGHT.gold }}>
              Download Audio
            </Text>
            <Text className="text-base" style={{ color: TWILIGHT.fur }}>
              Search YouTube or paste a URL
            </Text>
          </View>

          {/* Mode Tabs */}
          <View
            className="flex-row rounded-xl p-1 mb-6"
            style={{ backgroundColor: TWILIGHT.dusk }}
          >
            <Pressable
              onPress={() => {
                setMode("search");
                setError(null);
                Haptics.selectionAsync();
              }}
              className="flex-1 py-3 rounded-lg items-center"
              style={{
                backgroundColor: mode === "search" ? TWILIGHT.purple : "transparent",
              }}
            >
              <Text
                className="font-semibold"
                style={{ color: mode === "search" ? TWILIGHT.gold : TWILIGHT.fur }}
              >
                Search YouTube
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMode("manual");
                setError(null);
                Haptics.selectionAsync();
              }}
              className="flex-1 py-3 rounded-lg items-center"
              style={{
                backgroundColor: mode === "manual" ? TWILIGHT.purple : "transparent",
              }}
            >
              <Text
                className="font-semibold"
                style={{ color: mode === "manual" ? TWILIGHT.gold : TWILIGHT.fur }}
              >
                Manual Convert
              </Text>
            </Pressable>
          </View>

          {mode === "search" ? (
            <>
              {/* Search Input */}
              <View className="mb-4">
                <View className="flex-row">
                  <View
                    className="flex-1 flex-row items-center rounded-xl px-4 mr-2"
                    style={{
                      backgroundColor: TWILIGHT.dusk,
                      borderWidth: 2,
                      borderColor: TWILIGHT.purple,
                    }}
                  >
                    <Ionicons name="search" size={20} color={TWILIGHT.fur} />
                    <TextInput
                      className="flex-1 text-base py-4 px-3"
                      style={{ color: "#fff" }}
                      placeholder="Song name, artist..."
                      placeholderTextColor={TWILIGHT.wolf}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="search"
                      onSubmitEditing={handleSearch}
                      editable={!isDownloading}
                    />
                    {searchQuery.length > 0 && (
                      <Pressable onPress={() => setSearchQuery("")} hitSlop={10}>
                        <Ionicons name="close-circle" size={20} color={TWILIGHT.fur} />
                      </Pressable>
                    )}
                  </View>
                  <Pressable
                    onPress={handleSearch}
                    disabled={isSearching || isDownloading || !searchQuery.trim()}
                    className="w-14 rounded-xl items-center justify-center"
                    style={{
                      backgroundColor:
                        isSearching || isDownloading || !searchQuery.trim()
                          ? TWILIGHT.dusk
                          : TWILIGHT.gold,
                    }}
                  >
                    {isSearching ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Ionicons name="search" size={24} color={TWILIGHT.void} />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <View className="mb-4">
                  <Text className="text-sm font-semibold mb-3" style={{ color: TWILIGHT.gold }}>
                    Search Results
                  </Text>
                  {searchResults.map((result) => (
                    <Pressable
                      key={result.videoId}
                      onPress={async () => {
                        const youtubeUrl = `https://www.youtube.com/watch?v=${result.videoId}`;
                        await Clipboard.setStringAsync(youtubeUrl);
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        downloadFromVideoId(result.videoId, result.title);
                      }}
                      disabled={isDownloading}
                      className="rounded-xl p-3 mb-2 flex-row"
                      style={{
                        backgroundColor: TWILIGHT.dusk,
                        borderWidth: 1,
                        borderColor: TWILIGHT.purple,
                        opacity: isDownloading ? 0.5 : 1,
                      }}
                    >
                      {result.thumbnail ? (
                        <Image
                          source={{ uri: result.thumbnail }}
                          className="w-24 h-16 rounded-lg mr-3"
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          className="w-24 h-16 rounded-lg mr-3 items-center justify-center"
                          style={{ backgroundColor: TWILIGHT.shadow }}
                        >
                          <Ionicons name="musical-note" size={24} color={TWILIGHT.wolf} />
                        </View>
                      )}
                      <View className="flex-1 justify-center">
                        <Text
                          className="font-medium text-sm mb-1"
                          style={{ color: "#fff" }}
                          numberOfLines={2}
                        >
                          {result.title}
                        </Text>
                        <Text className="text-xs" style={{ color: TWILIGHT.fur }}>
                          {result.channelTitle}
                        </Text>
                        {result.duration && (
                          <Text className="text-xs mt-0.5" style={{ color: TWILIGHT.wolf }}>
                            {result.duration}
                          </Text>
                        )}
                      </View>
                      <View className="justify-center pl-2">
                        <Ionicons name="copy-outline" size={20} color={TWILIGHT.cyan} />
                      </View>
                    </Pressable>
                  ))}

                  {/* Load More Button */}
                  {continuationToken && (
                    <Pressable
                      onPress={loadMoreResults}
                      disabled={isLoadingMore}
                      className="rounded-xl py-4 mt-2 items-center"
                      style={{
                        backgroundColor: TWILIGHT.purple,
                        opacity: isLoadingMore ? 0.5 : 1,
                      }}
                    >
                      {isLoadingMore ? (
                        <View className="flex-row items-center">
                          <ActivityIndicator color={TWILIGHT.gold} size="small" />
                          <Text className="text-sm font-semibold ml-2" style={{ color: TWILIGHT.gold }}>
                            Loading more...
                          </Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center">
                          <Ionicons name="arrow-down-circle-outline" size={20} color={TWILIGHT.gold} />
                          <Text className="text-sm font-semibold ml-2" style={{ color: TWILIGHT.gold }}>
                            Load More Results
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  )}
                </View>
              )}
            </>
          ) : (
            <>
              {/* Manual Convert Button */}
              <View className="mb-6">
                <Pressable
                  onPress={openManualConverter}
                  disabled={isDownloading}
                  className="rounded-xl py-6 items-center justify-center"
                  style={{
                    backgroundColor: isDownloading ? TWILIGHT.dusk : TWILIGHT.purple,
                    opacity: isDownloading ? 0.5 : 1,
                    borderWidth: 2,
                    borderColor: TWILIGHT.gold,
                  }}
                >
                  <View className="items-center">
                    <Ionicons
                      name="globe-outline"
                      size={32}
                      color={TWILIGHT.gold}
                    />
                    <Text
                      className="text-lg font-bold mt-3"
                      style={{ color: TWILIGHT.gold }}
                    >
                      Open cnvmp3.com
                    </Text>
                    <Text
                      className="text-sm mt-1"
                      style={{ color: TWILIGHT.fur }}
                    >
                      Convert videos manually
                    </Text>
                  </View>
                </Pressable>

                <View
                  className="rounded-xl p-4 mt-4"
                  style={{
                    backgroundColor: TWILIGHT.shadow,
                    borderWidth: 1,
                    borderColor: TWILIGHT.purple,
                  }}
                >
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="information-circle" size={20} color={TWILIGHT.cyan} />
                    <Text className="text-sm font-semibold ml-2" style={{ color: TWILIGHT.cyan }}>
                      How to use
                    </Text>
                  </View>
                  <Text className="text-xs leading-5" style={{ color: TWILIGHT.fur }}>
                    {"Opens cnvmp3.com in a browser window where you can:\n• Paste any YouTube URL\n• Convert and download manually\n• Use all cnvmp3.com features directly"}
                  </Text>
                </View>
              </View>
            </>
          )}

          {/* Error Message */}
          {error && (
            <View
              className="rounded-xl p-4 mb-4"
              style={{ backgroundColor: "#DC2626", borderWidth: 1, borderColor: "#B91C1C" }}
            >
              <View className="flex-row items-start">
                <Ionicons name="alert-circle" size={20} color="#fff" />
                <Text className="text-sm ml-3 flex-1" style={{ color: "#fff" }}>
                  {error}
                </Text>
              </View>
            </View>
          )}

          {/* Info Box - Only show for search mode */}
          {mode === "search" && (
            <View
              className="rounded-xl p-4"
              style={{
                backgroundColor: TWILIGHT.shadow,
                borderWidth: 1,
                borderColor: TWILIGHT.purple,
              }}
            >
              <View className="flex-row items-center mb-2">
                <Ionicons name="information-circle" size={20} color={TWILIGHT.cyan} />
                <Text className="text-sm font-semibold ml-2" style={{ color: TWILIGHT.cyan }}>
                  How to use
                </Text>
              </View>
              <Text className="text-xs leading-5" style={{ color: TWILIGHT.fur }}>
                Search for any song or video, then tap to download as MP3
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Copy URL Modal */}
        <Modal
          visible={showCopyModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCopyModal(false)}
        >
          <Pressable
            className="flex-1 justify-center items-center"
            style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
            onPress={() => setShowCopyModal(false)}
          >
            <Pressable
              className="w-4/5 rounded-2xl p-6"
              style={{ backgroundColor: TWILIGHT.dark }}
              onPress={(e) => e.stopPropagation()}
            >
              <Text className="text-xl font-bold mb-4" style={{ color: TWILIGHT.gold }}>
                Copy YouTube Link
              </Text>
              {selectedResult && (
                <Text className="text-sm mb-6" style={{ color: TWILIGHT.fur }} numberOfLines={2}>
                  {selectedResult.title}
                </Text>
              )}
              <Pressable
                onPress={async () => {
                  if (selectedResult) {
                    const youtubeUrl = `https://youtube.com/watch?v=${selectedResult.videoId}`;
                    await Clipboard.setStringAsync(youtubeUrl);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setShowCopyModal(false);
                    setSelectedResult(null);
                  }
                }}
                className="rounded-xl py-4 mb-3"
                style={{ backgroundColor: TWILIGHT.gold }}
              >
                <Text className="text-center font-bold" style={{ color: TWILIGHT.void }}>
                  Copy Link
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowCopyModal(false);
                  setSelectedResult(null);
                }}
                className="rounded-xl py-4"
                style={{ backgroundColor: TWILIGHT.dusk }}
              >
                <Text className="text-center font-semibold" style={{ color: TWILIGHT.fur }}>
                  Cancel
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        {/* WebView Modal for cnvmp3.com */}
        <Modal
          visible={showWebView}
          animationType="slide"
          onRequestClose={() => setShowWebView(false)}
        >
          <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: TWILIGHT.void }}>
            <View style={{ flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: TWILIGHT.dark }}>
              <Pressable
                onPress={() => {
                  setShowWebView(false);
                  setWebViewUrl("");
                }}
                style={{ marginRight: 16 }}
              >
                <Ionicons name="close" size={28} color={TWILIGHT.gold} />
              </Pressable>
              <Text style={{ color: TWILIGHT.gold, fontSize: 18, fontWeight: "600" }}>
                Download from cnvmp3.com
              </Text>
            </View>
            <WebView
              ref={webViewRef}
              source={{
                uri: webViewUrl,
                headers: {
                  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
                }
              }}
              style={{ flex: 1 }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
              onLoadEnd={() => {
                // Enhanced auto-fill and auto-submit with multiple retry attempts
                const fillFormScript = `
                  (function() {
                    console.log('[YTMP3] Script loaded, starting auto-fill');
                    let submitted = false;
                    let fillAttempts = 0;
                    const maxFillAttempts = 10;

                    function fillAndSubmit() {
                      if (submitted) {
                        console.log('[YTMP3] Already submitted, skipping');
                        return false;
                      }

                      fillAttempts++;
                      console.log('[YTMP3] Fill attempt', fillAttempts);

                      // Try multiple selectors for the input field
                      const urlInput = document.querySelector('input[type="text"]') ||
                                     document.querySelector('input[type="url"]') ||
                                     document.querySelector('input[placeholder*="URL"]') ||
                                     document.querySelector('input[placeholder*="url"]') ||
                                     document.querySelector('input[placeholder*="link"]') ||
                                     document.querySelector('input[name="url"]') ||
                                     document.querySelector('#url') ||
                                     document.querySelector('.url-input');

                      if (!urlInput) {
                        console.log('[YTMP3] No input field found yet');
                        return false;
                      }

                      console.log('[YTMP3] Found input field');

                      // Get the YouTube URL from the query parameter
                      const urlParams = new URLSearchParams(window.location.search);
                      const youtubeUrl = urlParams.get('url');

                      if (!youtubeUrl) {
                        console.log('[YTMP3] No URL in query params');
                        return false;
                      }

                      console.log('[YTMP3] YouTube URL from params:', youtubeUrl);

                      // Fill the input if it's empty or doesn't have a YouTube URL
                      if (!urlInput.value || !urlInput.value.includes('youtube')) {
                        console.log('[YTMP3] Filling input with URL');

                        // Multiple methods to set the value
                        urlInput.value = youtubeUrl;

                        try {
                          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                            window.HTMLInputElement.prototype,
                            'value'
                          ).set;
                          nativeInputValueSetter.call(urlInput, youtubeUrl);
                        } catch (e) {
                          console.log('[YTMP3] Native setter failed:', e);
                        }

                        // Trigger all possible events
                        urlInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                        urlInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                        urlInput.dispatchEvent(new Event('blur', { bubbles: true }));
                        urlInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
                        urlInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
                        urlInput.focus();

                        console.log('[YTMP3] Input filled, value is now:', urlInput.value);
                      }

                      // Check if input has a YouTube URL
                      if (urlInput.value && urlInput.value.includes('youtube')) {
                        console.log('[YTMP3] Input has YouTube URL, looking for submit button');

                        // Wait a bit for any JS to process the input
                        setTimeout(() => {
                          // Try multiple selectors for the submit button
                          let submitBtn = document.querySelector('button[type="submit"]') ||
                                        document.querySelector('button.convert') ||
                                        document.querySelector('.convert-btn') ||
                                        document.querySelector('input[type="submit"]') ||
                                        document.querySelector('button.btn-primary') ||
                                        document.querySelector('#convert-btn');

                          if (submitBtn) {
                            console.log('[YTMP3] Found submit button, clicking');
                            submitted = true;
                            submitBtn.click();
                            return true;
                          }

                          // Try to find any button with convert/download text
                          console.log('[YTMP3] No standard submit button, searching all buttons');
                          const buttons = document.querySelectorAll('button');
                          for (const btn of buttons) {
                            const btnText = (btn.innerText || btn.textContent || '').toLowerCase();
                            console.log('[YTMP3] Button text:', btnText);
                            if (btnText.includes('convert') || btnText.includes('download') ||
                                btnText.includes('mp3') || btnText.includes('start') ||
                                btnText.includes('go')) {
                              console.log('[YTMP3] Found matching button, clicking');
                              submitted = true;
                              btn.click();
                              return true;
                            }
                          }

                          console.log('[YTMP3] No submit button found');
                        }, 500);
                        return true;
                      }

                      return false;
                    }

                    // Initial attempt
                    console.log('[YTMP3] Starting initial fill attempt');
                    if (!fillAndSubmit()) {
                      console.log('[YTMP3] Initial attempt failed, setting up observer and retry');

                      // Set up mutation observer to detect when the form loads
                      const observer = new MutationObserver((mutations) => {
                        if (fillAttempts < maxFillAttempts && !submitted) {
                          fillAndSubmit();
                        }
                        if (submitted || fillAttempts >= maxFillAttempts) {
                          observer.disconnect();
                        }
                      });

                      observer.observe(document.body, {
                        childList: true,
                        subtree: true,
                        attributes: true
                      });

                      // Also retry on an interval
                      const retryInterval = setInterval(() => {
                        if (fillAttempts >= maxFillAttempts || submitted) {
                          clearInterval(retryInterval);
                          observer.disconnect();
                          return;
                        }
                        fillAndSubmit();
                      }, 800);

                      // Stop after 10 seconds
                      setTimeout(() => {
                        clearInterval(retryInterval);
                        observer.disconnect();
                        console.log('[YTMP3] Stopped auto-fill attempts');
                      }, 10000);
                    }
                  })();
                  true;
                `;
                webViewRef.current?.injectJavaScript(fillFormScript);
              }}
              onShouldStartLoadWithRequest={(request: any) => {
                const url = request.url;
                if (url === 'about:blank') {
                  return true;
                }
                const isYtmp3 = url.includes('cnvmp3.com');
                if (isYtmp3 && !url.includes('.mp3') && !url.includes('/~d/')) {
                  return true;
                }
                const isActualMP3 = url.includes('.mp3');
                const isCloudDownload = (url.includes('iotacloud') || url.includes('gammacloud')) &&
                                       url.includes('/download') &&
                                       (url.includes('f=mp3') || url.includes('.mp3'));
                const isDownloadEndpoint = url.includes('/~d/') && (url.includes('.mp3') || url.includes('f=mp3'));
                if (isActualMP3 || isCloudDownload || isDownloadEndpoint) {
                  if ((global as any).ytmp3Resolver) {
                    (global as any).ytmp3Resolver({
                      url: url,
                      title: ''
                    });
                  }
                  return false;
                }
                const adDomains = [
                  'gammacloud.net/~a/',
                  'wy903.com',
                  'underdogfantasy.com',
                  'underdog.app.link',
                  'apps.apple.com',
                  'play.google.com',
                  'ad.',
                  'ads.',
                  'tracker',
                  'analytics'
                ];
                const isAdDomain = adDomains.some(domain => url.includes(domain));
                if (isAdDomain) {
                  return false;
                }
                return false;
              }}
              injectedJavaScript={`
                (function() {
                  window.open = function() { return null; };
                  let foundUrl = false;
                  let autoSubmitted = false;
                  function checkAndSubmit() {
                    if (autoSubmitted) return;
                    const urlInput = document.querySelector('input[type="text"]') ||
                                   document.querySelector('input[placeholder*="URL"]') ||
                                   document.querySelector('input[name="url"]');
                    if (urlInput && urlInput.value && urlInput.value.includes('youtube')) {
                      const submitBtn = document.querySelector('button[type="submit"]') ||
                                      document.querySelector('button.convert') ||
                                      document.querySelector('.convert-btn') ||
                                      document.querySelector('input[type="submit"]');
                      if (submitBtn) {
                        autoSubmitted = true;
                        setTimeout(() => submitBtn.click(), 300);
                        return true;
                      } else {
                        const buttons = document.querySelectorAll('button');
                        for (const btn of buttons) {
                          const btnText = btn.innerText.toLowerCase();
                          if (btnText.includes('convert') || btnText.includes('download') || btnText.includes('mp3')) {
                            autoSubmitted = true;
                            setTimeout(() => btn.click(), 300);
                            return true;
                          }
                        }
                      }
                    }
                    return false;
                  }
                  const observer = new MutationObserver(() => {
                    if (!autoSubmitted) {
                      checkAndSubmit();
                    }
                  });
                  observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['value']
                  });
                  let attempts = 0;
                  const interval = setInterval(() => {
                    if (checkAndSubmit() || attempts++ > 10) {
                      clearInterval(interval);
                    }
                  }, 300);
                  function extractDownloadUrl() {
                    if (foundUrl) return null;
                    const allLinks = document.querySelectorAll('a[href]');
                    for (const link of allLinks) {
                      const href = link.getAttribute('href');
                      if (href && href.startsWith('http') && href.includes('.mp3')) {
                        return href;
                      }
                      if (href && href.startsWith('http') &&
                          (href.includes('iotacloud') || href.includes('gammacloud')) &&
                          (href.includes('.mp3') || href.includes('/download'))) {
                        return href;
                      }
                    }
                    const downloadBtn = document.querySelector('[data-url], [data-download-url], [data-href]');
                    if (downloadBtn) {
                      const dataUrl = downloadBtn.getAttribute('data-url') ||
                                     downloadBtn.getAttribute('data-download-url') ||
                                     downloadBtn.getAttribute('data-href');
                      if (dataUrl && dataUrl.startsWith('http') && dataUrl.includes('.mp3')) {
                        return dataUrl;
                      }
                    }
                    const inputs = document.querySelectorAll('input[value]');
                    for (const input of inputs) {
                      const val = input.value;
                      if (val && val.startsWith('http') && val.includes('.mp3')) {
                        return val;
                      }
                    }
                    const pageText = document.body.innerText;
                    const urlRegex = /(https?:\\/\\/[^\\s]+\\.mp3)/g;
                    const matches = pageText.match(urlRegex);
                    if (matches && matches.length > 0) {
                      return matches[0];
                    }
                    return null;
                  }
                  function getTitle() {
                    const titleEl = document.querySelector('.title, .video-title, h1, h2, [class*="title"]');
                    return titleEl ? titleEl.innerText.trim() : '';
                  }
                  const originalFetch = window.fetch;
                  window.fetch = function(...args) {
                    return originalFetch.apply(this, args).then(response => {
                      const clonedResponse = response.clone();
                      clonedResponse.json().then(data => {
                        if (data && data.url && !foundUrl) {
                          const url = data.url;
                          if (url.includes('.mp3') || url.includes('download') || url.includes('cloud')) {
                            foundUrl = true;
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                              type: 'download_ready',
                              url: url,
                              title: data.title || getTitle()
                            }));
                          }
                        }
                        if (data && data.data && data.data.url && !foundUrl) {
                          const url = data.data.url;
                          if (url.includes('.mp3') || url.includes('download') || url.includes('cloud')) {
                            foundUrl = true;
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                              type: 'download_ready',
                              url: url,
                              title: data.data.title || data.title || getTitle()
                            }));
                          }
                        }
                      }).catch(err => {});
                      return response;
                    });
                  };
                  const originalXHR = window.XMLHttpRequest.prototype.open;
                  window.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
                    this.addEventListener('load', function() {
                      if (this.responseText && !foundUrl) {
                        try {
                          const data = JSON.parse(this.responseText);
                          if (data && data.url) {
                            const downloadUrl = data.url;
                            if (downloadUrl.includes('.mp3') || downloadUrl.includes('download') || downloadUrl.includes('cloud')) {
                              foundUrl = true;
                              window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'download_ready',
                                url: downloadUrl,
                                title: data.title || getTitle()
                              }));
                            }
                          }
                        } catch (e) {}
                      }
                    });
                    return originalXHR.apply(this, [method, url, ...rest]);
                  };
                  let checkCount = 0;
                  const pollInterval = setInterval(() => {
                    if (foundUrl) {
                      clearInterval(pollInterval);
                      return;
                    }
                    checkCount++;
                    const url = extractDownloadUrl();
                    if (url) {
                      foundUrl = true;
                      clearInterval(pollInterval);
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'download_ready',
                        url: url,
                        title: getTitle()
                      }));
                    }
                    if (checkCount >= 240) {
                      clearInterval(pollInterval);
                    }
                  }, 500);
                })();
              `}
              onMessage={(event: any) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  if (data.type === "download_ready" && (global as any).ytmp3Resolver) {
                    const finalTitle = currentVideoTitleRef.current || data.title || `YouTube_${currentVideoIdRef.current}`;
                    (global as any).ytmp3Resolver({
                      url: data.url,
                      title: finalTitle
                    });
                  }
                } catch (e) {
                  console.log("WebView message error:", e);
                }
              }}
            />
          </View>
        </Modal>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

// Export the appropriate component based on platform
export function DownloadScreen() {
  if (isWeb) {
    return <DownloadScreenWeb />;
  }
  return <DownloadScreenNative />;
}
