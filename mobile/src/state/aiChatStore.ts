import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: number;
  provider: "chatgpt" | "gemini";
}

export interface Conversation {
  id: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  title?: string;
}

interface AIChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  provider: "chatgpt" | "gemini";
}

interface AIChatActions {
  // Conversation management
  createConversation: () => string;
  deleteConversation: (id: string) => void;
  setCurrentConversation: (id: string | null) => void;
  getCurrentConversation: () => Conversation | undefined;

  // Message management
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp" | "provider">) => void;
  clearCurrentConversation: () => void;
  getMessages: () => ChatMessage[];

  // Provider management
  setProvider: (provider: "chatgpt" | "gemini") => void;

  // Utility
  updateConversationTitle: (id: string, title: string) => void;
  exportConversation: (id: string) => string | null;
}

const generateConversationTitle = (firstMessage?: string): string => {
  if (!firstMessage) return "New Chat";

  // Create a title from the first message (max 50 chars)
  const title = firstMessage.slice(0, 50);
  return title.length < firstMessage.length ? `${title}...` : title;
};

export const useAIChatStore = create<AIChatState & AIChatActions>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,
      provider: "chatgpt",

      createConversation: () => {
        const newConversation: Conversation = {
          id: `conv-${Date.now()}`,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          title: "New Chat",
        };

        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversationId: newConversation.id,
        }));

        return newConversation.id;
      },

      deleteConversation: (id) =>
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          currentConversationId:
            state.currentConversationId === id
              ? state.conversations[0]?.id || null
              : state.currentConversationId,
        })),

      setCurrentConversation: (id) =>
        set({ currentConversationId: id }),

      getCurrentConversation: () => {
        const state = get();
        return state.conversations.find(
          (c) => c.id === state.currentConversationId
        );
      },

      addMessage: (message) =>
        set((state) => {
          let conversationId = state.currentConversationId;

          // Create a new conversation if none exists
          if (!conversationId) {
            const newConversation: Conversation = {
              id: `conv-${Date.now()}`,
              messages: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
              title: "New Chat",
            };
            conversationId = newConversation.id;

            const newMessage: ChatMessage = {
              ...message,
              id: `msg-${Date.now()}`,
              timestamp: Date.now(),
              provider: state.provider,
            };

            newConversation.messages = [newMessage];
            newConversation.title = generateConversationTitle(
              message.sender === "user" ? message.text : undefined
            );

            return {
              conversations: [newConversation, ...state.conversations],
              currentConversationId: conversationId,
            };
          }

          // Add message to existing conversation
          const updatedConversations = state.conversations.map((conv) => {
            if (conv.id === conversationId) {
              const newMessage: ChatMessage = {
                ...message,
                id: `msg-${Date.now()}-${Math.random()}`,
                timestamp: Date.now(),
                provider: state.provider,
              };

              const updatedMessages = [...conv.messages, newMessage];

              // Update title based on first user message if still "New Chat"
              let updatedTitle = conv.title;
              if (
                conv.title === "New Chat" &&
                message.sender === "user" &&
                updatedMessages.length === 1
              ) {
                updatedTitle = generateConversationTitle(message.text);
              }

              return {
                ...conv,
                messages: updatedMessages,
                updatedAt: Date.now(),
                title: updatedTitle,
              };
            }
            return conv;
          });

          return { conversations: updatedConversations };
        }),

      clearCurrentConversation: () =>
        set((state) => {
          const conversationId = state.currentConversationId;
          if (!conversationId) return state;

          const updatedConversations = state.conversations.map((conv) => {
            if (conv.id === conversationId) {
              return {
                ...conv,
                messages: [],
                updatedAt: Date.now(),
                title: "New Chat",
              };
            }
            return conv;
          });

          return { conversations: updatedConversations };
        }),

      getMessages: () => {
        const state = get();
        const conversation = state.conversations.find(
          (c) => c.id === state.currentConversationId
        );
        return conversation?.messages || [];
      },

      setProvider: (provider) => set({ provider }),

      updateConversationTitle: (id, title) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id ? { ...conv, title, updatedAt: Date.now() } : conv
          ),
        })),

      exportConversation: (id) => {
        const state = get();
        const conversation = state.conversations.find((c) => c.id === id);
        if (!conversation) return null;

        const exportData = {
          title: conversation.title,
          createdAt: new Date(conversation.createdAt).toISOString(),
          messages: conversation.messages.map((msg) => ({
            sender: msg.sender,
            text: msg.text,
            timestamp: new Date(msg.timestamp).toISOString(),
            provider: msg.provider,
          })),
        };

        return JSON.stringify(exportData, null, 2);
      },
    }),
    {
      name: "ai-chat-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
        provider: state.provider,
      }),
    }
  )
);
