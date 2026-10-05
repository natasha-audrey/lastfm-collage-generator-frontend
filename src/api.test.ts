import { generateCollage } from "./api";
test("encodes the trimmed username and chosen listening period and grid size", async () => {
  const png = new Blob(["png"], { type: "image/png" });
  const fetchMock = jest.mocked(fetch).mockResolvedValue({
    ok: true,
    headers: new Headers({ "Content-Type": "image/png" }),
    blob: async () => png,
  } as Response);
  await expect(
    generateCollage(
      { username: " a & b ", period: "1month", size: 3 },
      new AbortController().signal,
    ),
  ).resolves.toBe(png);
  expect(fetchMock.mock.calls[0][0]).toBe(
    "/v1/generate?user=a+%26+b&timeframe=1month&size=3",
  );
});

test.each([
  ["user_not_found", "That Last.fm user was not found."],
  ["no_albums", "No albums were found"],
  ["busy", "The service is busy"],
  ["timeout", "Generation took too long"],
  ["upstream_error", "music service is temporarily unavailable"],
  ["internal_error", "collage service encountered a problem"],
  ["invalid_request", "Check your username"],
  ["unknown", "Unable to generate"],
])("maps %s to safe frontend wording", async (code, message) => {
  jest.mocked(fetch).mockResolvedValue({
    ok: false,
    json: async () => ({ error: { code, message: "secret backend detail" } }),
  } as Response);
  await expect(
    generateCollage(
      { username: "user", period: "7day", size: 5 },
      new AbortController().signal,
    ),
  ).rejects.toThrow(message);
  expect(fetch).toHaveBeenCalledTimes(1);
});
test.each([null, {}, { error: null }, { error: { code: 42 } }])(
  "handles malformed error envelopes safely: %j",
  async (body) => {
    jest
      .mocked(fetch)
      .mockResolvedValue({ ok: false, json: async () => body } as Response);
    await expect(
      generateCollage(
        { username: "user", period: "7day", size: 5 },
        new AbortController().signal,
      ),
    ).rejects.toThrow("Unable to generate");
  },
);
test("rejects an unexpected success content type", async () => {
  jest.mocked(fetch).mockResolvedValue({
    ok: true,
    headers: new Headers({ "Content-Type": "text/html" }),
  } as Response);
  await expect(
    generateCollage(
      { username: "user", period: "7day", size: 5 },
      new AbortController().signal,
    ),
  ).rejects.toThrow("Unable to generate");
});
test("connection failure suggests checking the backend", async () => {
  jest.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));
  await expect(
    generateCollage(
      { username: "user", period: "7day", size: 5 },
      new AbortController().signal,
    ),
  ).rejects.toThrow("local backend is running");
});
test.each(["fetch", "body"])(
  "the deadline aborts a stalled %s, including response-body consumption",
  async (stage) => {
    jest.useFakeTimers();
    let signal: AbortSignal | undefined;
    jest.mocked(fetch).mockImplementation(async (_, init) => {
      signal = init?.signal as AbortSignal;
      if (stage === "fetch") return new Promise(() => {});
      return {
        ok: true,
        headers: new Headers({ "Content-Type": "image/png" }),
        blob: () => new Promise(() => {}),
      } as Response;
    });
    const request = generateCollage(
      { username: "user", period: "7day", size: 5 },
      new AbortController().signal,
    );
    const assertion = expect(request).rejects.toThrow(
      "Generation took too long",
    );
    await jest.advanceTimersByTimeAsync(69999);
    expect(signal?.aborted).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    await assertion;
    expect(signal?.aborted).toBe(true);
  },
);
test("caller teardown aborts even a transport that ignores cancellation", async () => {
  jest.mocked(fetch).mockImplementation(() => new Promise(() => {}));
  const controller = new AbortController();
  const request = generateCollage(
    { username: "user", period: "7day", size: 5 },
    controller.signal,
  );
  controller.abort();
  await expect(request).rejects.toMatchObject({ name: "AbortError" });
});

test("a failed PNG body read uses safe wording rather than transport details", async () => {
  jest.mocked(fetch).mockResolvedValue({
    ok: true,
    headers: new Headers({ "Content-Type": "image/png" }),
    blob: async () => {
      throw new Error("private transport details");
    },
  } as unknown as Response);
  await expect(
    generateCollage(
      { username: "user", period: "7day", size: 5 },
      new AbortController().signal,
    ),
  ).rejects.toThrow("Unable to generate");
});
test("a non-JSON proxy error uses generic wording", async () => {
  jest.mocked(fetch).mockResolvedValue({
    ok: false,
    json: async () => {
      throw new SyntaxError("HTML proxy response");
    },
  } as unknown as Response);
  await expect(
    generateCollage(
      { username: "user", period: "7day", size: 5 },
      new AbortController().signal,
    ),
  ).rejects.toThrow("Unable to generate");
});

test.each(["toString", "constructor", "__proto__"])(
  "unknown code %s receives generic wording",
  async (code) => {
    jest.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: { code } }),
    } as Response);
    await expect(
      generateCollage(
        { username: "user", period: "7day", size: 5 },
        new AbortController().signal,
      ),
    ).rejects.toThrow("Unable to generate");
  },
);
