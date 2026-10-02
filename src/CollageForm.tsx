import { useState, type FormEvent } from "react";
import type { CollageRequest, ListeningPeriod } from "./api";
const periods: [ListeningPeriod, string][] = [
  ["7day", "Last 7 days"],
  ["1month", "Last month"],
  ["3month", "Last 3 months"],
  ["6month", "Last 6 months"],
  ["12month", "Last 12 months"],
  ["overall", "All time"],
];
export function CollageForm({
  loading,
  onSubmit,
}: {
  loading: boolean;
  onSubmit: (input: CollageRequest) => void;
}) {
  const [username, setUsername] = useState("");
  const [period, setPeriod] = useState<ListeningPeriod>("7day");
  const [size, setSize] = useState(5);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ username: username.trim(), period, size });
  }
  return (
    <form onSubmit={submit} aria-label="Generate a collage">
      <fieldset disabled={loading}>
        <label className="username">
          Last.fm username
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="off"
            aria-describedby="message"
            placeholder="Your Last.fm username"
          />
        </label>
        <label>
          Listening period
          <select
            value={period}
            onChange={(event) =>
              setPeriod(event.target.value as ListeningPeriod)
            }
          >
            {periods.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Grid size
          <select
            value={size}
            onChange={(event) => setSize(Number(event.target.value))}
          >
            {Array.from({ length: 8 }, (_, i) => i + 3).map((value) => (
              <option key={value} value={value}>
                {value} × {value}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Generate</button>
      </fieldset>
    </form>
  );
}
