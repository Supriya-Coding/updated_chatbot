"use client";

import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Message {
  id: number;
  sender: "user" | "bot";
  text: string;
}

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export default function ChatbotUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfUploaded, setPdfUploaded] = useState(false);
  const [pdfFileName, setPdfFileName] = useState("");
  const [parsedPdfText, setParsedPdfText] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
      }
    };
    document.body.appendChild(script);
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: messages.length,
      sender: "user",
      text: input.trim(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    const finalMessage = `${input.trim()}\n\n${parsedPdfText}`;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: finalMessage }),
      });

      const data = await response.json();
      const botMessage: Message = {
        id: updatedMessages.length,
        sender: "bot",
        text: data.reply || "No response from Gemini.",
      };

      setMessages([...updatedMessages, botMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Error:", errorMessage);
      setMessages([
        ...updatedMessages,
        {
          id: updatedMessages.length,
          sender: "bot",
          text: "⚠ Could not reach Gemini.",
        },
      ]);
    } finally {
      setLoading(false);
      setParsedPdfText("");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") return;

    setPdfUploaded(true);
    setPdfFileName(file.name);
    setMessages((prev) => [
      ...prev,
      { id: prev.length, sender: "user", text: "📎 1 file uploaded" },
    ]);

    const reader = new FileReader();
    reader.onload = async () => {
      const typedArray = new Uint8Array(reader.result as ArrayBuffer);
      try {
        const pdf = await window.pdfjsLib.getDocument({ data: typedArray }).promise;
        let allText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const text = content.items.map((item: any) => item.str).join(" ");
          allText += text + "\n";
        }

        if (allText.trim().length > 0) {
          setParsedPdfText(allText);
          console.log("✅ Parsed PDF content:\n", allText);
        } else {
          setParsedPdfText("");
          setMessages((prev) => [
            ...prev,
            {
              id: prev.length,
              sender: "bot",
              text: "⚠ The PDF was parsed, but no readable text was found.",
            },
          ]);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("❌ Error parsing PDF:", errorMessage);
        setMessages((prev) => [
          ...prev,
          {
            id: prev.length,
            sender: "bot",
            text: "⚠ Failed to parse the uploaded PDF.",
          },
        ]);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div
      className={cn(
        "relative flex justify-center items-center min-h-screen px-2 transition-colors duration-300 overflow-hidden",
        darkMode ? "bg-[#121212] text-white" : "bg-[#f9f9f9] text-black"
      )}
    >
      <div className="absolute inset-0 overflow-hidden -z-10">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "absolute w-1.5 h-1.5 rounded-full animate-pulse",
              darkMode ? "bg-white" : "bg-gray-400"
            )}
            style={{
              top: `${(i * 7) % 100}%`,
              left: `${(i * 13) % 100}%`,
              animationDelay: `${(i % 5)}s`,
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-md flex flex-col p-4 border-4 rounded-3xl shadow-2xl border-gray-400 bg-white/80 dark:bg-[#1a1a1a]/90">
        <h2 className="text-center text-2xl font-bold mb-4">💬 Chatbot</h2>

        <ScrollArea className="h-[60vh] mb-3 pr-1">
          <div className="flex flex-col gap-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.sender === "user" ? "justify-end" : "justify-start"
                )}
              >
                <Card
                  className={cn(
                    "max-w-[75%] p-3 rounded-xl text-sm whitespace-pre-wrap shadow-md",
                    msg.sender === "user"
                      ? "bg-[#6ee7b7] text-black"
                      : "bg-[#3b82f6] text-white"
                  )}
                >
                  <p>{msg.text}</p>
                </Card>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <Card className="max-w-[75%] p-3 text-sm italic bg-blue-200 text-black rounded-xl shadow-md">
                  Gemini is thinking...
                </Card>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="mb-2 text-sm text-green-700">
          {pdfUploaded && <span>📎 1 file uploaded</span>}
        </div>

        {pdfFileName && (
          <div className="text-xs text-gray-500 truncate mb-1">
            {pdfFileName}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className={cn(
              "flex-1 text-sm",
              darkMode
                ? "bg-[#1f2937] text-white placeholder-gray-400"
                : "bg-white text-black border border-gray-300 placeholder-gray-500"
            )}
          />
          <Button
            onClick={handleSend}
            disabled={loading}
            className="text-sm bg-green-600 hover:bg-green-700 text-white"
          >
            Send
          </Button>
        </div>

        <div className="mt-3">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="text-sm text-gray-500"
          />
        </div>

        <div className="mt-2 text-right">
          <Button
            variant="outline"
            onClick={() => setDarkMode((prev) => !prev)}
            className="text-xs"
          >
            {darkMode ? "🌞 Light Mode" : "🌙 Dark Mode"}
          </Button>
        </div>
      </div>
    </div>
  );
}
