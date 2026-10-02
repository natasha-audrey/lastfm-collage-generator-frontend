export type ListeningPeriod =
  "7day" | "1month" | "3month" | "6month" | "12month" | "overall";
export interface CollageRequest {
  username: string;
  period: ListeningPeriod;
  size: number;
}
export const genericFailure =
  "Unable to generate the collage. Please try again.";
const messages: Record<string, string> = {
  user_not_found: "That Last.fm user was not found. Check the username.",
  no_albums:
    "No albums were found for this listening period. Try another period.",
  busy: "The service is busy. Please try again shortly.",
  timeout: "Generation took too long. Please try again.",
  upstream_error:
    "The music service is temporarily unavailable. Please try again.",
  internal_error:
    "The collage service encountered a problem. Please try again.",
  invalid_request:
    "Check your username, listening period, and grid size, then try again.",
};

/** Fetch PNG bytes with a deadline that includes reading the response body. */
export async function generateCollage(
  input: CollageRequest,
  signal: AbortSignal,
): Promise<Blob> {
  const controller = new AbortController();
  let expired = false;
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  let rejectAbort: (reason: Error) => void = () => {};
  const interrupted = new Promise<never>((_, reject) => {
    rejectAbort = reject;
  });
  const onAbort = () => rejectAbort(new DOMException("Aborted", "AbortError"));
  controller.signal.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => {
    expired = true;
    controller.abort();
  }, 70000);
  try {
    if (controller.signal.aborted)
      throw new DOMException("Aborted", "AbortError");
    const query = new URLSearchParams({
      user: input.username.trim(),
      timeframe: input.period,
      size: String(input.size),
    });
    let response: Response;
    try {
      response = await Promise.race([
        fetch(`/api/v1/generate?${query}`, { signal: controller.signal }),
        interrupted,
      ]);
    } catch (error) {
      if (controller.signal.aborted) throw error;
      throw new Error(
        "Cannot connect. Check that the local backend is running.",
      );
    }
    if (!response.ok) {
      let envelope: unknown;
      try {
        envelope = await Promise.race([
          response.json() as Promise<unknown>,
          interrupted,
        ]);
      } catch (error) {
        if (controller.signal.aborted) throw error;
        throw new Error(genericFailure);
      }
      const code =
        typeof envelope === "object" &&
        envelope !== null &&
        "error" in envelope &&
        typeof envelope.error === "object" &&
        envelope.error !== null &&
        "code" in envelope.error
          ? envelope.error.code
          : undefined;
      throw new Error(
        typeof code === "string" && Object.hasOwn(messages, code)
          ? messages[code]
          : genericFailure,
      );
    }
    if (
      response.headers
        .get("Content-Type")
        ?.split(";")[0]
        .trim()
        .toLowerCase() !== "image/png"
    )
      throw new Error(genericFailure);
    try {
      return await Promise.race([response.blob(), interrupted]);
    } catch (error) {
      if (controller.signal.aborted) throw error;
      throw new Error(genericFailure);
    }
  } catch (error) {
    if (expired) throw new Error(messages.timeout);
    if (controller.signal.aborted)
      throw new DOMException("Aborted", "AbortError");
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
    controller.signal.removeEventListener("abort", onAbort);
  }
}
