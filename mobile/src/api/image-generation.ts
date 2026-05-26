/*
IMPORTANT NOTICE: DO NOT REMOVE
This is a custom asset generation service that uses a custom API endpoint maintained by Vibecode. If the user wants to build an app that generates images, assets, icons, or anything else, you must use this internal endpoint. Do not attempt to use replicate or chatgpt.
You may update this service, but you should not need to.
This endpoint uses openai's latest image generation API, AKA gpt4o, AKA gpt-image-1, so if the user is asking for that, this is the right service to use.
Does not support video and audio generation.
*/

// API endpoint configuration
const baseUrl = "https://api.vibecodeapp.com";
const endpoint = "/api/storage/generate-image";

/**
 * Generate an image using the custom API endpoint
 * @param prompt The text prompt to generate an image from
 * @param options Optional parameters for image generation
 * @returns URL of the generated image, usable to render in the app directly.
 */
export async function generateImage(
  prompt: string,
  options?: {
    size?: "1024x1024" | "1536x1024" | "1024x1536" | "auto";
    quality?: "low" | "medium" | "high" | "auto";
    format?: "png" | "jpeg" | "webp";
    background?: undefined | "transparent";
  },
): Promise<string> {
  try {
    // Create request body
    const requestBody = {
      projectId: process.env.EXPO_PUBLIC_VIBECODE_PROJECT_ID,
      prompt,
      options: {
        ...options,
      },
    };

    // Make API request
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[AssetGenerationService] Error response:", errorData);

      // Parse error message for user-friendly responses
      const errorString = JSON.stringify(errorData).toLowerCase();

      // Handle safety/content moderation rejections
      if (errorString.includes("safety") || errorString.includes("rejected") || errorString.includes("content_policy")) {
        throw new Error("Your prompt was blocked by safety filters. Please try a different description that avoids sensitive content.");
      }

      // Handle rate limits
      if (response.status === 429 || errorString.includes("rate_limit")) {
        throw new Error("Too many requests. Please wait a moment and try again.");
      }

      // Handle server errors - try fallback
      if (response.status >= 500 || response.status === 502 || response.status === 503) {
        console.log("[AssetGenerationService] Server error, attempting fallback to OpenAI directly...");
        return await generateImageWithOpenAI(prompt, options);
      }

      throw new Error("Failed to generate image. Please try a simpler prompt or different settings.");
    }

    const result = await response.json();
    console.log("[AssetGenerationService] Image generated successfully");

    // Return the image data from the response
    if (result.success && result.data) {
      return result.data.imageUrl as string;
    } else {
      console.error("[AssetGenerationService] Invalid response format:", result);
      throw new Error("Invalid response format from API");
    }
  } catch (error: any) {
    // If it's a network error or timeout, try fallback
    if (error.message?.includes("network") || error.message?.includes("fetch") || error.message?.includes("timeout")) {
      console.log("[AssetGenerationService] Network error, attempting fallback to OpenAI directly...");
      try {
        return await generateImageWithOpenAI(prompt, options);
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
      }
    }
    console.error("Image Generation Error:", error);
    throw error;
  }
}

/**
 * Fallback function to generate image directly with OpenAI DALL-E 3
 */
async function generateImageWithOpenAI(
  prompt: string,
  options?: {
    size?: "1024x1024" | "1536x1024" | "1024x1536" | "auto";
    quality?: "low" | "medium" | "high" | "auto";
    format?: "png" | "jpeg" | "webp";
    background?: undefined | "transparent";
  },
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  // Map size - DALL-E 3 only supports 1024x1024, 1792x1024, 1024x1792
  let dalleSize: "1024x1024" | "1792x1024" | "1024x1792" = "1024x1024";
  if (options?.size === "1536x1024") {
    dalleSize = "1792x1024";
  } else if (options?.size === "1024x1536") {
    dalleSize = "1024x1792";
  }

  // Map quality
  const quality = options?.quality === "high" ? "hd" : "standard";

  console.log("[OpenAI Fallback] Generating image with DALL-E 3...");

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: dalleSize,
      quality: quality,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("[OpenAI Fallback] Error:", errorData);

    if (errorData.error?.message) {
      throw new Error(errorData.error.message);
    }
    throw new Error("Failed to generate image with OpenAI");
  }

  const result = await response.json();

  if (result.data && result.data[0]?.url) {
    console.log("[OpenAI Fallback] Image generated successfully");
    return result.data[0].url;
  }

  throw new Error("Invalid response from OpenAI");
}

/**
 * Convert aspect ratio to size format
 * @param aspectRatio The aspect ratio to convert
 * @returns The corresponding size format
 */
export function convertAspectRatioToSize(aspectRatio: string): "1024x1024" | "1536x1024" | "1024x1536" | "auto" {
  switch (aspectRatio) {
    case "1:1":
      return "1024x1024";
    case "3:2":
      return "1536x1024";
    case "2:3":
      return "1024x1536";
    default:
      return "auto";
  }
}
