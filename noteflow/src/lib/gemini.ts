type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

export async function enhanceMeetingNote(input: {
  apiKey: string;
  meetingTitle?: string;
  noteText: string;
}): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(input.apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: [
                  "Rewrite the following meeting note into a clearer, concise summary.",
                  "Keep the meaning intact, preserve specific facts, and do not invent information.",
                  input.meetingTitle ? `Meeting title: ${input.meetingTitle}` : "",
                  `Original note: ${input.noteText}`,
                ]
                  .filter(Boolean)
                  .join("\n"),
              },
            ],
          },
        ],
      }),
    },
  );

  const json = (await response.json()) as GeminiResponse;
  if (!response.ok) {
    throw new Error(json.error?.message ?? "Gemini request failed.");
  }

  const enhancedText = json.candidates?.[0]?.content?.parts
    ?.map((part) => part.text?.trim() ?? "")
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!enhancedText) {
    throw new Error("Gemini returned an empty enhancement.");
  }

  return enhancedText;
}
