# Batch Pre-generation Validation Checklist

Run this checklist in a preview deployment before merging.

- [ ] With no spreadsheet selected, the panel asks the user to import records.
- [ ] With a spreadsheet but no template, the panel identifies the missing template.
- [ ] Unmapped non-photo template fields are listed, with long lists truncated safely.
- [ ] A mapped text field with blank cells reports the count and sample row numbers.
- [ ] A row with an embedded photo is not incorrectly reported as missing its photo.
- [ ] A row whose photo URL or filename matches an imported photo is not reported as missing.
- [ ] Missing photo filenames are reported as a warning, not a hard block.
- [ ] Mapping changes and spreadsheet/photo imports refresh the summary.
- [ ] User-provided field names and values are escaped; no markup from the spreadsheet is interpreted as HTML.
- [ ] Generate and Print remain available according to existing readiness rules.
- [ ] Validate with large sheets on desktop and Android; ensure refresh remains responsive.
- [ ] Check HTML and paper-template modes and confirm no duplicate validation panel appears.
- [ ] Preview representative records before PDF/print export; the dashboard explicitly does not claim to detect all layout overflow.
