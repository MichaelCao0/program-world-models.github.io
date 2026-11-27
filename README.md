# Program World Model

A buildless multi-page static GitHub Pages research portal (with `.nojekyll`) for the **Program World Model** workstream, connecting four routes over a shared bilingual (`EN` / `中文`) Light/Dark shell (`Inter`, `JetBrains Mono`, `Noto Sans SC`, `0.5px` hairline borders, neutral monochrome surfaces with warm sand-gray accents).

## Site Architecture

| Route | Title | Files | Purpose |
| --- | --- | --- | --- |
| `/` | **Overview** | `index.html`, `styles.css`, `script.js` | Research thesis, interactive `world.step` inspector, `L0–L4` paradigm spectrum, pixel-vs-program split comparison, and core invariants (`data-pwm-page="overview"`, `data-pwm-base="."`). |
| `/survey/` | **01 · Survey & Dot Atlas** | `survey/index.html`, `survey/styles.css`, `survey/app.js`, `survey/data.js`, `survey/extra_refs.js` | 201-paper Code World Models catalogue synced from `Awesome-Code-World-Model` + 32 `L0–L4` survey comparators (233 cited works), `#atlasField` chronological dot-matrix canvas, `L0–L4` master system matrix, `L0–L4` workbench & boundary pitfalls, split-screen case comparison, observability/evaluation contract tables, 9-chapter outline, unified `L0–L4` search + `⌘K` palette, and BibTeX export (`data-pwm-page="survey"`, `data-pwm-base=".."`). |
| `/arena/` | **02 · Evaluation Benchmark** *(In Progress)* | `arena/index.html`, `arena/arena.js`, `arena/arena.css` (reusing `../styles.css`) | Minimalist **In Progress** status sub-page while the benchmark suite is on hold for iteration, with no unreleased task details or rankings disclosed (`data-pwm-page="arena"`, `data-pwm-base=".."`). |
| `/method/` | **03 · Modeling Method** *(In Progress)* | `method/index.html`, `method/method.js`, `method/method.css` (reusing `../styles.css`) | Minimalist **In Progress** status sub-page while the modeling method is in preparation, with no unreleased architectural details, paper claims, or benchmark numbers disclosed (`data-pwm-page="method"`, `data-pwm-base=".."`). |

### Shared Shell & Relative Path Portability

- **`shared/shell.css` & `shared/shell.js`**: Mounts the global top announcement bar, sticky 4-route header (`#pwm-shell-header`), `#pwmExtraNavSlot` extension point (used by `/survey/` for `Search... ⌘K` and `Style: Clean/Classic`), and sibling sub-navigation grid (`#pwm-shell-subnav`). Exposes `window.PWM_SHELL` (`lang`, `theme`, `onChange`, `setLang`, `setTheme`) with URL query (`?lang=`, `?theme=`) and `localStorage` persistence (`pwm-language`/`cwm_lang`, `pwm-theme`/`cwm_theme`).
- **Relative intra-site links**: All internal links use relative paths (`./survey/`, `../arena/`, `../method/`, `../`) rather than root-absolute paths so every route resolves identically under local static preview, GitHub Pages project subpaths (`/program-world-models.github.io/`), and custom domains.

## Syncing Survey Data (`scripts/sync_survey_data.py`)

`scripts/sync_survey_data.py` uses Python 3 standard library modules only (`json`, `sys`, `urllib.request`, `pathlib`) to generate `survey/data.js` (`window.CWM_DATA`) from `papers.json`, `classification.json`, and `readme.zh-CN.json` without modifying the upstream `Awesome-Code-World-Model` repository:

- **Local sibling checkout (default)**:
  ```bash
  python3 scripts/sync_survey_data.py
  ```
  Reads `../Awesome-Code-World-Model/data/` when present, falling back to GitHub raw URLs.
- **Remote GitHub fetch (`--remote`)**:
  ```bash
  python3 scripts/sync_survey_data.py --remote
  ```
  Fetches directly from `https://raw.githubusercontent.com/FreedomIntelligence/Awesome-Code-World-Model/main/data/`, falling back to a local sibling checkout or preserving an existing `survey/data.js` if offline.

## Local Preview

```bash
python3 -m http.server 4173 --directory .
```

Open <http://127.0.0.1:4173/> (and `./survey/`, `./arena/`, `./method/`).

## CI & GitHub Pages Deployment (`.github/workflows/pages.yml`)

- **Triggers**: runs on `push` to `main`, daily via `schedule` (`0 6 * * *` UTC), and manually via `workflow_dispatch`.
- **Build & deploy**: checks out the repository, configures Python `3.11` (`actions/setup-python@v5`), runs `python3 scripts/sync_survey_data.py --remote` to refresh `survey/data.js`, uploads the static site artifact (`actions/upload-pages-artifact@v3`, `path: .`), and deploys to GitHub Pages (`actions/deploy-pages@v4`).
