import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message || message.trim() === "") {
      return NextResponse.json({ reply: "❌ No message provided." });
    }

    const geminiRes = await fetch(
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=AIzaSyCRop0yjzjh2esMnZZw8rQerpDWghZgjd0",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8", // <-- This is also okay
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: message,
            },
          ],
        },
      ],
    }),
  }
);
    const data = await geminiRes.json();
    console.log("✅ Gemini Response:", JSON.stringify(data, null, 2));

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "⚠️ Gemini returned no reply.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("❌ Gemini API error:", err);
    return NextResponse.json({ reply: "❌ Failed to reach Gemini." });
  }
}
