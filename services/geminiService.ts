
import { GoogleGenAI } from "@google/genai";

const ai = process.env.API_KEY ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;

// Local fallback puns to use when API is rate-limited or fails
const LOCAL_PUNS = [
  "You're on cloud nine! Keep hopping!",
  "Don't let gravity get you down, it's a bit of a drag.",
  "Mist-opportunity? Nah, you're doing great!",
  "That was a high-stakes jump!",
  "Sky's the limit, but you're reaching for the stars!",
  "Cirrus-ly good jumping there!",
  "You're a real breath of fresh air!",
  "Keeping your head in the clouds, I see!",
  "That hop was legendary. No overcast about it!",
  "A-vail yourself of the next platform!",
  "You're really rising to the occasion!",
  "Feeling light as a feather, stiff as a board!",
  "Don't be a rain cloud, you've got this!",
  "That was a thunder-ous achievement!",
  "Way to stay grounded... or not!"
];

let isRateLimited = false;
let rateLimitResetTime = 0;

export async function getEncouragement(context: string): Promise<string> {
  const now = Date.now();
  
  // If we are in a rate-limit cooldown, use local puns immediately
  if (isRateLimited && now < rateLimitResetTime) {
    return LOCAL_PUNS[Math.floor(Math.random() * LOCAL_PUNS.length)];
  } else if (isRateLimited) {
    isRateLimited = false; // Reset cooldown after time passed
  }

  try {
    if (!ai) return LOCAL_PUNS[Math.floor(Math.random() * LOCAL_PUNS.length)];

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Context: The player is playing a happy 2D parkour game called 'Sky-High Hops'. ${context}. Give a very short, cheerful, and punny sentence of encouragement. No more than 8 words.`,
      config: {
        maxOutputTokens: 30,
        temperature: 0.9,
      }
    });
    
    const text = response.text?.trim();
    if (!text) throw new Error("Empty response");
    return text;
  } catch (error: any) {
    console.warn("Gemini Service issue:", error);

    // Check for rate limit error (429)
    if (error?.message?.includes('429') || error?.status === 429 || error?.code === 429) {
      isRateLimited = true;
      rateLimitResetTime = now + 60000; // Set a 60-second cooldown
      console.log("Rate limit reached. Switching to local fallback for 60 seconds.");
    }
    
    // Return a random local pun as fallback
    return LOCAL_PUNS[Math.floor(Math.random() * LOCAL_PUNS.length)];
  }
}
