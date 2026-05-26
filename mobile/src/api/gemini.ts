/**
 * Google Gemini API integration
 */

export interface GeminiMessage {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

export interface GeminiResponse {
  content: string;
}

/**
 * Get a chat response from Google Gemini
 * @param messages - The messages to send to Gemini
 * @returns The response from Gemini
 */
export const getGeminiResponse = async (
  messages: GeminiMessage[]
): Promise<GeminiResponse> => {
  const apiKey = process.env.EXPO_PUBLIC_VIBECODE_GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("Google API key not configured");
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: messages,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `Gemini API error: ${response.status}`
      );
    }

    const data = await response.json();
    const content =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

    return { content };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

/**
 * Get a simple chat response from Gemini
 * @param prompt - The prompt to send to Gemini
 * @returns The response from Gemini
 */
export const getGeminiChatResponse = async (
  prompt: string
): Promise<GeminiResponse> => {
  return await getGeminiResponse([
    {
      role: "user",
      parts: [{ text: prompt }],
    },
  ]);
};
