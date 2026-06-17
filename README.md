# Midnight Pizzeria Merge

A mobile-first, open-source-style merge game based on classic 2048 mechanics. The theme is an original haunted animatronic pizza-arcade tribute with custom CSS/SVG art, no external dependencies, and no official franchise names, logos, ripped assets, or exact character designs.

The root app is `index.html`. The previous ChessLab page is preserved at `chesslab.html`, and Water Sort is available at `games/water-sort/`.

## Run locally

Open `index.html` directly in a browser to play.

For PWA service worker testing, serve the folder from a local HTTP server:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/`.

## Deploy with GitHub Pages

1. Commit and push the repository to GitHub.
2. In the repository, open **Settings**.
3. Go to **Pages**.
4. Set **Source** to deploy from the `main` branch and the root folder.
5. Save, then open the Pages URL after GitHub finishes publishing.

The app uses relative paths, so it works from a repository Pages URL such as `https://USERNAME.github.io/REPOSITORY/`.

## Optional global leaderboards

By default, merge and chess scores are saved locally in each browser. To share scores across all players, create a Supabase project and run the SQL in `supabase-leaderboard.sql` from the Supabase SQL Editor.

Then edit `leaderboard-config.js`:

```js
window.MPM_LEADERBOARD_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT_REF.supabase.co",
  supabaseAnonKey: "YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY",
  tableName: "pizzeria_leaderboard",
  chessTableName: "chesslab_leaderboard"
};
```

Use only the anon/publishable key in frontend code. Do not put a Supabase service-role key or database password in this repository.

Both games still work without this configuration; they will show local-only leaderboards or local fallbacks if the global score service is unavailable. ChessLab scores completed games as 3 points for a win, 1 point for a draw, and 0 points for a loss.

## Add to iPhone Home Screen

1. Open the GitHub Pages URL in Safari on iPhone.
2. Tap the Share button.
3. Choose **Add to Home Screen**.
4. Confirm the name and tap **Add**.

## License

This implementation was written from scratch and does not copy 2048 source code.

MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
