# Academica

An academic writing workspace inspired by [Linea](https://github.com/Halowars/Linea). This version is a static React/Vite application for **GitHub Pages**, with optional **Firebase Authentication and Firestore on Spark**. It has no ChatGPT hosting or runtime dependency.

The original Linea repository is separate and unchanged.

## Use

Open the site and start writing. Device autosave works before signing in. Manuscript contains all writing sections **and the final References / Works Cited page**. The outline can also open one section, the source library, revisions, or the bibliography separately.

Use the floating layout controls to hide the outline, hide the toolbar, enter focus view, or customize the workspace. The defaults use a slate canvas and warm paper; change the canvas, page, text, accent, editor font, size, spacing, and background pattern. Exported academic formatting is independent of these editor preferences. There is no logo or promotional name printed on manuscript pages.

The Paper library is a separate screen with explicit Open actions. The current paper stays selected across reloads; creating a paper requires an explicit Create & open action. Sections and ordinary edits do not create papers.

| Command | Result |
| --- | --- |
| `/cite` | Small source picker beside the cursor; the command text disappears. |
| `/note` | Subtle inline marker opening a private passage note. |
| `/todo` | Inline checklist marker; completed items cross out. |
| `/heading` | Add a manuscript section. |
| `/figure`, `/table`, `/equation` | Insert a structured document object. |
| `/ref` | Insert an updating cross-reference. |

Alt+T selects title text, Alt+P paragraph, Alt+H heading, Alt+Q block quote. Ctrl/Command+Shift+T/P/H are alternative shortcuts. Bold, italic, underline, lists, citation, passage note, checklist, undo, and redo are in the toolbar. There is no `/quote` command or AI detector.

## Sources

Paste a DOI or article URL into Sources. DOI links use Crossref directly. ScienceDirect PII links are resolved through Crossref's exact alternative ID filter, so metadata does not depend on fetching a publisher page. The requested article `S0254058401005752` was verified to resolve to Somani and Radhakrishnan (2003), *Electrochromic materials and devices: present and future*, Materials Chemistry and Physics, 77(1), 117–133, DOI `10.1016/S0254-0584(01)00575-2`.

PubMed links can resolve through Europe PMC. Other links attempt readable metadata only where browser cross-origin access permits it. A persistent error explains failed imports and offers manual entry with the original URL retained. The app never silently replaces failure with a blank source. Successful metadata import does not imply access to full article text. Upload a selectable-text PDF or save passages manually for the reader. Scanned PDFs require manual passages. Reference fields and per-style bibliography wording remain editable.

APA 7 and MLA 9 use citeproc-js and official CSL styles. Only cited sources enter the generated bibliography. A typed quotation that exactly matches one saved passage can connect automatically; otherwise a small picker requests its source and location. Do not infer printed page numbers from PDF indexes.

## Spelling and privacy

Spelling uses [nspell](https://github.com/wooorm/nspell) with a Hunspell-compatible American English dictionary. It runs in a local Web Worker, with a fine underline and click-to-correct suggestions. No paper text is sent to a spelling service. Add specialist terms to the personal dictionary. This is spelling support, not a grammar or research-quality score.

Passage notes, checklists, and the general Research desk notebook are separate. Private working content is excluded from Paper, Print/PDF, and Word output. Project backups intentionally include private notes and source data so the project can be restored.

## Free Firebase setup

See [SETUP.md](SETUP.md). Firebase is optional for local use. Spark supports email/password Authentication and Firestore within its free quotas. This app does not deploy Cloud Functions, use a paid scraping proxy, or depend on Firebase Storage. Images are resized when needed and embedded in the project; original PDF files are processed locally, with extracted text stored in the project. Large projects can exceed Firestore's record limit; the UI then states that the device copy is saved and recommends a backup. Cloud saving is not claimed until Firebase confirms a write.

Cloud records are under `academicaUsers/{uid}/papers` and `/revisions`, isolated by owner rules. Local account caches are also separated. Revision comparisons prevent a stale tab from overwriting a newer cloud draft. Restoring a revision saves the preceding draft first. Download project backups regularly.

## Build and deploy

Node 22.13+ and pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm run build
```

`dist/` is a complete static website. `pnpm dev` starts local development. `scripts/prepare-assets.mjs` copies the matching PDF worker, spelling dictionary, Paged.js, KaTeX fonts, and license notices from locked dependencies before dev/build. Generated vendor files and `node_modules` do not belong in the source repository.

GitHub: create a public repository named Academica, upload this source, then set Settings → Pages → Source to **GitHub Actions**. The included workflow tests, builds, and deploys `dist/`. Relative asset paths support project pages such as `/Academica/`; no server routes are required.

## Limits

Institution-specific dissertation front matter and advanced submission profiles remain future work. Dissertation mode provides a starting outline and numbered sections. DOCX exports equations as LaTeX text and simplifies bibliography typography. Print/PDF uses the same Paged.js layout as Paper view. Browser and printer settings still affect the print dialog.

## Licenses

CSL APA, MLA, and locale XML are unmodified and retain embedded CC BY-SA 3.0 attribution. nspell is MIT; dictionary-en retains its included original dictionary notices and multi-license terms. Paged.js and KaTeX are MIT; PDF.js and Mozilla Readability are Apache-2.0; citeproc-js is BSD-2-Clause. Build preparation includes the corresponding vendor license files. This application is provided under MIT; see LICENSE.
