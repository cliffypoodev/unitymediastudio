import React, { useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SlimNavBar } from "../components/SlimNavBar";
import { STUDIO } from "../utils/theme";
import { useFocusEffect } from "@react-navigation/native";

const isWeb = Platform.OS === "web";

type WritingHubNavigationProp = NativeStackNavigationProp<any>;

interface Props {
  navigation: WritingHubNavigationProp;
}

interface WritingTile {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
  webView?: {
    url: string;
    title: string;
  };
  gradientColors: string[];
}

const writingTiles: WritingTile[] = [
  {
    id: "book",
    title: "Book Assistant",
    subtitle: "Scholarly AI writing companion",
    icon: "book",
    route: "BookAssistant",
    gradientColors: [STUDIO.swirlBlue, STUDIO.swirlCyan],
  },
  {
    id: "notes",
    title: "Notes",
    subtitle: "Quick notes with tags and search",
    icon: "document-text",
    route: "Notes",
    gradientColors: [STUDIO.swirlPink, STUDIO.swirlOrange],
  },
  {
    id: "googledocs",
    title: "Google Docs",
    subtitle: "Create and edit documents online",
    icon: "document",
    webView: {
      url: "https://docs.google.com/",
      title: "Google Docs",
    },
    gradientColors: [STUDIO.swirlCyan, STUDIO.swirlBlue],
  },
];

export function WritingScreen({ navigation }: Props) {
  const [activeWebView, setActiveWebView] = useState<WritingTile["webView"] | null>(null);
  const webViewRef = useRef<any>(null);
  const [isWebViewLoading, setIsWebViewLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Reset view when navigating back to this screen
  useFocusEffect(
    React.useCallback(() => {
      setActiveWebView(null);
      setZoomLevel(1);
    }, [])
  );

  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
  };

  const handleGoBack = () => {
    if (isWeb) {
      const iframe = document.getElementById("writing-iframe") as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        iframe.contentWindow.history.back();
      }
    } else {
      webViewRef.current?.goBack();
    }
  };

  const handleGoForward = () => {
    if (isWeb) {
      const iframe = document.getElementById("writing-iframe") as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        iframe.contentWindow.history.forward();
      }
    } else {
      webViewRef.current?.goForward();
    }
  };

  const handleRefresh = () => {
    if (isWeb) {
      const iframe = document.getElementById("writing-iframe") as HTMLIFrameElement;
      if (iframe) {
        iframe.src = iframe.src;
      }
    } else {
      webViewRef.current?.reload();
    }
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoomLevel + 0.2, 2);
    setZoomLevel(newZoom);
    if (isWeb) {
      const iframe = document.getElementById("writing-iframe") as HTMLIFrameElement;
      if (iframe?.contentDocument?.body) {
        iframe.contentDocument.body.style.zoom = `${newZoom}`;
      }
    } else if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        document.body.style.zoom = "${newZoom}";
        true;
      `);
    }
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoomLevel - 0.1, 0.1);
    setZoomLevel(newZoom);
    if (isWeb) {
      const iframe = document.getElementById("writing-iframe") as HTMLIFrameElement;
      if (iframe?.contentDocument?.body) {
        iframe.contentDocument.body.style.zoom = `${newZoom}`;
      }
    } else if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        document.body.style.zoom = "${newZoom}";
        true;
      `);
    }
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    if (isWeb) {
      const iframe = document.getElementById("writing-iframe") as HTMLIFrameElement;
      if (iframe?.contentDocument?.body) {
        iframe.contentDocument.body.style.zoom = "1";
      }
    } else if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        document.body.style.zoom = "1";
        true;
      `);
    }
  };

  const handleTilePress = (tile: WritingTile) => {
    if (tile.route) {
      navigation.navigate(tile.route);
    } else if (tile.webView) {
      setActiveWebView(tile.webView);
    }
  };

  const renderTile = (tile: WritingTile) => (
    <Pressable key={tile.id} onPress={() => handleTilePress(tile)} className="mb-4">
      {({ pressed }) => (
        <LinearGradient
          colors={tile.gradientColors as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 16,
            padding: 20,
            opacity: pressed ? 0.8 : 1,
          }}
        >
          <View className="flex-row items-center">
            <View
              className="w-14 h-14 rounded-full items-center justify-center mr-4"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
            >
              <Ionicons name={tile.icon} size={28} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-xl font-bold mb-1">{tile.title}</Text>
              <Text className="text-white/80 text-sm">{tile.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
          </View>
        </LinearGradient>
      )}
    </Pressable>
  );

  // If a webview is active, show it
  if (activeWebView) {
    // Web version using iframe
    if (isWeb) {
      return (
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: STUDIO.void }}>
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: STUDIO.dark,
                borderBottomWidth: 1,
                borderBottomColor: STUDIO.border,
              }}
            >
              <Pressable onPress={() => setActiveWebView(null)} className="mr-3">
                {({ pressed }) => (
                  <View
                    className="w-8 h-8 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: pressed ? STUDIO.slate : STUDIO.charcoal,
                    }}
                  >
                    <Ionicons name="arrow-back" size={20} color={STUDIO.text} />
                  </View>
                )}
              </Pressable>
              <Text className="text-lg font-bold flex-1" style={{ color: STUDIO.text }}>
                {activeWebView.title}
              </Text>
            </View>

            {/* Loading indicator */}
            {isWebViewLoading && (
              <View
                className="absolute left-0 right-0 z-20 h-1"
                style={{ top: 52, backgroundColor: STUDIO.amber }}
              >
                <LinearGradient
                  colors={[STUDIO.amber, STUDIO.woodLight] as any}
                  style={{ height: "100%", width: "50%" }}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
            )}

            {/* Iframe for web */}
            <View style={{ flex: 1 }}>
              <iframe
                id="writing-iframe"
                src={activeWebView.url}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  backgroundColor: STUDIO.void,
                }}
                onLoad={() => setIsWebViewLoading(false)}
                allow="autoplay; microphone; camera"
              />
            </View>

            {/* Slim Navigation Bar */}
            <SlimNavBar
              canGoBack={canGoBack}
              canGoForward={canGoForward}
              onGoBack={handleGoBack}
              onGoForward={handleGoForward}
              onStop={() => {}}
              onRefresh={handleRefresh}
              extraButtons={[
                { icon: "remove-circle-outline", onPress: handleZoomOut, label: "Zoom Out" },
                { icon: "refresh-circle-outline", onPress: handleResetZoom, label: "Reset Zoom" },
                { icon: "add-circle-outline", onPress: handleZoomIn, label: "Zoom In" },
              ]}
            />
          </View>
        </GestureHandlerRootView>
      );
    }

    // Native version using WebView
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { WebView } = require("react-native-webview");

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: STUDIO.void }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: STUDIO.dark,
              borderBottomWidth: 1,
              borderBottomColor: STUDIO.border,
            }}
          >
            <Pressable onPress={() => setActiveWebView(null)} className="mr-3">
              {({ pressed }) => (
                <View
                  className="w-8 h-8 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: pressed ? STUDIO.slate : STUDIO.charcoal,
                  }}
                >
                  <Ionicons name="arrow-back" size={20} color={STUDIO.text} />
                </View>
              )}
            </Pressable>
            <Text className="text-lg font-bold flex-1" style={{ color: STUDIO.text }}>
              {activeWebView.title}
            </Text>
          </View>

          {/* Loading indicator */}
          {isWebViewLoading && (
            <View
              className="absolute left-0 right-0 z-20 h-1"
              style={{ top: 52, backgroundColor: STUDIO.amber }}
            >
              <LinearGradient
                colors={[STUDIO.amber, STUDIO.woodLight] as any}
                style={{ height: "100%", width: "50%" }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
          )}

          {/* WebView Container - takes remaining space */}
          <View style={{ flex: 1 }}>
            <WebView
              ref={webViewRef}
              source={{ uri: activeWebView.url }}
              style={{ flex: 1, backgroundColor: STUDIO.void }}
              onLoadStart={() => setIsWebViewLoading(true)}
              onLoadEnd={() => setIsWebViewLoading(false)}
              onNavigationStateChange={handleNavigationStateChange}
              userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
              sharedCookiesEnabled={true}
              thirdPartyCookiesEnabled={true}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              mixedContentMode="always"
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              allowsBackForwardNavigationGestures={true}
              startInLoadingState={true}
              injectedJavaScript={`
                // Force desktop viewport
                var meta = document.querySelector('meta[name="viewport"]');
                if (meta) {
                  meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
                } else {
                  meta = document.createElement('meta');
                  meta.name = 'viewport';
                  meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes';
                  document.head.appendChild(meta);
                }

                // Override screen size detection to report desktop
                Object.defineProperty(window, 'innerWidth', { value: 1440, writable: true });
                Object.defineProperty(window, 'innerHeight', { value: 900, writable: true });
                Object.defineProperty(screen, 'width', { value: 1440, writable: true });
                Object.defineProperty(screen, 'height', { value: 900, writable: true });
                Object.defineProperty(screen, 'availWidth', { value: 1440, writable: true });
                Object.defineProperty(screen, 'availHeight', { value: 900, writable: true });

                // Disable mobile detection via matchMedia
                window.matchMedia = function(query) {
                  return {
                    matches: query.includes('min-width') || !query.includes('max-width'),
                    media: query,
                    onchange: null,
                    addListener: function() {},
                    removeListener: function() {},
                    addEventListener: function() {},
                    removeEventListener: function() {},
                    dispatchEvent: function() { return true; }
                  };
                };

                // Inject mobile-optimized CSS
                var style = document.createElement('style');
                style.innerHTML = \`
                  /* Hide unnecessary desktop elements */
                  [class*="sidebar"]:not([class*="editor"]) { display: none !important; }
                  [class*="nav"]:not([class*="main"]) { min-width: unset !important; }

                  /* Make main content full width */
                  [class*="container"],
                  [class*="wrapper"],
                  [class*="main"] {
                    max-width: 100% !important;
                    width: 100% !important;
                    padding: 8px !important;
                    margin: 0 !important;
                  }

                  /* Optimize editor area */
                  [class*="editor"],
                  [contenteditable="true"],
                  textarea {
                    max-width: 100% !important;
                    width: 100% !important;
                    padding: 12px !important;
                    font-size: 16px !important;
                    line-height: 1.6 !important;
                  }

                  /* Hide non-essential toolbars on mobile */
                  [class*="toolbar"] [class*="secondary"] { display: none !important; }

                  /* Optimize buttons for touch */
                  button, [role="button"] {
                    min-height: 44px !important;
                    padding: 8px 12px !important;
                    font-size: 14px !important;
                  }

                  /* Simplify navigation */
                  nav {
                    flex-wrap: wrap !important;
                    gap: 8px !important;
                  }

                  /* Hide promotional banners */
                  [class*="banner"],
                  [class*="promo"],
                  [class*="upgrade"] {
                    display: none !important;
                  }

                  /* Optimize modals/dialogs */
                  [role="dialog"],
                  [class*="modal"] {
                    max-width: 95vw !important;
                    margin: 8px auto !important;
                  }

                  /* Make sure text is readable */
                  * {
                    -webkit-text-size-adjust: 100% !important;
                  }

                  /* Hide left sidebar/panel */
                  aside,
                  [class*="left-panel"],
                  [class*="left-sidebar"] {
                    display: none !important;
                  }

                  /* Full width for writing area */
                  main,
                  [role="main"],
                  [class*="content"] {
                    margin-left: 0 !important;
                    width: 100% !important;
                  }
                \`;
                document.head.appendChild(style);

                // Trigger resize event
                window.dispatchEvent(new Event('resize'));

                // Reapply CSS after DOM changes
                setTimeout(function() {
                  document.head.appendChild(style.cloneNode(true));
                }, 1000);

                true;
              `}
              injectedJavaScriptBeforeContentLoaded={`
                // Override screen properties before page loads
                Object.defineProperty(window, 'innerWidth', { value: 1440, writable: true, configurable: true });
                Object.defineProperty(window, 'innerHeight', { value: 900, writable: true, configurable: true });
                Object.defineProperty(screen, 'width', { value: 1440, writable: true, configurable: true });
                Object.defineProperty(screen, 'height', { value: 900, writable: true, configurable: true });
                Object.defineProperty(screen, 'availWidth', { value: 1440, writable: true, configurable: true });
                Object.defineProperty(screen, 'availHeight', { value: 900, writable: true, configurable: true });

                // Override matchMedia before page uses it
                window.matchMedia = function(query) {
                  return {
                    matches: query.includes('min-width') || !query.includes('max-width'),
                    media: query,
                    onchange: null,
                    addListener: function() {},
                    removeListener: function() {},
                    addEventListener: function() {},
                    removeEventListener: function() {},
                    dispatchEvent: function() { return true; }
                  };
                };
                true;
              `}
            />
          </View>

          {/* Slim Navigation Bar */}
          <SlimNavBar
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            onGoBack={handleGoBack}
            onGoForward={handleGoForward}
            onStop={() => webViewRef.current?.stopLoading()}
            onRefresh={handleRefresh}
            extraButtons={[
              { icon: "remove-circle-outline", onPress: handleZoomOut, label: "Zoom Out" },
              { icon: "refresh-circle-outline", onPress: handleResetZoom, label: "Reset Zoom" },
              { icon: "add-circle-outline", onPress: handleZoomIn, label: "Zoom In" },
            ]}
          />
        </View>
      </GestureHandlerRootView>
    );
  }

  // Default hub view
  return (
    <View style={{ flex: 1, backgroundColor: STUDIO.void }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-3xl font-bold mb-2" style={{ color: STUDIO.text }}>
          Writing Studio
        </Text>
        <Text className="text-base mb-6" style={{ color: STUDIO.nickelDark }}>
          Develop books, take notes, and create with AI
        </Text>

        {writingTiles.map(renderTile)}
      </ScrollView>
    </View>
  );
}
