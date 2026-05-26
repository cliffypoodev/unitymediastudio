import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  Keyboard,
  Alert,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { getOpenAIChatResponse } from "../api/chat-service";
import { getGeminiChatResponse } from "../api/gemini";
import { STUDIO } from "../utils/theme";
import { useAIChatStore } from "../state/aiChatStore";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Button dimensions
const BUTTON_SIZE = 56;

interface FloatingAIAssistantProps {
  isExpanded?: boolean;
  onClose?: () => void;
}

export function FloatingAIAssistant({
  isExpanded: controlledIsExpanded,
  onClose
}: FloatingAIAssistantProps = {}) {
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  const isExpanded = controlledIsExpanded !== undefined ? controlledIsExpanded : internalIsExpanded;
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Use Zustand store for persistent chat
  const currentConversationId = useAIChatStore((s) => s.currentConversationId);
  const conversations = useAIChatStore((s) => s.conversations);
  const provider = useAIChatStore((s) => s.provider);
  const addMessage = useAIChatStore((s) => s.addMessage);
  const setProvider = useAIChatStore((s) => s.setProvider);
  const clearCurrentConversation = useAIChatStore((s) => s.clearCurrentConversation);
  const createConversation = useAIChatStore((s) => s.createConversation);
  const setCurrentConversation = useAIChatStore((s) => s.setCurrentConversation);
  const deleteConversation = useAIChatStore((s) => s.deleteConversation);

  // Get messages from current conversation
  const messages = conversations.find((c) => c.id === currentConversationId)?.messages || [];

  // Chat history sidebar state
  const [showHistory, setShowHistory] = useState(false);

  // Position for the button
  const translateX = useSharedValue(SCREEN_WIDTH - BUTTON_SIZE - 20);
  const translateY = useSharedValue(SCREEN_HEIGHT * 0.5);
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleToggleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onClose) {
      onClose();
    } else {
      setInternalIsExpanded(!internalIsExpanded);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMessageText = inputText.trim();

    // Ensure we have a conversation to add messages to
    if (!currentConversationId) {
      createConversation();
    }

    // Add user message to store
    addMessage({
      text: userMessageText,
      sender: "user",
    });

    setInputText("");
    setLoading(true);
    Keyboard.dismiss();

    try {
      let response;
      if (provider === "chatgpt") {
        const result = await getOpenAIChatResponse(userMessageText);
        response = result.content;
      } else {
        const result = await getGeminiChatResponse(userMessageText);
        response = result.content;
      }

      // Add AI response to store
      addMessage({
        text: response,
        sender: "ai",
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error("AI Assistant error:", error);

      // Add error message to store
      addMessage({
        text: `Sorry, I encountered an error: ${error?.message || "Please try again"}`,
        sender: "ai",
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    clearCurrentConversation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCopyMessage = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handlePasteToInput = async () => {
    const clipboardText = await Clipboard.getStringAsync();
    if (clipboardText) {
      setInputText((prev) => prev + clipboardText);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleLongPressMessage = (message: { text: string; sender: "user" | "ai" }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Message Options",
      "What would you like to do with this message?",
      [
        {
          text: "Copy Text",
          onPress: () => handleCopyMessage(message.text),
        },
        {
          text: "Resend" + (message.sender === "user" ? "" : " (as prompt)"),
          onPress: () => {
            setInputText(message.text);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const handleNewChat = () => {
    createConversation();
    setShowHistory(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversation(conversationId);
    setShowHistory(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDeleteConversation = (conversationId: string) => {
    Alert.alert(
      "Delete Conversation",
      "Are you sure you want to delete this conversation?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteConversation(conversationId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      contextX.value = translateX.value;
      contextY.value = translateY.value;
      scale.value = withSpring(1.05);
      runOnJS(triggerHaptic)();
    })
    .onUpdate((event) => {
      translateX.value = contextX.value + event.translationX;
      translateY.value = contextY.value + event.translationY;
    })
    .onEnd(() => {
      scale.value = withSpring(1);

      // Constrain to screen bounds
      const minX = 8;
      const maxX = SCREEN_WIDTH - BUTTON_SIZE - 8;
      const minY = 60;
      const maxY = SCREEN_HEIGHT - BUTTON_SIZE - 80;

      // Snap to nearest edge horizontally
      const snapToLeft = translateX.value < SCREEN_WIDTH / 2;
      const targetX = snapToLeft ? minX : maxX;

      // Constrain Y position
      let targetY = translateY.value;
      if (targetY < minY) targetY = minY;
      if (targetY > maxY) targetY = maxY;

      translateX.value = withSpring(targetX, { damping: 15, stiffness: 150 });
      translateY.value = withSpring(targetY, { damping: 15, stiffness: 150 });
    })
    .enabled(!isExpanded);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (isExpanded) {
    return (
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
        }}
      >
        {/* Background overlay */}
        <Pressable
          onPress={handleToggleExpand}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        />

        {/* Chat window */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{
            position: "absolute",
            top: "15%",
            left: 20,
            right: 20,
            bottom: "15%",
            maxHeight: SCREEN_HEIGHT * 0.7,
          }}
        >
          <View
            style={{
              flex: 1,
              borderRadius: 20,
              backgroundColor: STUDIO.void,
              borderWidth: 2,
              borderColor: STUDIO.amber,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.4,
              shadowRadius: 16,
              elevation: 12,
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <LinearGradient
              colors={[STUDIO.swirlBlue, STUDIO.swirlCyan] as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <View className="flex-row items-center gap-2">
                {/* History Button */}
                <Pressable onPress={() => setShowHistory(!showHistory)}>
                  {({ pressed }) => (
                    <View
                      className="w-8 h-8 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: pressed
                          ? "rgba(255,255,255,0.3)"
                          : showHistory
                          ? "rgba(255,255,255,0.3)"
                          : "rgba(255,255,255,0.2)",
                      }}
                    >
                      <Ionicons name="menu-outline" size={20} color="#FFFFFF" />
                    </View>
                  )}
                </Pressable>

                {/* New Chat Button */}
                <Pressable onPress={handleNewChat}>
                  {({ pressed }) => (
                    <View
                      className="w-8 h-8 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: pressed
                          ? "rgba(255,255,255,0.3)"
                          : "rgba(255,255,255,0.2)",
                      }}
                    >
                      <Ionicons name="add" size={22} color="#FFFFFF" />
                    </View>
                  )}
                </Pressable>

                {/* Clear Chat */}
                {messages.length > 0 && (
                  <Pressable onPress={handleClearChat}>
                    {({ pressed }) => (
                      <View
                        className="w-8 h-8 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: pressed
                            ? "rgba(255,255,255,0.3)"
                            : "rgba(255,255,255,0.2)",
                        }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                      </View>
                    )}
                  </Pressable>
                )}

                {/* Close Button */}
                <Pressable onPress={handleToggleExpand}>
                  {({ pressed }) => (
                    <View
                      className="w-8 h-8 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: pressed
                          ? "rgba(255,255,255,0.3)"
                          : "rgba(255,255,255,0.2)",
                      }}
                    >
                      <Ionicons name="close" size={20} color="#FFFFFF" />
                    </View>
                  )}
                </Pressable>
              </View>
            </LinearGradient>

            {/* AI Provider Toggle - Prominent */}
            <View
              style={{
                backgroundColor: STUDIO.dark,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: STUDIO.border,
              }}
            >
              <Pressable
                onPress={() => {
                  setProvider(provider === "chatgpt" ? "gemini" : "chatgpt");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
              >
                {({ pressed }) => (
                  <View
                    className="flex-row items-center justify-between px-4 py-3 rounded-xl"
                    style={{
                      backgroundColor: pressed ? STUDIO.slate : STUDIO.charcoal,
                    }}
                  >
                    <View className="flex-row items-center">
                      <Ionicons
                        name={provider === "chatgpt" ? "chatbubbles" : "flash"}
                        size={24}
                        color={STUDIO.amber}
                      />
                      <Text
                        className="text-lg font-bold ml-3"
                        style={{ color: STUDIO.text }}
                      >
                        {provider === "chatgpt" ? "ChatGPT" : "Gemini"}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Text
                        className="text-sm mr-2"
                        style={{ color: STUDIO.nickelLight }}
                      >
                        Tap to switch
                      </Text>
                      <Ionicons
                        name="swap-horizontal"
                        size={20}
                        color={STUDIO.amber}
                      />
                    </View>
                  </View>
                )}
              </Pressable>
            </View>

            {/* Chat History Sidebar */}
            {showHistory && (
              <View
                style={{
                  position: "absolute",
                  top: 52,
                  left: 0,
                  bottom: 0,
                  width: SCREEN_WIDTH * 0.7,
                  backgroundColor: STUDIO.dark,
                  borderRightWidth: 2,
                  borderRightColor: STUDIO.border,
                  zIndex: 1000,
                }}
              >
                <View
                  style={{
                    backgroundColor: STUDIO.charcoal,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: STUDIO.border,
                  }}
                >
                  <Text
                    className="text-lg font-bold"
                    style={{ color: STUDIO.text }}
                  >
                    Chat History
                  </Text>
                </View>

                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ padding: 12 }}
                  showsVerticalScrollIndicator={false}
                >
                  {conversations.length === 0 ? (
                    <View className="items-center justify-center py-12">
                      <Ionicons
                        name="chatbubbles-outline"
                        size={40}
                        color={STUDIO.nickelDark}
                      />
                      <Text
                        className="text-center mt-4 text-sm"
                        style={{ color: STUDIO.nickelLight }}
                      >
                        No conversations yet
                      </Text>
                    </View>
                  ) : (
                    conversations.map((conv) => (
                      <Pressable
                        key={conv.id}
                        onPress={() => handleSelectConversation(conv.id)}
                        onLongPress={() => handleDeleteConversation(conv.id)}
                        style={{
                          marginBottom: 8,
                        }}
                      >
                        {({ pressed }) => (
                          <View
                            className="px-4 py-3 rounded-xl"
                            style={{
                              backgroundColor:
                                conv.id === currentConversationId
                                  ? STUDIO.amber
                                  : pressed
                                  ? STUDIO.slate
                                  : STUDIO.charcoal,
                            }}
                          >
                            <Text
                              className="text-base font-semibold mb-1"
                              numberOfLines={2}
                              style={{
                                color:
                                  conv.id === currentConversationId
                                    ? STUDIO.void
                                    : STUDIO.text,
                              }}
                            >
                              {conv.title || "New Chat"}
                            </Text>
                            <Text
                              className="text-xs"
                              style={{
                                color:
                                  conv.id === currentConversationId
                                    ? STUDIO.dark
                                    : STUDIO.nickelLight,
                              }}
                            >
                              {conv.messages.length} message{conv.messages.length !== 1 ? "s" : ""}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    ))
                  )}
                </ScrollView>
              </View>
            )}

            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 ? (
                <View className="flex-1 items-center justify-center py-12">
                  <Ionicons
                    name="chatbubbles-outline"
                    size={48}
                    color={STUDIO.nickelDark}
                  />
                  <Text
                    className="text-center mt-4 text-base"
                    style={{ color: STUDIO.nickelLight }}
                  >
                    Ask me anything!
                  </Text>
                  <Text
                    className="text-center mt-2 text-sm px-8"
                    style={{ color: STUDIO.nickelDark }}
                  >
                    {provider === "chatgpt"
                      ? "Powered by ChatGPT-4o"
                      : "Powered by Google Gemini 2.0"}
                  </Text>
                </View>
              ) : (
                messages.map((message) => (
                  <Pressable
                    key={message.id}
                    onLongPress={() => handleLongPressMessage(message)}
                    style={{
                      alignSelf: message.sender === "user" ? "flex-end" : "flex-start",
                      maxWidth: "80%",
                      marginBottom: 12,
                    }}
                  >
                    <View
                      className="px-4 py-3 rounded-2xl"
                      style={{
                        backgroundColor:
                          message.sender === "user"
                            ? STUDIO.amber
                            : STUDIO.slate,
                      }}
                    >
                      <Text
                        selectable
                        className="text-base"
                        style={{
                          color:
                            message.sender === "user"
                              ? STUDIO.void
                              : STUDIO.text,
                        }}
                      >
                        {message.text}
                      </Text>
                    </View>
                  </Pressable>
                ))
              )}

              {loading && (
                <View
                  className="px-4 py-3 rounded-2xl self-start"
                  style={{ backgroundColor: STUDIO.slate }}
                >
                  <ActivityIndicator size="small" color={STUDIO.amber} />
                </View>
              )}
            </ScrollView>

            {/* Input Area */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: STUDIO.border,
                backgroundColor: STUDIO.dark,
                padding: 12,
              }}
            >
              <View className="flex-row items-center gap-2">
                {/* Paste Button */}
                <Pressable onPress={handlePasteToInput}>
                  {({ pressed }) => (
                    <View
                      className="w-10 h-10 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: STUDIO.slate,
                        opacity: pressed ? 0.7 : 1,
                      }}
                    >
                      <Ionicons
                        name="clipboard-outline"
                        size={20}
                        color={STUDIO.amber}
                      />
                    </View>
                  )}
                </Pressable>

                {/* Text Input */}
                <TextInput
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Type your message..."
                  placeholderTextColor={STUDIO.nickelDark}
                  multiline
                  maxLength={500}
                  className="flex-1 px-4 py-3 rounded-xl text-base"
                  style={{
                    backgroundColor: STUDIO.slate,
                    color: STUDIO.text,
                    maxHeight: 100,
                  }}
                  onSubmitEditing={handleSendMessage}
                  returnKeyType="send"
                />

                {/* Send Button */}
                <Pressable
                  onPress={handleSendMessage}
                  disabled={!inputText.trim() || loading}
                >
                  {({ pressed }) => (
                    <View
                      className="w-12 h-12 items-center justify-center rounded-full"
                      style={{
                        backgroundColor:
                          !inputText.trim() || loading
                            ? STUDIO.nickelDark
                            : STUDIO.amber,
                        opacity: pressed ? 0.7 : 1,
                      }}
                    >
                      <Ionicons
                        name="send"
                        size={20}
                        color={
                          !inputText.trim() || loading
                            ? STUDIO.nickelLight
                            : STUDIO.void
                        }
                      />
                    </View>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // Collapsed button state
  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            width: BUTTON_SIZE,
            height: BUTTON_SIZE,
            zIndex: 9999,
          },
          animatedButtonStyle,
        ]}
      >
        <Pressable onPress={handleToggleExpand}>
          {({ pressed }) => (
            <LinearGradient
              colors={[STUDIO.swirlBlue, STUDIO.swirlCyan] as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: BUTTON_SIZE,
                height: BUTTON_SIZE,
                borderRadius: BUTTON_SIZE / 2,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
                opacity: pressed ? 0.8 : 1,
              }}
            >
              <Ionicons name="sparkles" size={28} color="#FFFFFF" />
            </LinearGradient>
          )}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}
