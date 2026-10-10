# Chronicle — Literary Atelier + Live Media Archive

Chronicle keeps its original cinematic / literary design and adds live TMDB and AniList search, title details, and a browser-local watchlist.

## Pages and files

- `index.html` — Home
- `about.html` — About
- `movies.html` — Personal movie archive + live TMDB search
- `anime.html` — Personal anime archive + live AniList search
- `watchlist.html` — Saved titles
- `connect.html` — Links and contact
- `assets/style.css` — shared styling
- `assets/script.js` — existing site interactions
- `assets/api-config.js` — TMDB API key placeholder
- `assets/media-api.js` — API search, details and watchlist logic
- `assets/effects.js` — existing atmosphere and effects
- `assets/movies-data.js`, `assets/anime-data.js` — existing personal archive data

## Set up TMDB

1. Create/sign in to a TMDB account and request an API key: https://www.themoviedb.org/settings/api
2. Open `assets/api-config.js` and replace `PASTE_YOUR_TMDB_V3_API_KEY_HERE` with your TMDB **API Key (v3 auth)**. Keep the quotes.
3. Commit and push the updated files to the repository. AniList's public search does not require an API key.

**Security note:** GitHub Pages is static hosting, so a key used in browser JavaScript is visible to visitors. Use only a TMDB read-only API key, never share a password or private token, and review TMDB's current key terms. For a private server-side credential, the project would need a backend/proxy.

## Watchlist behavior

Watchlist additions are stored in this browser's `localStorage`. They do not automatically sync across browsers/devices or to an AniList account. Clearing browser site data can remove the saved list. AniList account syncing would require a separate OAuth integration.

## Publish on GitHub Pages

Upload/replace the project files in your repository, preserving the `assets/` directory and filenames. The pages reference styles and scripts under `assets/`; do not rename `assets/style.css` to root-level `styles.css` unless you also update every HTML reference.
