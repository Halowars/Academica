# Academica

An academic writing workspace inspired by [Linea](https://github.com/Halowars/Linea). This version is a static React/Vite application for **GitHub Pages**, with optional **Firebase Authentication and Firestore on Spark**. It has no ChatGPT hosting or runtime dependency.

The original Linea repository is separate and unchanged.

## Use

### 0.5 research and layout update

Write mode now shows physical sheets with automatic gaps within paragraphs, page numbers, and a Fit width / writing zoom control. The document remains continuous for selection, undo, and editing. Tab sets a first-line paragraph indent or inserts a real tab in running text; Shift+Tab removes paragraph indentation. Lists and tables retain their own Tab navigation. Escape releases keyboard focus from the editor.

Paper → Format opens a document inspector for fonts, size, line spacing, margins, paper size, indentation, headers, numbering, contents, and figure/table lists. Workspace appearance remains separate. Profiles describe defaults and custom differences, not a promise to satisfy every institution or journal. At narrow/iPad split widths the outline is a drawer and the inspector is a bottom sheet; pages scale without changing their physical dimensions. Native Safari/iPad hardware QA remains pending.

The six CSL profiles are APA 7, MLA 9, Chicago 18 author–date, IEEE, NLM/Vancouver, and AMA 11. Document outlines include essays, research papers, reviews, technical/lab reports, conference papers, theses, and dissertations. Section settings provide roles and reordering. More advanced university-specific rules remain tracked in [ROADMAP.md](ROADMAP.md).

Quotation text is editable; legacy protected objects migrate without losing their citation identities. Manually typed quotations are red and clickable. Closing a substantial quote with a unique exact imported-source match inserts a citation automatically. Other typed quotations remain editable and can be connected by clicking them. Clicking a linked quotation opens and highlights its exact source text; repeated matches have navigation. The gutter explains verification/connection status on hover. A wording match is not proof that an argument is valid.

Saved passages now have a visible home inside each source in the Research desk. Search within articles, jump back to a saved passage, insert it, or remove it. The desk height is adjustable. `/evidence` connects a saved or imported passage to selected writing and inserts a citation. Select text and choose **Insert → Highlight & label**, or press **Ctrl/Cmd+Shift+L**, to mark a topic, thesis, claim, or custom category in your chosen color. Only the highlight appears in the manuscript; hover to read the label and click the words to edit normally. Use the same tool with a selection or cursor inside a highlight to change or remove it. `/label` opens that tool; `/claim` has been removed. `/break` adds a real page break; `/footnote` adds a numbered submission footnote. `/ref` remains the internal cross-reference command. Ctrl/Cmd+K searches the entire project, including article text, saved passages, notes, objects, and labels.

In 0.5.1, source-linked quotation text is excluded from spelling warnings only while its current wording exactly matches the imported article (with the same typography/PDF wrapping normalization used by verification). Missing or changed wording, manual-only saved passages, and ordinary manuscript text remain checked. Source refreshes recheck the quotation. Source matching, citation formatting, unchanged text blocks, article rendering, and page-break position lookups are cached or limited to the work that changed. Edits still reach the project store immediately, and autosave follows the edit generation rather than relying on millisecond timestamps. Run `node tests/benchmark.mjs` for a reproducible synthetic source-library performance comparison; its timing is not a hardware-independent typing-latency guarantee.

Revisions → Compare drafts shows block additions, removals, and changes. Restore an individual block with a recovery revision saved first. Review includes missing sources/locators, changed quote wording, dangling internal references, duplicate DOIs, empty sections, and unreferenced objects. Source health checks query Crossref's registered updates, including correction/retraction notices where deposited; an absent notice is not a source quality guarantee.

Sources → Import accepts RIS, BibTeX, CSL-JSON, saved article text/HTML, and provides the desktop clipper download. Zotero libraries can be exported to the supported reference formats. Export → More formats includes HTML, Markdown, LaTeX and Typst source ZIPs with image assets and references, plus source-library exports. Word export follows selected document fonts, spacing, margins, page size, tab characters, and numbered footnotes. Basic DOCX import creates a separate paper and explicitly reports its supported text/heading subset; it is not a high-fidelity reviewer round-trip.

### Desktop clipper

Sources → Import → **Desktop Chrome Clipper** downloads an unpacked extension. Unzip, open `chrome://extensions` or `edge://extensions`, enable Developer mode, and choose Load unpacked. See [extension/README.md](extension/README.md). The extension uses activeTab only when invoked, reads the selected article/selection, and asks for review inside Academica before saving. It is desktop-only and is not automatically installed or published to the Web Store. Installation/runtime QA in an authorized desktop browser remains pending.

Open the site and start writing. Device autosave works before signing in. Manuscript contains all writing sections **and the final References / Works Cited page**. The outline can also open one section, the source library, revisions, or the bibliography separately.

Use the floating layout controls to hide the outline, hide the toolbar, enter focus view, or customize the workspace. The defaults use a slate canvas and warm paper; change the canvas, page, text, accent, editor font, size, spacing, and background pattern. Exported academic formatting is independent of these editor preferences. There is no logo or promotional name printed on manuscript pages.

The Paper library is a separate screen with explicit Open actions. The current paper stays selected across reloads; creating a paper requires an explicit Create & open action. Sections and ordinary edits do not create papers.

| Command | Result |
| --- | --- |
| `/cite` | Small source picker beside the cursor; click a title to insert immediately. |
| `/note` | Subtle inline marker opening a private passage note. |
| `/todo` | Inline checklist marker; completed items cross out. |
| `/heading` | Add a manuscript section. |
| `/figure`, `/table`, `/equation` | Insert a structured document object. |
| `/ref` | Insert an updating cross-reference. |

Alt+T selects title text, Alt+P paragraph, Alt+H heading. Ctrl/Command+Shift+T/P/H are alternative shortcuts. Bold, italic, underline, lists, citation, passage note, checklist, undo, and redo are in the toolbar. There is no `/quote` command or AI detector.

## Sources

Paste a DOI or article URL into Sources. DOI links use Crossref directly. ScienceDirect PII links are resolved through Crossref's exact alternative ID filter, so metadata does not depend on fetching a publisher page. The requested article `S0254058401005752` was verified to resolve to Somani and Radhakrishnan (2003), *Electrochromic materials and devices: present and future*, Materials Chemistry and Physics, 77(1), 117–133, DOI `10.1016/S0254-0584(01)00575-2`.

PMC articles use Europe PMC’s public full-text XML API, including title, authors, date, journal details, headings, and readable paragraphs. PubMed and DOI imports also look for an available PMC copy. Direct PDF links download and extract text in the browser, then use a DOI found in the PDF to fill reference details from Crossref. Both `PMC12026796` and the SCITEPRESS `138274.pdf` link have been checked in the browser. Conference papers keep their proper CSL source type.

Other public HTTPS pages first try direct retrieval, then the no-key [Jina Reader API](https://jina.ai/reader/) when direct browser access fails. This provides server-side fetching and extraction without adding Firebase Cloud Functions or a billing plan. The Sources → Web reading options setting can disable this service. It receives the public article URL; Academica sends no manuscript text, notebook, authentication cookie, password, or API key. Private/local addresses and links containing access-token query parameters are excluded. The external service has its own availability and rate limits.

No automatic route is universal. CAPTCHA pages, sign-in screens, access-denied responses, and rate limits become clear failures rather than saved article text; an observed publisher verification page is not retried through the public reader. Available web text is labelled as potentially partial, and a failed refresh preserves any previously saved copy. Old metadata-only sources get one new retrieval attempt with this reader version. Reader options → Refresh article text allows an explicit retry or update.

The Research desk’s **Add article text** recovery imports copied text or a saved HTML/TXT/Markdown file. Sources also has **Import article text**. HTML is parsed locally with Mozilla Readability, keeps available citation metadata/headings, and never executes page scripts. A matching DOI can fill reference details through Crossref. Existing manual reference edits are retained; a conflicting HTML/PDF DOI is rejected. Plain pasted text does not invent printed page numbers or source paragraph locations. PDF upload remains available in Reader options. Imported text stays in the project and follows the same device/cloud autosave as writing; private working notes remain separate.

Citation profiles use citeproc-js and official CSL styles. Only cited sources enter the generated bibliography. Pasting a substantial passage or quoted text opens a small source picker. Short typed phrases are not automatically cited; longer unique exact matches are. `/cite` after a quoted passage detects it; after a paraphrase, it inserts a citation without replacing the writing. Click an article name, or press Enter on the highlighted result, to insert immediately. An optional location override remains available before choosing.

Quotation checks compare wording locally against the imported article text, normalizing typography, whitespace, and PDF line-wrap hyphenation. They do not use fuzzy or AI matching. A match can fill its section/paragraph or verified printed PDF page. PDF sheet indexes are never substituted for printed pages, and repeated wording does not invent a unique location. Saved manual passages are distinguished from article verification; missing locations and unverified quotes are flagged in Review. A successful wording match does not establish that the source’s claim is correct. Quotations remain red while editing and standard academic text in the submitted paper.

## Spelling and privacy

Spelling uses [nspell](https://github.com/wooorm/nspell) with a Hunspell-compatible American English dictionary. It runs in a local Web Worker, with a fine underline and click-to-correct suggestions. No paper text is sent to a spelling service. Add specialist terms to the personal dictionary. This is spelling support, not a grammar or research-quality score.

Passage notes, checklists, and the general Research desk notebook are separate. Private working content is excluded from Paper, Print/PDF, and Word output. Project backups intentionally include private notes and source data so the project can be restored.

## Free Firebase setup

See [SETUP.md](SETUP.md). Firebase is optional for local use. The deployed configuration uses the existing Linea project on Spark, email/password Authentication, and separate Academica Firestore collections. Spark supports Authentication and Firestore within its free quotas. This app does not deploy Cloud Functions, use a paid scraping proxy, or depend on Firebase Storage. Images are resized when needed and embedded in the project; original PDF files are processed locally, with extracted text stored in the project. Large projects can exceed Firestore's record limit; the UI then states that the device copy is saved and recommends a backup. Cloud saving is not claimed until Firebase confirms a write.

Cloud records are under `academicaUsers/{uid}/papers` and `/revisions`, isolated by owner rules. Local account caches are also separated. Revision comparisons prevent a stale tab from overwriting a newer cloud draft. Restoring a revision saves the preceding draft first. Download project backups regularly.

## Build and deploy

Node 22.13+ and pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm run build
```

`dist/` is a complete static website. `pnpm dev` starts local development. `scripts/prepare-assets.mjs` copies the matching PDF worker, spelling dictionary, Paged.js, KaTeX fonts, and license notices from locked dependencies before dev/build. Generated vendor files and `node_modules` do not belong in the source repository.

The public repository is [Halowars/Academica](https://github.com/Halowars/Academica), deployed at [halowars.github.io/Academica](https://halowars.github.io/Academica/). Pages uses **GitHub Actions**. The included workflow tests, builds, and deploys `dist/`. Relative asset paths support project pages such as `/Academica/`; no server routes are required.

The core test suite covers quotation paste behavior, slash command replacement, exact text matching, source imports, storage separation, spelling, and exports. Firestore access tests use an isolated `demo-academica` emulator project:

```sh
firebase emulators:exec --project demo-academica --only firestore "node tests/firestore.test.mjs"
```

Use a current Firebase CLI and its supported Java runtime. These tests exercise the supplied rules without production data. The shared rules preserve the original Linea drafts block; review shared-project changes before deploying them elsewhere.

## Limits

See [ROADMAP.md](ROADMAP.md) for completed and remaining accepted work. Institution-specific dissertation front matter, Roman-numbered preliminaries, two-column profiles, original-PDF facsimile reading/OCR, and advanced Word review round-trips remain future work. DOCX exports equations as LaTeX text. Typst source exports retain LaTeX equation text with a conversion note because its math syntax differs. Print/PDF uses the same Paged.js layout as Paper view. Browser and printer settings still affect the print dialog.

Build preparation applies an exact, guarded continuation-offset patch to Paged.js 0.4.3. This fixes repeated-text paragraphs that could otherwise duplicate content and drop later sections. The Paper renderer compares each composed writing block with its source text before enabling print. Printer zero-margin rules are added only after composition so they cannot erase manuscript margins.

## Licenses

CSL APA, MLA, Chicago, IEEE, NLM/Vancouver, AMA, and locale XML retain embedded CC BY-SA 3.0 attribution. The style files are copied unmodified from citation-style-language/styles; Vancouver is now named `nlm-citation-sequence` upstream. nspell is MIT; dictionary-en retains its included original dictionary notices and multi-license terms. Paged.js and KaTeX are MIT; PDF.js and Mozilla Readability are Apache-2.0; citeproc-js is BSD-2-Clause. Build preparation includes the corresponding vendor license files. This application is provided under MIT; see LICENSE.
