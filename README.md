# Last.fm collage frontend

A local React and TypeScript frontend for the Last.fm collage generator. Enter a
Last.fm username, choose a listening period and grid size, and press Generate.
The last successful collage stays visible while its replacement is generated.

## Setup

Use Node **24.21.0** (`nvm install && nvm use`) and pnpm **12.8.2**, pinned in
`.nvmrc` and `package.json`. Install that pnpm version with your package-manager
installation method, then run:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Run the backend in a separate terminal from its own repository root. Configure
its existing environment and `API_KEY`, then run:

```sh
source .envrc
go build
./lastfm-collage-generator serve
```

The backend defaults to `http://127.0.0.1:8080`. The frontend requests
`/v1/generate`; Vite proxies only that exact route to the backend,
preserving the path and query parameters. To use a different local backend:

```sh
BACKEND_URL=http://127.0.0.1:9090 pnpm dev
```

Use `serve --listen 127.0.0.1:9090` for the corresponding backend address.
`BACKEND_URL` can also be set in `.env.local`. Keep `API_KEY` and other credentials
in the backend environment. The frontend never needs Last.fm credentials.

## Development checks

- `pnpm check`: run every quality gate below, stopping at the first failure.
- `pnpm format:check`: check Prettier formatting; `pnpm format` writes formatting.
- `pnpm lint`: check TypeScript, React hooks, and JSX accessibility with no warnings.
- `pnpm typecheck`: strict TypeScript checking of application, tests, and configuration.
- `pnpm test`: run Jest once; `pnpm test:watch` runs interactive watch mode.
- `pnpm test:ci`: run Jest in CI mode, failing when no tests exist.
- `pnpm build`: create the production bundle in `dist`.
- `pnpm preview`: inspect that bundle locally. The preview does not provide the
  development API proxy; deployment architecture is outside this version.

GitHub Actions runs the stable `quality` check for pull requests and pushes to
`main`, with a frozen lockfile and the same pinned toolchain. Require `quality`
in the repository's branch protection/rules before merging.

Tests exercise the real API boundary with controlled fetch fixtures, fake timers,
and image load/error events. All network requests are isolated; no backend process
or Last.fm credentials are required. They cover form behavior, error mapping,
request/body deadlines, teardown cancellation, and temporary image ownership.
Jest/jsdom does not establish browser PNG decoding, layout, focus appearance,
assistive-technology behavior, or actual proxy/backend cancellation propagation.
Those checks are deferred to [deployment preparation, issue #6](https://github.com/natasha-audrey/lastfm-collage-generator-frontend/issues/6).

The approved UI and integration requirements are recorded in
[the planning map and its linked resolutions](https://github.com/natasha-audrey/lastfm-collage-generator-frontend/issues/1).
The retained `collage-layout.prototype.html` is a throwaway visual reference.
