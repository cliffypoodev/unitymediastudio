import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useNavigation } from "@react-navigation/native";
import { STUDIO } from "../utils/theme";
import { getOpenAITextResponse } from "../api/chat-service";
import { useAIChatStore } from "../state/aiChatStore";

const SYSTEM_PROMPT = `You are a highly skilled scholarly linguist and creative author. You specialize in:
- Literary analysis and critique
- Creative writing across all genres
- Character development and plot structure
- World-building and narrative techniques
- Grammar, style, and linguistic nuances
- Book planning and manuscript development

You provide thoughtful, detailed responses that help writers develop their craft. You ask probing questions to understand their vision and offer specific, actionable guidance. You're encouraging yet honest, pushing writers to their full potential.`;

export function BookAssistantScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Use dedicated book assistant store (we'll filter by a prefix)
  const currentConversationId = useAIChatStore((s) => s.currentConversationId);
  const conversations = useAIChatStore((s) => s.conversations);
  const provider = useAIChatStore((s) => s.provider);
  const addMessage = useAIChatStore((s) => s.addMessage);
  const clearCurrentConversation = useAIChatStore((s) => s.clearCurrentConversation);
  const createConversation = useAIChatStore((s) => s.createConversation);
  const setCurrentConversation = useAIChatStore((s) => s.setCurrentConversation);
  const deleteConversation = useAIChatStore((s) => s.deleteConversation);

  // Get messages from current conversation
  const messages = conversations.find((c) => c.id === currentConversationId)?.messages || [];

  // Filter conversations to only show book-related ones (we'll mark them with a prefix)
  const bookConversations = conversations.filter(
    (conv) => conv.title?.startsWith("[BOOK]") || conv.id === currentConversationId
  );

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMessageText = inputText.trim();

    // Ensure we have a conversation
    if (!currentConversationId) {
      const newId = createConversation();
      // Update title to mark as book conversation
      setTimeout(() => {
        const conv = conversations.find((c) => c.id === newId);
        if (conv) {
          useAIChatStore.getState().updateConversationTitle(
            newId,
            `[BOOK] ${userMessageText.slice(0, 40)}...`
          );
        }
      }, 100);
    }

    // Add user message
    addMessage({
      text: userMessageText,
      sender: "user",
    });

    setInputText("");
    setLoading(true);
    Keyboard.dismiss();

    try {
      // Create messages array with system prompt for context
      const contextMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map((msg) => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text,
        })),
        { role: "user", content: userMessageText },
      ];

      const result = await getOpenAITextResponse(contextMessages as any);

      addMessage({
        text: result.content,
        sender: "ai",
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error("Book Assistant error:", error);

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
    Alert.alert("Message Options", "What would you like to do with this message?", [
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
    ]);
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
      "Delete Project",
      "Are you sure you want to delete this book project?",
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

  return (
    <View style={{ flex: 1, backgroundColor: STUDIO.void }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
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
            {/* Back Button */}
            <Pressable onPress={() => navigation.goBack()}>
              {({ pressed }) => (
                <View
                  className="w-8 h-8 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: pressed
                      ? "rgba(255,255,255,0.3)"
                      : "rgba(255,255,255,0.2)",
                  }}
                >
                  <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                </View>
              )}
            </Pressable>

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
          </View>

          <Text className="text-white text-lg font-bold">Book Assistant</Text>
        </LinearGradient>

        {/* Chat History Sidebar */}
        {showHistory && (
          <View
            style={{
              position: "absolute",
              top: 52 + insets.top,
              left: 0,
              bottom: 0,
              width: "70%",
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
              <Text className="text-lg font-bold" style={{ color: STUDIO.text }}>
                Book Projects
              </Text>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 12 }}
              showsVerticalScrollIndicator={false}
            >
              {bookConversations.length === 0 ? (
                <View className="items-center justify-center py-12">
                  <Ionicons name="book-outline" size={40} color={STUDIO.nickelDark} />
                  <Text
                    className="text-center mt-4 text-sm"
                    style={{ color: STUDIO.nickelLight }}
                  >
                    No book projects yet
                  </Text>
                </View>
              ) : (
                bookConversations.map((conv) => (
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
                          {conv.title?.replace("[BOOK] ", "") || "New Project"}
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
              <Ionicons name="book-outline" size={48} color={STUDIO.nickelDark} />
              <Text
                className="text-center mt-4 text-base"
                style={{ color: STUDIO.nickelLight }}
              >
                Ask your scholarly writing assistant anything!
              </Text>
              <Text
                className="text-center mt-2 text-sm px-8"
                style={{ color: STUDIO.nickelDark }}
              >
                Expert in creative writing, literary analysis, and book development
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
                      message.sender === "user" ? STUDIO.amber : STUDIO.slate,
                  }}
                >
                  <Text
                    selectable
                    className="text-base"
                    style={{
                      color:
                        message.sender === "user" ? STUDIO.void : STUDIO.text,
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{
            borderTopWidth: 1,
            borderTopColor: STUDIO.border,
            backgroundColor: STUDIO.dark,
            paddingBottom: insets.bottom,
          }}
        >
          <View style={{ padding: 12 }}>
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
                    <Ionicons name="clipboard-outline" size={20} color={STUDIO.amber} />
                  </View>
                )}
              </Pressable>

              {/* Text Input */}
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask about your book project..."
                placeholderTextColor={STUDIO.nickelDark}
                multiline
                maxLength={2000}
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
              <Pressable onPress={handleSendMessage} disabled={!inputText.trim() || loading}>
                {({ pressed }) => (
                  <View
                    className="w-12 h-12 items-center justify-center rounded-full"
                    style={{
                      backgroundColor:
                        !inputText.trim() || loading ? STUDIO.nickelDark : STUDIO.amber,
                      opacity: pressed ? 0.7 : 1,
                    }}
                  >
                    <Ionicons
                      name="send"
                      size={20}
                      color={
                        !inputText.trim() || loading ? STUDIO.nickelLight : STUDIO.void
                      }
                    />
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
