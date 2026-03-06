/**
 * P2 feature — legacy chat/practice route.
 * Not part of the core v1.0 product (prep kit generator).
 * Kept for future voice/practice mode.
 */
import { NextRequest, NextResponse } from "next/server";
import { anthropic, SONNET } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { messages, companyName, targetRole } = body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      companyName: string;
      targetRole: string;
    };

    const stream = await anthropic.messages.stream({
      model: SONNET,
      max_tokens: 600,
      system: `You are a ${companyName} ${targetRole} interviewer. Ask questions, listen, and give concise coaching feedback.`,
      messages,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      },
    });

    return new NextResponse(readableStream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}
