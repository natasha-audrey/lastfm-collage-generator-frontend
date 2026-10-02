import { useEffect, useRef, useState } from "react";
import { generateCollage, genericFailure, type CollageRequest } from "./api";
import { CollageForm } from "./CollageForm";
import { CollageResult } from "./CollageResult";

/** Coordinate generation and temporary image ownership for this page. */
export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [image, setImage] = useState<string>();
  const active = useRef<AbortController | null>(null);
  const urls = useRef(new Set<string>());
  const displayed = useRef<string | undefined>(undefined);
  useEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
      urls.current.forEach((url) => URL.revokeObjectURL(url));
      urls.current.clear();
    },
    [],
  );
  function release(url: string) {
    if (urls.current.delete(url)) URL.revokeObjectURL(url);
  }
  async function submit(input: CollageRequest) {
    if (active.current) return;
    if (!input.username) {
      setError("Enter a Last.fm username.");
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setError("");
    let candidate: string | undefined;
    try {
      const blob = await generateCollage(input, controller.signal);
      if (controller.signal.aborted) return;
      candidate = URL.createObjectURL(blob);
      urls.current.add(candidate);
      await new Promise<void>((resolve, reject) => {
        const pending = new Image();
        const cleanup = () => {
          pending.onload = null;
          pending.onerror = null;
          controller.signal.removeEventListener("abort", abort);
        };
        const abort = () => {
          cleanup();
          pending.src = "";
          reject(new DOMException("Aborted", "AbortError"));
        };
        pending.onload = () => {
          cleanup();
          resolve();
        };
        pending.onerror = () => {
          cleanup();
          reject(new Error(genericFailure));
        };
        controller.signal.addEventListener("abort", abort, { once: true });
        pending.src = candidate!;
      });
      if (controller.signal.aborted) return;
      const previous = displayed.current;
      displayed.current = candidate;
      setImage(candidate);
      candidate = undefined;
      if (previous) release(previous);
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(failure instanceof Error ? failure.message : genericFailure);
    } finally {
      if (candidate) release(candidate);
      if (active.current === controller) {
        active.current = null;
        setLoading(false);
      }
    }
  }
  return (
    <main aria-label="Last.fm collage generator">
      <CollageForm
        loading={loading}
        onSubmit={(input) => {
          void submit(input);
        }}
      />
      <div id="message" className={error ? "message error" : "message"}>
        <div role="status" aria-live="polite">
          {loading ? "Generating collage…" : ""}
        </div>
        {error && <div role="alert">{error}</div>}
      </div>
      {image && <CollageResult url={image} />}
    </main>
  );
}
