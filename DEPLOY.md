# Putting the Fenrir website online

The site is static: five HTML pages, one stylesheet, two small scripts and `versions.json`. There is no build step and no server code.

```
site/
  index.html  host.html  connect.html  link.html  download.html  faq.html  (fenrir.html only redirects to host)
  404.html               the page for a missing address (GitHub Pages serves it with a 404)
  sitemap.xml  robots.txt  the five pages for search engines (robots.txt only counts at a domain's root)
  versions.json          file names, sizes, SHA-256, release date and notes, download base (the pages show no version numbers; the release tag uses the one kept here)
  update-feed.json       versions.json with an Ed25519 signature: what every installed Fenrir reads to update itself (made by fenrir/build/sign_feed.py)
  assets/site.css        tokens, both themes, every component
  assets/site.js         theme toggle, menu, versions.json, FAQ, download chooser, copy buttons
  assets/motion.js       scroll reveals, counters, the magnetic button, frame tilt
  assets/fenrir.svg      assets/connect.svg      assets/wolf.png      assets/wolf-connect.png
  assets/social.jpg  assets/social-connect.jpg  assets/social-link.jpg   the 1200x630 link previews (Open Graph and Twitter cards)
  assets/link.svg  assets/link-qr.svg   Fenrir Link's mark, and a real QR code that opens the Link page
  assets/shots/          your screenshots go here (see below)
  deploy.ps1             optional: publish everything with the gh CLI
```

The pages link to each other without `.html` (`host`, `faq`, and `./` for the home page). GitHub Pages, and most static hosts, serve
`faq.html` at `/faq`, so the addresses stay clean. Opened straight from disk those links find no file: preview through a
local server that maps `/faq` to `faq.html` the same way.

## versions.json is the only place with versions and links

Every page reads it. The download buttons are composed as `releaseBase` + the file name, so moving the downloads somewhere else means changing one line.

| Key | What it is |
|---|---|
| `releaseBase` | Where the files live, ending in `/`. For GitHub: `https://github.com/OWNER/REPO/releases/latest/download/` |
| `releasesPage` | The page with every release, linked from the Download page |
| `released` | Release date, `YYYY-MM-DD` |
| `fenrir.version`, `fenrir.file`, `fenrir.size`, `fenrir.sha256` | The host download (`FenrirSetup.exe`); size in bytes |
| `connect.version`, `connect.file`, `connect.size`, `connect.sha256` | The friends' app (`FenrirConnect.exe`) |
| `portable.file`, `portable.size`, `portable.sha256` | The portable zip of `Fenrir.exe` and `_internal` |
| `notes` | Up to about six short lines for "In this build" |

While `releaseBase` still contains `OWNER`, the Download page greys out its buttons and says the downloads are not published yet. A size of `0` or an empty `sha256` hides that row. The sizes and checksums in it match the files now in `app\`; `deploy.ps1` recomputes them from whatever it uploads.

## Option A: GitHub Pages and GitHub Releases, by hand (free)

### 1. Put the site in a repository

1. On GitHub, create a **public** repository, for example `fenrir`. Pages on a free account needs a public repository.
2. Make this `site` folder the repository root, or copy its contents into a `docs` folder of an existing repository.
3. Commit and push.

### 2. Turn on Pages

Repository **Settings → Pages → Build and deployment**: Source **Deploy from a branch**, branch **main**, folder **/ (root)** (or **/docs**), **Save**. A minute later the site is at `https://OWNER.github.io/REPO/`.

### 3. Put the executables on a release

1. **Releases → Draft a new release**. Tag: `v<version>`, where `<version>` is `fenrir.version` in `versions.json` (create the tag). Title: `Fenrir <version>`.
2. Attach three files:
   - `app\FenrirSetup.exe`
   - `app\FenrirConnect.exe`
   - `Fenrir-portable.zip`: in Explorer, select `app\Fenrir.exe` and `app\_internal` together, right-click, **Compress to ZIP file**, and name it `Fenrir-portable.zip`.
3. **Publish release.**

Keep these three file names for every release. `…/releases/latest/download/<file>` always serves the newest release's copy, so the site never needs a new link.

### 4. Point the site at the release

In `versions.json`, set `releaseBase` to `https://github.com/OWNER/REPO/releases/latest/download/` and `releasesPage` to `https://github.com/OWNER/REPO/releases`. For each file, fill in `size` and `sha256`:

```powershell
(Get-Item .\app\FenrirSetup.exe).Length
(Get-FileHash .\app\FenrirSetup.exe -Algorithm SHA256).Hash.ToLower()
```

Then sign it: `python fenrir\build\sign_feed.py` writes `update-feed.json` next to it. Every installed Fenrir reads that file
to update itself and refuses one its key did not sign, so a `versions.json` change without signing leaves them where they are.
The key lives in `fenrir\build\keys\` on the publishing PC only; never commit or upload it.

Commit and push. Nothing else needs editing.

### 5. Link previews (optional)

The pages' `og:image` tags use the relative path `assets/wolf.png`. X and Discord want a full address, so replace `content="assets/` in those tags with `content="https://OWNER.github.io/REPO/assets/`. `deploy.ps1` does this for you.

## Option B: deploy.ps1 with the gh CLI

Needs [git](https://git-scm.com) and [gh](https://cli.github.com), signed in once with `gh auth login`. From the project folder:

```powershell
powershell -ExecutionPolicy Bypass -File .\site\deploy.ps1 -Owner your-github-name -Repo fenrir
```

It never runs on its own: it needs `-Owner` and `-Repo`, prints its plan and waits for you to type `YES` (or pass `-Yes`). It then zips the portable Fenrir (from a copy, so it works while Fenrir is running), fills in `versions.json` (addresses, sizes, SHA-256) and the preview address, signs `update-feed.json`, commits the site, creates the repository the first time, publishes release `v<version>` with the three files, and only then pushes the site and turns on Pages, so the signed feed never names files that are not there yet. Run it again after a new build and it updates the same repository and release.

The same thing by hand, from inside `site`, once the zip exists:

```powershell
git init -b main; git add -A; git commit -m "Fenrir site"
gh repo create OWNER/REPO --public --source . --remote origin
gh release create v<version> ..\app\FenrirSetup.exe ..\app\FenrirConnect.exe .\Fenrir-portable.zip --title "Fenrir <version>"
git push -u origin main
```

`gh release create` needs the pushed branch to tag, so run `git push` before it if GitHub says the repository is empty. Then turn on Pages as in step 2.

## Option C: Cloudflare Pages or Netlify, drag and drop

- **Cloudflare Pages**: dashboard → **Workers & Pages → Create → Pages → Upload assets**, drag the `site` folder, **Deploy**.
- **Netlify**: open `app.netlify.com/drop` and drag the `site` folder; sign in so the site stays up.

Keep the executables on GitHub Releases either way (Cloudflare Pages takes files up to 25 MiB, and the Setup is about 60 MB) and point `releaseBase` there.

## Screenshots

Drop PNGs into `assets/shots/` with these names, 16:10 and dark, about 1600 × 1000:

`dashboard.png`, `dashboard-light.png` (the Dashboard in light mode, shown when the page is light), `friends.png`, `settings.png`, `connect.png`, `remote.png`.

Until a file exists, its frame shows the screen's name over a grid instead of a broken image. If `dashboard-light.png` is missing, light mode shows `dashboard.png`.

## A new build

1. Build as usual: `python fenrir\build\build.py`.
2. In `versions.json`, move `fenrir.version`, `connect.version` (only when the friends' app changed), `released` and `notes` on.
3. Run `deploy.ps1` again, or publish a new release with the same three file names and fill in the sizes and checksums by hand.

## Before you share the link

- Open `download.html` from its web address: the build numbers show and both buttons are active. (Opened from disk, a browser will not read `versions.json`, and the page says so.)
- Download each file once and check that it starts.
- Switch the theme and resize the window to phone width once.
