# Batch Import Quality-of-Life Regression Checklist

Run against a preview deployment before merging or promoting this change.

## Spreadsheet field mapping
- [ ] Exact normalized matches (for example `Student_ID` ↔ `student id`) map automatically.
- [ ] Known aliases map uniquely (for example `Student Name` ↔ `Full Name`, `DOB` ↔ `Date of Birth`, `Picture` ↔ `Student Photo`).
- [ ] If multiple columns match an alias, no ambiguous mapping is silently selected.
- [ ] Unrecognized fields remain available for manual mapping.
- [ ] Manually changing a mapping still updates the preview and generated output.

## ZIP photo import
- [ ] Import a ZIP containing JPG, JPEG, PNG, WebP, GIF, and BMP photos.
- [ ] Images in nested folders are indexed by their filename; a spreadsheet value with or without an extension matches.
- [ ] A ZIP with no supported images shows a readable error and leaves the editor usable.
- [ ] A ZIP over 100 MB, an archive with over 1,500 images, or declared extracted data over 200 MB is rejected before normal processing.
- [ ] Individual images over 20 MB are skipped safely.
- [ ] macOS `__MACOSX` entries and hidden files are ignored.
- [ ] Corrupt ZIP files show a readable error; loading indicators are cleared afterward.
- [ ] Existing folder photo import and embedded Excel photos continue to work.
- [ ] Test on desktop Chrome/Edge and Android Chrome, including a low-memory device.

## Regression checks
- [ ] Batch preview row order and copy counts remain correct.
- [ ] Generate and print work with imported ZIP photos.
- [ ] Missing photos do not crash generation.
- [ ] Browser console has no new errors.
