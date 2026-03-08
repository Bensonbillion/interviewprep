/**
 * P2 — Voice practice mode (not yet built).
 * Redirects to the prep kit page for now.
 */
"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function PracticePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/prep/${sessionId}`);
  }, [sessionId, router]);

  return null;
}
