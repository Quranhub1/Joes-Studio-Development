# Licensed web-template import workflow

This folder is populated by `node scripts/import-openclipart-certificates.mjs`.
The importer downloads SVG artwork into `templates/web-certificates/`, writes a
per-asset manifest with source and licence metadata, and adds entries to the
existing searchable gallery.

## Rights and quality gate

- Source collection: OpenClipart, whose site describes uploads as CC0 1.0.
- Example item pages: https://openclipart.org/detail/354207/certificate,
  https://openclipart.org/detail/267796/certificate-of-award,
  https://openclipart.org/detail/107083/certificate-01,
  https://openclipart.org/detail/50113/certificate-border.
- Review each source page and the downloaded SVG before shipping. Do not bundle
  any file marked questionable or containing trademarks, personal signatures,
  protected logos, or uncertain provenance.
- A downloaded SVG can contain outlined text or complex vector groups. Those
  vector elements can be selected and edited as artwork in Joes Studio, but
  text converted to paths will not behave like a text field. Users can add their
  own editable text boxes on top.
- The current import set is a starter batch, not a claim that 1,000 assets are
  already installed. Grow the source list only with individually verified
  downloadable assets and licence records.
