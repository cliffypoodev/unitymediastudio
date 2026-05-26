import React, { useRef, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SlimNavBar } from "../components/SlimNavBar";
import { STUDIO } from "../utils/theme";
import { Linking } from "react-native";

// Only import WebView types on native platforms
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
  cyan: STUDIO.swirlCyan,
  wolf: STUDIO.nickelDark,
  fur: STUDIO.nickelLight,
  midna: STUDIO.swirlOrange,
};

// Web component using iframe
function SunoScreenWeb() {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const handleGoBack = () => {
    const iframe = document.getElementById("suno-iframe") as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.history.back();
    }
  };

  const handleGoForward = () => {
    const iframe = document.getElementById("suno-iframe") as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.history.forward();
    }
  };

  const handleRefresh = () => {
    const iframe = document.getElementById("suno-iframe") as HTMLIFrameElement;
    if (iframe) {
      iframe.src = iframe.src;
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: TWILIGHT.void, paddingTop: insets.top }}>
        {isLoading && (
          <View
            className="absolute left-0 right-0 z-20 h-1"
            style={{ top: insets.top, backgroundColor: TWILIGHT.gold }}
          >
            <LinearGradient
              colors={[TWILIGHT.gold, TWILIGHT.amber]}
              style={{ height: "100%", width: "50%" }}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        )}

        <iframe
          id="suno-iframe"
          src="https://suno.com"
          style={{
            flex: 1,
            width: "100%",
            height: "100%",
            border: "none",
          }}
          onLoad={() => setIsLoading(false)}
          allow="autoplay; microphone; camera"
        />

        <SlimNavBar
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          onGoBack={handleGoBack}
          onGoForward={handleGoForward}
          onStop={() => {}}
          onRefresh={handleRefresh}
          extraButtons={[
            {
              icon: "musical-notes-outline",
              onPress: () => window.open("https://suno.com", "_blank"),
              label: "Open Suno in New Tab"
            }
          ]}
        />
      </View>
    </GestureHandlerRootView>
  );
}

// Native component using WebView
function SunoScreenNative() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { WebView } = require("react-native-webview");

  const insets = useSafeAreaInsets();
  const webViewRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
  };

  const handleGoBack = () => {
    webViewRef.current?.goBack();
  };

  const handleGoForward = () => {
    webViewRef.current?.goForward();
  };

  const handleRefresh = () => {
    webViewRef.current?.reload();
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: TWILIGHT.void, paddingTop: insets.top }}>
        {isLoading && (
          <View
            className="absolute left-0 right-0 z-20 h-1"
            style={{ top: insets.top, backgroundColor: TWILIGHT.gold }}
          >
            <LinearGradient
              colors={[TWILIGHT.gold, TWILIGHT.amber]}
              style={{ height: "100%", width: "50%" }}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={{
            uri: "https://suno.com",
            headers: {
              "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
            }
          }}
          style={{ flex: 1 }}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onNavigationStateChange={handleNavigationStateChange}
          allowsBackForwardNavigationGestures
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
          onError={(syntheticEvent: any) => {
            const { nativeEvent } = syntheticEvent;
            console.log("WebView error: ", nativeEvent);
          }}
          onHttpError={(syntheticEvent: any) => {
            const { nativeEvent } = syntheticEvent;
            console.log("WebView HTTP error: ", nativeEvent.statusCode);
          }}
          renderLoading={() => (
            <View
              className="absolute inset-0 items-center justify-center"
              style={{ backgroundColor: TWILIGHT.void }}
            >
              <ActivityIndicator size="large" color={TWILIGHT.gold} />
              <Text className="mt-4" style={{ color: TWILIGHT.fur }}>
                Loading Suno...
              </Text>
            </View>
          )}
        />

        <SlimNavBar
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          onGoBack={handleGoBack}
          onGoForward={handleGoForward}
          onStop={() => webViewRef.current?.stopLoading()}
          onRefresh={handleRefresh}
          extraButtons={[
            {
              icon: "musical-notes-outline",
              onPress: () => Linking.openURL("suno://").catch(() => console.log("Could not open Suno app")),
              label: "Open Suno App"
            }
          ]}
        />
      </View>
    </GestureHandlerRootView>
  );
}

// Export the appropriate component based on platform
export function SunoScreen() {
  if (isWeb) {
    return <SunoScreenWeb />;
  }
  return <SunoScreenNative />;
}
