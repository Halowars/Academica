# Academica expansion

This is the implementation record for the accepted research-editor direction. Completed items are shipped in 0.5; unchecked items remain work, not hidden or simulated features.

## Shipped in 0.5

- [x] Repair Letter/A4 margins, headers, numbering, bibliography, and Paper preview scaling.
- [x] Fix Paged.js continuation offsets for long paragraphs with repeated wording; verify output text against source blocks before enabling print.
- [x] Live writing sheets, automatic gaps within paragraphs, page counter, writing zoom, manual page breaks.
- [x] Paper formatting inspector: font, size, spacing, indent, margins, paper size, header, page-number position, front matter lists.
- [x] Responsive outline drawer and bottom format sheet at iPad split-screen widths.
- [x] Editable source-linked quotation text; convert legacy protected quote objects without losing citation identity.
- [x] Manual quotations appear red/clickable; substantial exact matches automatically cite a unique saved source.
- [x] Tab/Shift+Tab paragraph indentation, real inline tabs, table navigation, and list nesting.
- [x] Exact source highlighting, scroll to passage, and repeated-match navigation.
- [x] Saved passages visible within each source, with jump-to-article, insert, and remove actions.
- [x] Private colored labels through `/label`, Insert, or Ctrl/Cmd+Shift+L; `/claim` removed in 0.5.1. Selected words stay editable and the label appears on hover; labels are omitted from submission exports.
- [x] Exact article quotation spelling exemption, source-refresh invalidation, and typing/citation/reader/pagination performance improvements in 0.5.1.
- [x] `/evidence` attaches an article passage to selected writing and inserts its citation.
- [x] Provenance gutter with status symbols and hover descriptions.
- [x] `/ref` remains the cross-reference command; references update with object order and jump to targets.
- [x] `/break`, `/footnote`, and expanded Insert menu.
- [x] Section roles and ordering, numbered appendices, contents, lists of figures/tables in Paper output.
- [x] APA, MLA, Chicago author–date, IEEE, NLM/Vancouver, AMA CSL citation profiles.
- [x] Essay, research paper, literature review, lab/technical report, conference, thesis, dissertation outlines.
- [x] Named revisions, block comparisons, individual-paragraph restore with a preceding recovery revision.
- [x] Project search across writing, article text, source metadata, saved passages, notes, labels, and objects.
- [x] Crossref registered-update checks and citation/structure inspector. Absence of a notice is not a quality guarantee.
- [x] RIS, BibTeX, and CSL-JSON reference import/export (including Zotero exports).
- [x] HTML, Markdown, LaTeX, Typst source packages; styled Word export and basic Word text/heading import with an explicit limitations report.
- [x] Desktop Chrome/Edge clipper source, downloadable unpacked package, and review-before-import bridge.

## Remaining accepted work

- [ ] Native Safari/iPad hardware and external-keyboard QA; current responsive checks use a 540px browser viewport.
- [ ] Full dissertation profile system: approval pages, Roman-numbered preliminary matter, chapter/section numbering hierarchy, per-chapter bibliographies, reusable university templates.
- [ ] Two-column submission layout and more journal profiles; Chicago note-based citation style and a specifically named Harvard variant.
- [ ] PDF facsimile reader with thumbnails, precise text-layer overlays, scanned-document OCR, and source context capture improvements.
- [ ] User-defined source-reading highlight categories, visual highlight navigation strip, source backlinks to all manuscript uses, and synchronized reading/writing positions.
- [ ] Revision comparison of arbitrary snapshots and finer word-level diffs, plus removed-section restore and imported reviewer changes.
- [ ] High-fidelity DOCX round-trip for citation fields, tables, images, tracked edits, comments, and complex math. Basic import is intentionally explicit about what is preserved.
- [ ] Optional local/offline app installation and benchmark work for dissertation-scale projects with many high-resolution figures.
- [ ] Desktop clipper installation QA in an authorized browser; Chrome Web Store publication is not performed automatically.

## Excluded by preference

No AI detector, AI ghostwriter, evidence-matrix board, reading-progress status, multiuser editing, collaboration invitations, or iPad extension/share-sheet project. Source highlight comments and tags remain undecided. The general research notebook and passage-specific private notes remain separate.
