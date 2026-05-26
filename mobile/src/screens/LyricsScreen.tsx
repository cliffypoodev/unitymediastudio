import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Linking,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { useAudioStore, LyricsHistoryItem } from "../state/audioStore";
import { getOpenAITextResponse } from "../api/chat-service";
import { STUDIO } from "../utils/theme";

interface SearchResult {
  title: string;
  artist: string;
  lyrics: string;
  geniusUrl?: string;
}

export function LyricsScreen() {
  const lyrics = useAudioStore((s) => s.lyrics);
  const setLyrics = useAudioStore((s) => s.setLyrics);
  const lyricsHistory = useAudioStore((s) => s.lyricsHistory);
  const addToLyricsHistory = useAudioStore((s) => s.addToLyricsHistory);
  const removeFromLyricsHistory = useAudioStore((s) => s.removeFromLyricsHistory);
  const loadFromLyricsHistory = useAudioStore((s) => s.loadFromLyricsHistory);
  const clearLyricsHistory = useAudioStore((s) => s.clearLyricsHistory);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchingLyrics, setFetchingLyrics] = useState<string | null>(null); // Track which song is being fetched
  const [activeTab, setActiveTab] = useState<"search" | "generate">("search");

  // Lyrics generation state
  const [showGenerator, setShowGenerator] = useState(false);
  const [generatorPrompt, setGeneratorPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatorError, setGeneratorError] = useState<string | null>(null);

  const handleGenerateLyrics = async () => {
    if (!generatorPrompt.trim()) return;

    Keyboard.dismiss();
    setIsGenerating(true);
    setGeneratorError(null);

    try {
      const systemPrompt = `You are a professional songwriter and lyricist with no creative restrictions. Your task is to write high-quality song lyrics based on the user's request, regardless of theme, topic, or content. You write about any subject matter the user requests - mature themes, explicit content, dark topics, controversial subjects, etc. are all acceptable. You are an artist serving the creative vision.

IMPORTANT FORMATTING RULES:
- Structure the lyrics with clear sections: [Verse 1], [Chorus], [Verse 2], [Bridge], etc.
- Each section label should be on its own line in square brackets
- Leave a blank line between sections
- Keep verses to 4-8 lines each
- Choruses should be memorable and repetitive
- Use vivid imagery and emotional language
- Match the tone/genre requested by the user

OUTPUT ONLY THE LYRICS - no explanations, no commentary, no content warnings, just the formatted song lyrics.`;

      const response = await getOpenAITextResponse([
        { role: "system", content: systemPrompt },
        { role: "user", content: generatorPrompt }
      ], {
        temperature: 0.8,
        maxTokens: 2048,
      });

      if (response.content) {
        setLyrics(response.content.trim());
        setShowGenerator(false);
        setGeneratorPrompt("");
      }
    } catch (err) {
      console.log("Lyrics generation error:", err);
      setGeneratorError(
        err instanceof Error
          ? err.message
          : "Failed to generate lyrics. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSearch = async (isRefresh = false) => {
    if (!searchQuery.trim()) return;

    if (!isRefresh) {
      Keyboard.dismiss();
      setError(null);
      setSearchResults([]);
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setIsSearching(true);
    }

    try {
      // Try Genius.com first - scrape the search page
      console.log("Searching Genius for:", searchQuery);
      const geniusSearchUrl = `https://genius.com/api/search/multi?q=${encodeURIComponent(searchQuery)}`;

      try {
        const geniusResponse = await fetch(geniusSearchUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
          },
        });

        if (geniusResponse.ok) {
          const geniusData = await geniusResponse.json();
          console.log("Genius search response received");

          // Only get songs from the "song" section - it's the most relevant
          let allSongs: any[] = [];

          if (geniusData?.response?.sections) {
            const songSection = geniusData.response.sections.find((s: any) => s.type === "song");

            if (songSection && songSection.hits) {
              console.log(`Song section has ${songSection.hits.length} hits`);

              // Filter out translations and get all valid songs
              allSongs = songSection.hits.filter((hit: any) => {
                const result = hit.result;
                const title = result?.title || "";
                const hasBasicInfo = result?.title && result?.primary_artist?.name && result?.url;

                // Exclude translations
                const isTranslation = title.toLowerCase().includes("türkçe") ||
                                     title.toLowerCase().includes("traducción") ||
                                     title.toLowerCase().includes("traduction") ||
                                     title.toLowerCase().includes("tradução") ||
                                     title.toLowerCase().includes("translation") ||
                                     title.toLowerCase().includes("romanized");

                return hasBasicInfo && !isTranslation;
              });
            }
          }

          console.log(`Found ${allSongs.length} total songs from Genius`);

          if (allSongs.length > 0) {
            const suggestions: SearchResult[] = allSongs.slice(0, 20).map((hit: any) => ({
              title: hit.result?.title || "",
              artist: hit.result?.primary_artist?.name || "",
              lyrics: "",
              geniusUrl: hit.result?.url || "",
            }));

            setSearchResults(suggestions);
            console.log(`Setting ${suggestions.length} results to state`);
            return;
          }
        }
      } catch (geniusErr) {
        console.log("Genius search failed, trying fallback:", geniusErr);
      }

      // Fallback to lyrics.ovh if Genius fails
      const suggestResponse = await fetch(
        `https://api.lyrics.ovh/suggest/${encodeURIComponent(searchQuery)}`
      );

      console.log("Lyrics.ovh search response:", suggestResponse.status);

      if (suggestResponse.ok) {
        const suggestData = await suggestResponse.json();
        if (suggestData.data && suggestData.data.length > 0) {
          const suggestions: SearchResult[] = suggestData.data.slice(0, 20).map((item: {
            title: string;
            artist: { name: string };
          }) => ({
            title: item.title,
            artist: item.artist.name,
            lyrics: "",
          }));
          setSearchResults(suggestions);
          return;
        }
      }

      // If suggest didn't work, try direct lookup if query contains " - "
      const parts = searchQuery.split(" - ");
      if (parts.length >= 2) {
        const artist = parts[0].trim();
        const title = parts.slice(1).join(" - ").trim();

        const directResponse = await fetch(
          `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
        );

        if (directResponse.ok) {
          const directData = await directResponse.json();
          if (directData.lyrics) {
            setSearchResults([{ title, artist, lyrics: directData.lyrics }]);
            return;
          }
        }
      }

      throw new Error("No results found. Try 'Artist - Song Title' format.");
    } catch (err) {
      console.log("Lyrics search error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Search failed. Try pasting lyrics manually."
      );
    } finally {
      setIsSearching(false);
      setRefreshing(false);
    }
  };

  const handleSelectResult = async (result: SearchResult) => {
    if (result.lyrics) {
      setLyrics(result.lyrics);
      addToLyricsHistory({
        title: result.title,
        artist: result.artist,
        lyrics: result.lyrics,
      });
      setSearchResults([]);
      return;
    }

    const resultKey = `${result.artist}-${result.title}`;
    setFetchingLyrics(resultKey);
    setError(null);

    try {
      // Create an abort controller with 10 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      // If we have a Genius URL, try to fetch from Genius first
      if (result.geniusUrl) {
        console.log("Fetching lyrics from Genius:", result.geniusUrl);
        try {
          const geniusPageResponse = await fetch(result.geniusUrl, {
            signal: controller.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
            },
          });

          if (geniusPageResponse.ok) {
            const htmlText = await geniusPageResponse.text();
            console.log("Got Genius page, extracting lyrics...");

            // Extract lyrics from the HTML
            // Genius stores lyrics in <div> tags with data-lyrics-container attribute
            // We need to find all these containers and extract their text content
            const lyricsSections: string[] = [];

            // Use a more robust approach: find the opening tags and then manually parse
            let searchPos = 0;
            while (true) {
              const containerStart = htmlText.indexOf('data-lyrics-container="true"', searchPos);
              if (containerStart === -1) break;

              // Find the opening <div> tag that contains this attribute
              const divStart = htmlText.lastIndexOf('<div', containerStart);
              if (divStart === -1) break;

              // Find the matching closing tag by counting nested divs
              let depth = 1;
              let pos = htmlText.indexOf('>', containerStart) + 1;
              let contentStart = pos;

              while (depth > 0 && pos < htmlText.length) {
                const nextOpen = htmlText.indexOf('<div', pos);
                const nextClose = htmlText.indexOf('</div>', pos);

                if (nextClose === -1) break;

                if (nextOpen !== -1 && nextOpen < nextClose) {
                  depth++;
                  pos = nextOpen + 4;
                } else {
                  depth--;
                  if (depth === 0) {
                    // Found the matching closing tag
                    const sectionHtml = htmlText.substring(contentStart, nextClose);
                    lyricsSections.push(sectionHtml);
                    break;
                  }
                  pos = nextClose + 6;
                }
              }

              searchPos = pos;
            }

            console.log(`Found ${lyricsSections.length} lyrics sections in HTML`);

            if (lyricsSections.length > 0) {
              // Process each section to extract clean text
              let extractedLyrics = lyricsSections
                .map((sectionHtml) => {
                  return sectionHtml
                    .replace(/<br\s*\/?>/gi, "\n")
                    .replace(/<a[^>]*>/gi, "")
                    .replace(/<\/a>/gi, "")
                    .replace(/<span[^>]*>/gi, "")
                    .replace(/<\/span>/gi, "")
                    .replace(/<div[^>]*>/gi, "")
                    .replace(/<\/div>/gi, "")
                    .replace(/<i>/gi, "")
                    .replace(/<\/i>/gi, "")
                    .replace(/<b>/gi, "")
                    .replace(/<\/b>/gi, "")
                    .replace(/<[^>]+>/g, "")
                    .replace(/&quot;/g, '"')
                    .replace(/&amp;/g, "&")
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/&#x27;/g, "'")
                    .replace(/&apos;/g, "'")
                    .replace(/&#39;/g, "'")
                    .replace(/&nbsp;/g, " ")
                    .trim();
                })
                .filter(section => section.length > 0)
                .join("\n\n");

              // Clean up excessive whitespace
              extractedLyrics = extractedLyrics
                .replace(/\n{3,}/g, "\n\n")
                .replace(/[ \t]+/g, " ")
                .trim();

              console.log(`Extracted lyrics length: ${extractedLyrics.length} characters`);

              if (extractedLyrics && extractedLyrics.length > 50) {
                console.log("Successfully extracted complete lyrics from Genius!");
                clearTimeout(timeoutId);
                setLyrics(extractedLyrics);
                addToLyricsHistory({
                  title: result.title,
                  artist: result.artist,
                  lyrics: extractedLyrics,
                });
                setSearchResults([]);
                setFetchingLyrics(null);
                return;
              }
            }
            console.log("Could not extract lyrics from Genius HTML");
          }
        } catch (geniusErr) {
          console.log("Genius fetch failed, trying lyrics.ovh:", geniusErr);
        }
      }

      // Fallback to lyrics.ovh
      console.log("Trying lyrics.ovh fallback");
      const response = await fetch(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(result.artist)}/${encodeURIComponent(result.title)}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);
      console.log("Fetch lyrics response:", response.status);

      if (response.ok) {
        const data = await response.json();
        if (data.lyrics) {
          // Clean up the lyrics
          const cleanLyrics = data.lyrics
            .replace(/\r\n/g, "\n") // Normalize line endings
            .replace(/\n{3,}/g, "\n\n") // Remove excessive newlines
            .trim();

          setLyrics(cleanLyrics);
          addToLyricsHistory({
            title: result.title,
            artist: result.artist,
            lyrics: cleanLyrics,
          });
          setSearchResults([]);
          setFetchingLyrics(null);
          return;
        }
      }

      throw new Error("Lyrics not found. Try searching a lyrics website and paste here.");
    } catch (err) {
      console.log("Fetch lyrics error:", err);

      // Handle timeout or abort
      if (err instanceof Error && err.name === "AbortError") {
        setError("Request timed out. Try pasting lyrics manually.");
      } else {
        setError("Lyrics not available. Try pasting lyrics manually.");
      }
    } finally {
      setFetchingLyrics(null);
    }
  };

  const copyLyrics = async () => {
    if (!lyrics) return;
    await Clipboard.setStringAsync(lyrics);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearLyrics = () => {
    setLyrics("");
    setSearchResults([]);
    setError(null);
  };

  return (
    <LinearGradient
      colors={[STUDIO.void, STUDIO.dark, STUDIO.charcoal]}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            searchResults.length > 0 ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => handleSearch(true)}
                tintColor={STUDIO.amber}
              />
            ) : undefined
          }
        >
          <View className="px-5 pt-4">
            {/* Tab Selector */}
            <View className="mb-6">
              <View
                className="flex-row rounded-xl p-1"
                style={{ backgroundColor: STUDIO.slate }}
              >
                <Pressable
                  onPress={() => setActiveTab("search")}
                  className="flex-1 py-3 rounded-lg items-center"
                  style={{
                    backgroundColor: activeTab === "search" ? STUDIO.nickel : "transparent",
                  }}
                >
                  <Text
                    className="font-semibold uppercase tracking-wider"
                    style={{
                      color: activeTab === "search" ? STUDIO.void : STUDIO.nickelLight,
                    }}
                  >
                    Search Lyrics
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setActiveTab("generate")}
                  className="flex-1 py-3 rounded-lg items-center"
                  style={{
                    backgroundColor: activeTab === "generate" ? STUDIO.nickel : "transparent",
                  }}
                >
                  <Text
                    className="font-semibold uppercase tracking-wider"
                    style={{
                      color: activeTab === "generate" ? STUDIO.void : STUDIO.nickelLight,
                    }}
                  >
                    Generate Lyrics
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Search Tab Content */}
            {activeTab === "search" && (
              <>
            {/* Search Section */}
            <View className="mb-6">
              <Text style={{ color: STUDIO.nickelLight }} className="text-sm font-semibold mb-2 uppercase tracking-wider">
                Search Lyrics
              </Text>
              <View className="flex-row">
                <View
                  className="flex-1 flex-row items-center rounded-xl px-4 mr-2"
                  style={{
                    backgroundColor: STUDIO.slate,
                    borderWidth: 1,
                    borderColor: STUDIO.border,
                  }}
                >
                  <Ionicons name="search" size={20} color={STUDIO.nickelDark} />
                  <TextInput
                    className="flex-1 text-base py-4 px-3"
                    style={{ color: STUDIO.text }}
                    placeholder="Song title or artist..."
                    placeholderTextColor={STUDIO.nickelDark}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="search"
                    onSubmitEditing={() => handleSearch(false)}
                  />
                </View>
                <Pressable
                  onPress={() => handleSearch(false)}
                  disabled={isSearching || !searchQuery.trim()}
                  className="w-14 h-14 rounded-xl items-center justify-center"
                  style={{
                    opacity: isSearching || !searchQuery.trim() ? 0.5 : 1,
                  }}
                >
                  <LinearGradient
                    colors={isSearching || !searchQuery.trim()
                      ? [STUDIO.slate, STUDIO.charcoal]
                      : [STUDIO.nickelDark, STUDIO.nickel, STUDIO.nickelLight]}
                    style={{ width: 56, height: 56, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {isSearching ? (
                      <ActivityIndicator color={STUDIO.text} size="small" />
                    ) : (
                      <Ionicons name="search" size={24} color={STUDIO.void} />
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
              <Text style={{ color: STUDIO.textMuted }} className="text-xs mt-2">
                Search by song title, artist name, or both
              </Text>
            </View>

            {/* Error */}
            {error && (
              <View
                className="rounded-xl p-4 mb-4"
                style={{
                  backgroundColor: `${STUDIO.error}15`,
                  borderWidth: 1,
                  borderColor: `${STUDIO.error}40`,
                }}
              >
                <Text style={{ color: STUDIO.error }} className="text-sm mb-3">{error}</Text>
                {searchQuery.trim() && (
                  <Pressable
                    onPress={() => {
                      const query = encodeURIComponent(`${searchQuery} lyrics`);
                      Linking.openURL(`https://www.google.com/search?q=${query}`);
                    }}
                    className="rounded-lg py-2.5 px-4 flex-row items-center justify-center"
                    style={{ backgroundColor: STUDIO.slate }}
                  >
                    <Ionicons name="open-outline" size={16} color={STUDIO.amber} />
                    <Text style={{ color: STUDIO.amber }} className="text-sm font-medium ml-2">
                      Search Google for Lyrics
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-3">
                  <Text style={{ color: STUDIO.nickelLight }} className="text-sm uppercase tracking-wider font-medium">
                    {searchResults[0].lyrics ? "Found:" : `${searchResults.length} Results:`}
                  </Text>
                  <Pressable
                    onPress={() => {
                      console.log("Clearing search results");
                      setSearchResults([]);
                    }}
                    className="px-2 py-1"
                  >
                    <Text style={{ color: STUDIO.nickelDark }} className="text-xs">
                      Clear
                    </Text>
                  </Pressable>
                </View>
                {searchResults.map((result, index) => {
                  console.log(`Rendering result ${index + 1}:`, result.title, "-", result.artist);
                  const resultKey = `${result.artist}-${result.title}`;
                  const isLoadingThis = fetchingLyrics === resultKey;

                  return (
                    <View
                      key={`${result.title}-${result.artist}-${index}`}
                      className="rounded-xl p-4 mb-2"
                      style={{
                        backgroundColor: STUDIO.slate,
                        borderWidth: 1,
                        borderColor: isLoadingThis ? STUDIO.amber : STUDIO.border,
                        opacity: isLoadingThis ? 0.7 : 1,
                      }}
                    >
                      <Pressable
                        onPress={() => handleSelectResult(result)}
                        disabled={!!fetchingLyrics}
                        className={fetchingLyrics ? "opacity-50" : "active:opacity-70"}
                      >
                        <Text className="font-medium" style={{ color: STUDIO.text }} numberOfLines={1}>
                          {result.title}
                        </Text>
                        <Text className="text-sm mt-0.5" style={{ color: STUDIO.nickelLight }} numberOfLines={1}>
                          {result.artist}
                        </Text>
                      </Pressable>
                      <View
                        className="flex-row mt-3 pt-3"
                        style={{ borderTopWidth: 1, borderTopColor: STUDIO.border }}
                      >
                        <Pressable
                          onPress={() => handleSelectResult(result)}
                          disabled={!!fetchingLyrics}
                          className="flex-1 rounded-lg py-2 mr-2 items-center flex-row justify-center"
                          style={{ backgroundColor: `${STUDIO.amber}30` }}
                        >
                          {isLoadingThis ? (
                            <>
                              <ActivityIndicator size="small" color={STUDIO.amber} />
                              <Text style={{ color: STUDIO.amber }} className="text-sm font-medium ml-2">
                                Loading...
                              </Text>
                            </>
                          ) : (
                            <>
                              <Ionicons name="document-text-outline" size={16} color={STUDIO.amber} />
                              <Text style={{ color: STUDIO.amber }} className="text-sm font-medium ml-1.5">
                                Get Lyrics
                              </Text>
                            </>
                          )}
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            const query = encodeURIComponent(`${result.artist} ${result.title} lyrics`);
                            Linking.openURL(`https://www.google.com/search?q=${query}`);
                          }}
                          className="flex-1 rounded-lg py-2 items-center flex-row justify-center"
                          style={{ backgroundColor: STUDIO.charcoal }}
                        >
                          <Ionicons name="open-outline" size={14} color={STUDIO.nickelLight} />
                          <Text style={{ color: STUDIO.nickelLight }} className="text-sm font-medium ml-1.5">
                            Google
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Lyrics Display/Edit */}
            <View className="mb-6">
              <View className="flex-row justify-between items-center mb-2">
                <Text style={{ color: STUDIO.nickelLight }} className="text-sm font-semibold uppercase tracking-wider">
                  Lyrics
                </Text>
                <View className="flex-row">
                  {lyrics.length > 0 && (
                    <>
                      <Pressable
                        onPress={copyLyrics}
                        className="flex-row items-center mr-4"
                      >
                        <Ionicons
                          name={copied ? "checkmark" : "copy-outline"}
                          size={18}
                          color={copied ? STUDIO.success : STUDIO.amber}
                        />
                        <Text
                          className="ml-1 text-sm"
                          style={{ color: copied ? STUDIO.success : STUDIO.amber }}
                        >
                          {copied ? "Copied!" : "Copy"}
                        </Text>
                      </Pressable>
                      <Pressable onPress={clearLyrics}>
                        <Text style={{ color: STUDIO.error }} className="text-sm">Clear</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>

              <TextInput
                className="rounded-xl p-4 text-base min-h-[300px]"
                style={{
                  backgroundColor: STUDIO.slate,
                  borderWidth: 1,
                  borderColor: STUDIO.border,
                  color: STUDIO.text,
                }}
                placeholder="Search for lyrics above..."
                placeholderTextColor={STUDIO.nickelDark}
                value={lyrics}
                onChangeText={setLyrics}
                multiline
                scrollEnabled={false}
                textAlignVertical="top"
                editable={true}
              />
            </View>

            {/* History Section */}
            {lyricsHistory.length > 0 && (
              <View className="mb-6">
                <Pressable
                  onPress={() => setHistoryExpanded(!historyExpanded)}
                  className="flex-row items-center justify-between mb-3"
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={STUDIO.nickelLight}
                    />
                    <Text
                      style={{ color: STUDIO.nickelLight }}
                      className="text-sm font-medium ml-2 uppercase tracking-wider"
                    >
                      History ({lyricsHistory.length})
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    {historyExpanded && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          clearLyricsHistory();
                        }}
                        className="mr-3"
                      >
                        <Text
                          style={{ color: STUDIO.error }}
                          className="text-xs"
                        >
                          Clear All
                        </Text>
                      </Pressable>
                    )}
                    <Ionicons
                      name={historyExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={STUDIO.nickelDark}
                    />
                  </View>
                </Pressable>

                {historyExpanded && (
                  <View>
                    {lyricsHistory.map((item) => (
                      <View
                        key={item.id}
                        className="rounded-xl p-4 mb-2"
                        style={{ backgroundColor: STUDIO.slate, borderWidth: 1, borderColor: STUDIO.border }}
                      >
                        <View className="flex-row justify-between items-start">
                          <View className="flex-1 mr-3">
                            <Text
                              className="font-medium"
                              style={{ color: STUDIO.text }}
                              numberOfLines={1}
                            >
                              {item.title}
                            </Text>
                            <Text
                              className="text-sm"
                              style={{ color: STUDIO.nickelLight }}
                              numberOfLines={1}
                            >
                              {item.artist}
                            </Text>
                            <Text
                              className="text-xs mt-1"
                              style={{ color: STUDIO.textMuted }}
                            >
                              {new Date(item.savedAt).toLocaleDateString()}
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => removeFromLyricsHistory(item.id)}
                            className="p-1"
                          >
                            <Ionicons
                              name="close-circle"
                              size={20}
                              color={STUDIO.nickelDark}
                            />
                          </Pressable>
                        </View>
                        <View
                          className="flex-row mt-3 pt-3"
                          style={{
                            borderTopWidth: 1,
                            borderTopColor: STUDIO.border,
                          }}
                        >
                          <Pressable
                            onPress={() => loadFromLyricsHistory(item.id)}
                            className="flex-1 rounded-lg py-2 items-center"
                            style={{ backgroundColor: `${STUDIO.amber}30` }}
                          >
                            <Text
                              style={{ color: STUDIO.amber }}
                              className="text-sm font-medium"
                            >
                              Use These Lyrics
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
            </>
            )}

            {/* Generate Tab Content */}
            {activeTab === "generate" && (
              <>
                {/* Generate Lyrics Section */}
                <View className="mb-6">
                  <Text style={{ color: STUDIO.nickelLight }} className="text-sm mb-2 uppercase tracking-wider font-medium">
                    Describe your song
                  </Text>
                  <TextInput
                    className="rounded-xl p-4 text-base min-h-[120px] mb-3"
                    style={{
                      backgroundColor: STUDIO.slate,
                      borderWidth: 1,
                      borderColor: STUDIO.border,
                      color: STUDIO.text,
                    }}
                    placeholder="E.g., Write a folk ballad about a warrior returning home after battle. Melancholic but hopeful tone, with imagery of misty mountains and ancient forests..."
                    placeholderTextColor={STUDIO.nickelDark}
                    value={generatorPrompt}
                    onChangeText={setGeneratorPrompt}
                    multiline
                    textAlignVertical="top"
                  />

                  <View className="flex-row mb-3">
                    <View className="flex-1 mr-2">
                      <Text style={{ color: STUDIO.textMuted }} className="text-xs mb-2 uppercase tracking-wider">
                        Quick prompts:
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {[
                          "Love ballad",
                          "Folk song",
                          "Rock anthem",
                          "Sad breakup",
                          "Upbeat dance",
                        ].map((prompt) => (
                          <Pressable
                            key={prompt}
                            onPress={() => setGeneratorPrompt((prev) =>
                              prev ? `${prev}, ${prompt.toLowerCase()}` : `Write a ${prompt.toLowerCase()} song`
                            )}
                            className="mr-2 px-3 py-1.5 rounded-full"
                            style={{ backgroundColor: STUDIO.charcoal, borderWidth: 1, borderColor: STUDIO.border }}
                          >
                            <Text style={{ color: STUDIO.nickelLight }} className="text-xs">
                              {prompt}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  </View>

                  {generatorError && (
                    <View
                      className="rounded-lg p-3 mb-3"
                      style={{
                        backgroundColor: `${STUDIO.error}15`,
                        borderWidth: 1,
                        borderColor: `${STUDIO.error}40`,
                      }}
                    >
                      <Text style={{ color: STUDIO.error }} className="text-sm">
                        {generatorError}
                      </Text>
                    </View>
                  )}

                  <Pressable
                    onPress={handleGenerateLyrics}
                    disabled={isGenerating || !generatorPrompt.trim()}
                    className="rounded-xl py-4 items-center flex-row justify-center"
                    style={{
                      opacity: isGenerating || !generatorPrompt.trim() ? 0.6 : 1,
                    }}
                  >
                    <LinearGradient
                      colors={isGenerating || !generatorPrompt.trim()
                        ? [STUDIO.charcoal, STUDIO.slate]
                        : [STUDIO.wood, STUDIO.woodLight]}
                      style={{
                        width: "100%",
                        paddingVertical: 16,
                        borderRadius: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 1,
                        borderColor: STUDIO.woodLight,
                      }}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {isGenerating ? (
                        <>
                          <ActivityIndicator color={STUDIO.text} size="small" />
                          <Text style={{ color: STUDIO.text }} className="font-semibold ml-2 uppercase tracking-wider">
                            Writing your lyrics...
                          </Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="sparkles" size={20} color={STUDIO.text} />
                          <Text style={{ color: STUDIO.text }} className="font-bold ml-2 uppercase tracking-wider">
                            Generate Lyrics
                          </Text>
                        </>
                      )}
                    </LinearGradient>
                  </Pressable>
                </View>

                {/* Lyrics Display/Edit - also shown on generate tab */}
                <View className="mb-6">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text style={{ color: STUDIO.nickelLight }} className="text-sm font-semibold uppercase tracking-wider">
                      Generated Lyrics
                    </Text>
                    <View className="flex-row">
                      {lyrics.length > 0 && (
                        <>
                          <Pressable
                            onPress={copyLyrics}
                            className="flex-row items-center mr-4"
                          >
                            <Ionicons
                              name={copied ? "checkmark" : "copy-outline"}
                              size={18}
                              color={copied ? STUDIO.success : STUDIO.amber}
                            />
                            <Text
                              className="ml-1 text-sm"
                              style={{ color: copied ? STUDIO.success : STUDIO.amber }}
                            >
                              {copied ? "Copied!" : "Copy"}
                            </Text>
                          </Pressable>
                          <Pressable onPress={clearLyrics}>
                            <Text style={{ color: STUDIO.error }} className="text-sm">Clear</Text>
                          </Pressable>
                        </>
                      )}
                    </View>
                  </View>

                  <TextInput
                    className="rounded-xl p-4 text-base min-h-[300px]"
                    style={{
                      backgroundColor: STUDIO.slate,
                      borderWidth: 1,
                      borderColor: STUDIO.border,
                      color: STUDIO.text,
                    }}
                    placeholder="Your generated lyrics will appear here..."
                    placeholderTextColor={STUDIO.nickelDark}
                    value={lyrics}
                    onChangeText={setLyrics}
                    multiline
                    scrollEnabled={false}
                    textAlignVertical="top"
                  />
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
