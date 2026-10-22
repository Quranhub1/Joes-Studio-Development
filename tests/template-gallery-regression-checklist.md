# Start from Template Gallery Regression Checklist

Run these checks in a browser against the development build before a production release.

## Gallery and categories

- [ ] Open Joes Studio and confirm the Start from Template gallery displays local thumbnails without waiting for third-party template sites.
- [ ] Verify the Start Here, Certificates, Student IDs & Badges, Official Documents, and Logos & Branding category filters.
- [ ] Search by a partial name, category, description, and a tag such as NDA, UHPAB, KSHS, certificate or student ID.
- [ ] Search for a nonexistent item and verify the empty state appears; clear search and confirm cards return.
- [ ] Use keyboard Tab, Enter and Space to operate template cards; use the source link without accidentally opening the card action.

## Editable local templates

- [ ] Open each of the four certificate templates, then change recipient, award/course, certificate number, date and signatory text.
- [ ] Open the official letterhead and memo templates; verify all text is editable, margins/page orientation are sensible, and no divider or footer spills off the page.
- [ ] Open the KSHS student ID, Health Trainee ID, and Staff/Visitor badge templates; verify label size, text layers and photo placeholders are editable.
- [ ] Verify Open Paper File and New Blank A4 still work as expected.

## Organization logos and custom artwork

- [ ] While a document is already open, reopen the template gallery and insert each logo; verify insertion does not erase the document.
- [ ] Confirm each logo appears as a selectable Fabric image, can be moved/resized, survives save/reopen, and is embedded in the saved project.
- [ ] Test NDA, UHPAB, KSHS and UVTAB links both online and when remote logo loading fails; confirm errors are clear and the gallery remains usable.
- [ ] Upload an authorized local PNG, JPG, WebP and SVG logo; cancel the picker; test an invalid file type.
- [ ] Review official brand use, attribution and permission before printing or distributing institutional materials.

## Output and regression

- [ ] Export or print each document template to verify the canvas output, not only the preview thumbnail.
- [ ] Check that old sample documents no longer appear in the Start from Template gallery, while their underlying files are not accidentally deleted.
- [ ] Disconnect the network and confirm local templates and local image uploads still work; expect online organization-logo downloads to need internet unless previously embedded or uploaded locally.

Record browser/version, template name, failures, screenshots, and the exported PDF for any issue. Syntax and JSON checks are useful, but do not replace visual browser validation or print testing.


## Examination card templates

- [ ] Confirm the Examination Cards category appears and all three examination-card cards load the local SVG preview.
- [ ] Open the KSHS teal and white cards; verify the label is 130 × 60 mm, landscape, with four rows per A4 page and no online font requests.
- [ ] Open the generic institution card; change the institution name and footer and confirm both remain editable.
- [ ] Verify student name, registration number, sex, sitting and course fields, photo placeholder, note and issuer line fit inside the card.
- [ ] Insert an authorised local KSHS badge from Logos & Branding; save/reopen the paper and check that the image is embedded.
- [ ] Export/print to PDF and measure one physical card; confirm no text or border is clipped at 100% scale.


## Fabric text rendering and serialization

- [ ] Open each local template and confirm the console has no `CanvasTextBaseline` warnings for `alphabetical`.
- [ ] Save a project containing text and verify no `stylesToArray` exception is thrown.
- [ ] Insert an image/logo while a text-containing template is open; confirm image insertion, layer updates, undo/redo and save/reopen still work.
- [ ] Open a legacy or imported project with missing `styles` on text objects, including inside groups; confirm loader normalization allows it to render and serialize.
