/**
 * YTMP3.AS DOWNLOAD METHOD - DO NOT MODIFY
 * =========================================
 * This is the WORKING method for downloading YouTube audio as MP3.
 * Confirmed working: December 23, 2025
 *
 * KEY DETAILS:
 * - Uses iotacloud.org/api/ endpoint (backup API from ytmp3.as)
 * - Auth token generated from ytmp3.as gC object
 * - Polls for conversion progress until complete
 *
 * DO NOT:
 * - Change the API endpoint
 * - Modify the auth generation
 * - Use gammacloud.net (returns 403)
 * - Use app.ytmp3.as directly (returns 403)
 *
 * IF IT BREAKS:
 * - Check if ytmp3.as updated their gC object (view page source)
 * - The gC values may need updating if they rotate keys
 */

// Auth token generation - decoded from ytmp3.as gC object (December 2025)
export const generateYtmp3Auth = (): string => {
  const binaryStr = "11011 110000 10110 1000011 1110 10001 101111 11101 101101 110100 11100 1100 100010 11111 11100 11010 11000 101111 11010 10101 10000 101011 101011 11101 11001 1100 1100 100110 1000011 100111 1000111 101000 100111 10101 1000111 100100 101101 1111 101111 111000 111100 101110";
  const base64Key = "UDZmRE9VbzJhZ2J0eFpsVGl1WEY0Y2tCSnBRMHJLQXllQ3Y5ZG5xR1NOalZXOG16MUlMd2hNc0gzNzVZRVI=";
  const gMT = [0, 11, 14, 0]; // [reverse flag, offset, truncate length, case transform]
  const hexStr1 = "0x370x690x500x430x6d0x610x340x340x770x580x780x330x790x470x330x540x510x700x730x320x38";

  // Decode binary string to array of indices
  const indices = binaryStr.split(" ").map(b => parseInt(b, 2));

  // Decode base64 key - gMT[0] determines if we reverse
  const decodedKey = atob(base64Key);
  const keyChars = gMT[0] > 0 ? decodedKey.split("").reverse().join("") : decodedKey;

  // Build result string by looking up characters at (index - offset)
  let result = "";
  for (const idx of indices) {
    result += keyChars[idx - gMT[1]];
  }

  // Truncate if gMT[2] > 0
  if (gMT[2] > 0) {
    result = result.substring(0, gMT[2]);
  }

  // Decode hex string to get the suffix
  const hexMatches = hexStr1.match(/0x[a-fA-F0-9]{2}/g) || [];
  let suffix = "";
  for (const hex of hexMatches) {
    suffix += String.fromCharCode(parseInt(hex, 16));
  }

  // Final auth: base64(result + "_" + suffix)
  return btoa(result + "_" + suffix);
};

// Get current timestamp in seconds
export const getTimestamp = (): number => Math.floor(Date.now() / 1000);

// The working API endpoint - iotacloud.org backup API
export const YTMP3_API_ENDPOINT = "https://iotacloud.org/api/";

// Build the full API URL
export const buildYtmp3ApiUrl = (videoId: string): string => {
  const auth = generateYtmp3Auth();
  const timestamp = getTimestamp();
  return `${YTMP3_API_ENDPOINT}?a=${encodeURIComponent(auth)}&r=1&v=${videoId}&t=${timestamp}`;
};

// Headers to use with the API
export const YTMP3_HEADERS = {
  "Accept": "application/json",
  "Referer": "https://app.ytmp3.as/",
  "Origin": "https://app.ytmp3.as",
};

// Download headers
export const DOWNLOAD_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept": "*/*",
  "Referer": "https://app.ytmp3.as/",
};

/**
 * Fetch download URL for a YouTube video
 * @param videoId - The YouTube video ID (11 characters)
 * @returns Promise with download URL and title, or null if failed
 */
export const fetchYtmp3DownloadUrl = async (
  videoId: string,
  onProgress?: (status: string) => void
): Promise<{ url: string; title: string } | null> => {
  try {
    const apiUrl = buildYtmp3ApiUrl(videoId);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: YTMP3_HEADERS,
    });

    if (!response.ok) {
      console.log("YTMP3 API error:", response.status);
      return null;
    }

    const data = await response.json();

    if (data.progress === "completed" && data.url) {
      return { url: data.url, title: data.title || `YouTube_${videoId}` };
    }

    if (data.progress === "converting") {
      // Poll until complete (max 30 attempts, 5 seconds apart = 2.5 minutes)
      for (let i = 0; i < 30; i++) {
        onProgress?.("Converting video...");
        await new Promise(resolve => setTimeout(resolve, 5000));

        const pollResponse = await fetch(apiUrl, {
          method: "GET",
          headers: YTMP3_HEADERS,
        });

        if (pollResponse.ok) {
          const pollData = await pollResponse.json();

          if (pollData.progress === "completed" && pollData.url) {
            return { url: pollData.url, title: pollData.title || `YouTube_${videoId}` };
          }

          if (pollData.progress === "error") {
            return null;
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.log("YTMP3 fetch error:", error);
    return null;
  }
};
