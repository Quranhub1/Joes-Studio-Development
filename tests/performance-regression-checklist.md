# Joes Studio Performance Regression Checklist

Run this checklist against the development build before promoting changes to production.

## Photo enhancement

- [ ] Load a small JPEG, a large JPEG, and a transparent PNG.
- [ ] Confirm live preview responds while brightness, exposure, crop, and position sliders move.
- [ ] Confirm preview quality is visibly useful and updates settle after the slider is released.
- [ ] Export/print the same images and confirm the output uses the higher-resolution export path.
- [ ] Disable auto enhancement and background whitening, then adjust sharpness or opacity; confirm manual adjustments still take effect.
- [ ] Enable white background and confirm the result is opaque; disable it and use partial opacity to confirm PNG transparency is preserved.
- [ ] Use a remote URL image and verify unsupported CORS cases fail safely without breaking the batch.

## Batch PDF performance and correctness

- [ ] Import 100 student rows with unique photographs and generate one copy each.
- [ ] Generate the same data with 3 copies per student; verify order, duplicates, page count, and card placement.
- [ ] Compare a one-copy export with a multiple-copy export; repeat copies should be visually identical to the first copy for each row.
- [ ] Repeat with a .paper template and an HTML template.
- [ ] Confirm progress reaches the final card count, errors are shown clearly, and no blank or missing cards appear.
- [ ] Test a 500-row batch on the lowest-spec supported machine and record total time, peak memory if available, and whether the browser remains responsive.

## Printing and offline operation

- [ ] Print a multi-page batch and verify page dimensions, margins, orientation, image sharpness, and card count.
- [ ] Export a PDF and open it in a separate PDF reader.
- [ ] Disconnect internet after loading the application; confirm bundled tools and JSZip-backed features still work.
- [ ] Verify remote template images fail gracefully offline while locally uploaded photographs remain usable.
- [ ] Reload the development site and confirm the new versioned scripts are downloaded rather than served from stale cache.

## Record results

For each run, note browser/version, CPU/RAM, row count, image dimensions, copies per student, total generation time, PDF page count, failures, and visual differences. Avoid treating an improvement as validated until output correctness and photo quality have both been checked.
