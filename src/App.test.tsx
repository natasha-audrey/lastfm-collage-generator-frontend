import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
test("starts with agreed defaults and validates whitespace without generating", async () => {
  render(<App />);
  expect(screen.getByLabelText("Last.fm username")).toHaveValue("");
  expect(screen.getByLabelText("Listening period")).toHaveValue("7day");
  expect(screen.getByLabelText("Grid size")).toHaveValue("5");
  await userEvent.type(screen.getByLabelText("Last.fm username"), "   ");
  await userEvent.click(screen.getByRole("button", { name: "Generate" }));
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Enter a Last.fm username.",
  );
  expect(fetch).not.toHaveBeenCalled();
});

import { act, fireEvent, waitFor } from "@testing-library/react";
let candidates: HTMLImageElement[];
let revoke: jest.Mock;
beforeEach(() => {
  candidates = [];
  let id = 0;
  URL.createObjectURL = jest.fn(() => `blob:collage-${++id}`);
  revoke = jest.fn();
  URL.revokeObjectURL = revoke;
  jest.spyOn(window, "Image").mockImplementation(() => {
    const image = document.createElement("img");
    candidates.push(image);
    return image;
  });
});
function success() {
  jest.mocked(fetch).mockResolvedValue({
    ok: true,
    headers: new Headers({ "Content-Type": "image/png" }),
    blob: async () => new Blob(["png"], { type: "image/png" }),
  } as Response);
}
async function loadCandidate(index: number) {
  await waitFor(() => expect(candidates).toHaveLength(index + 1));
  await act(async () => fireEvent.load(candidates[index]));
}
test("edits do not generate; Enter submits once, disabling controls and announcing loading", async () => {
  success();
  render(<App />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Last.fm username"), " user & name ");
  await user.selectOptions(
    screen.getByLabelText("Listening period"),
    "overall",
  );
  await user.selectOptions(screen.getByLabelText("Grid size"), "10");
  expect(fetch).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText("Last.fm username"), "{Enter}");
  expect(screen.getByRole("status")).toHaveTextContent("Generating collage…");
  for (const control of [
    screen.getByLabelText("Last.fm username"),
    screen.getByLabelText("Listening period"),
    screen.getByLabelText("Grid size"),
    screen.getByRole("button"),
  ])
    expect(control).toBeDisabled();
  fireEvent.submit(screen.getByRole("form"));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(jest.mocked(fetch).mock.calls[0][0]).toBe(
    "/api/v1/generate?user=user+%26+name&timeframe=overall&size=10",
  );
  await loadCandidate(0);
  expect(screen.getByRole("img")).toHaveAttribute("src", "blob:collage-1");
  expect(screen.getByRole("button")).toBeEnabled();
  expect(screen.getAllByRole("option")).toHaveLength(14);
});
test("keeps the previous image through regeneration and failure, and releases replaced URLs", async () => {
  success();
  const { unmount } = render(<App />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Last.fm username"), "listener");
  await user.click(screen.getByRole("button"));
  await loadCandidate(0);
  await user.click(screen.getByRole("button"));
  await waitFor(() => expect(candidates).toHaveLength(2));
  expect(screen.getByRole("img")).toHaveAttribute("src", "blob:collage-1");
  await act(async () => fireEvent.error(candidates[1]));
  expect(screen.getByRole("alert")).toHaveTextContent("Unable to generate");
  expect(screen.getByLabelText("Last.fm username")).toHaveValue("listener");
  expect(screen.getByRole("img")).toHaveAttribute("src", "blob:collage-1");
  expect(revoke).toHaveBeenCalledWith("blob:collage-2");
  expect(revoke).not.toHaveBeenCalledWith("blob:collage-1");
  await user.click(screen.getByRole("button"));
  await loadCandidate(2);
  expect(screen.getByRole("img")).toHaveAttribute("src", "blob:collage-3");
  expect(revoke).toHaveBeenCalledWith("blob:collage-1");
  unmount();
  expect(revoke).toHaveBeenCalledWith("blob:collage-3");
});
test("service failure preserves the image and inputs and waits for explicit recovery", async () => {
  success();
  render(<App />);
  await userEvent.type(screen.getByLabelText("Last.fm username"), "listener");
  await userEvent.click(screen.getByRole("button"));
  await loadCandidate(0);
  jest.mocked(fetch).mockResolvedValue({
    ok: false,
    json: async () => ({ error: { code: "busy" } }),
  } as Response);
  await userEvent.click(screen.getByRole("button"));
  expect(await screen.findByRole("alert")).toHaveTextContent("service is busy");
  expect(screen.getByRole("img")).toHaveAttribute("src", "blob:collage-1");
  expect(screen.getByLabelText("Last.fm username")).toHaveValue("listener");
  expect(fetch).toHaveBeenCalledTimes(2);
  success();
  await userEvent.click(screen.getByRole("button"));
  await loadCandidate(1);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
test("teardown aborts fetching and ignores late results", async () => {
  let resolve!: (value: Response) => void;
  let signal: AbortSignal | undefined;
  jest.mocked(fetch).mockImplementation((_, init) => {
    signal = init?.signal as AbortSignal;
    return new Promise((done) => {
      resolve = done;
    });
  });
  const { unmount } = render(<App />);
  await userEvent.type(screen.getByLabelText("Last.fm username"), "listener");
  await userEvent.click(screen.getByRole("button"));
  unmount();
  expect(signal?.aborted).toBe(true);
  await act(async () =>
    resolve({
      ok: true,
      headers: new Headers({ "Content-Type": "image/png" }),
      blob: async () => new Blob(["png"]),
    } as Response),
  );
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});
test("teardown releases an image candidate awaiting decoding", async () => {
  success();
  const { unmount } = render(<App />);
  await userEvent.type(screen.getByLabelText("Last.fm username"), "listener");
  await userEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(candidates).toHaveLength(1));
  unmount();
  await act(async () => fireEvent.load(candidates[0]));
  expect(revoke).toHaveBeenCalledTimes(1);
  expect(revoke).toHaveBeenCalledWith("blob:collage-1");
});
