# Joes Studio template library sources and usage

## Locally editable templates

The templates in `templates/` with `.paper` or JSON project data are original Joes Studio starter designs built from editable canvas objects. They are not downloaded copies of third-party Canva, Adobe or Microsoft templates. Local SVG files under `templates/previews/` are purpose-made gallery previews. The starter designs use placeholder text so the institution name, recipient, course, reference, date and signature information can be replaced in Joes Studio.

Current categories: Start Here; Certificates; Student IDs & Badges; Examination Cards; Official Documents; Logos & Branding;

## External template inspiration and template-making tools

- Canva certificates: https://www.canva.com/certificates/templates/
- Canva ID cards and badges: https://www.canva.com/id-cards/templates/
- Canva letterheads: https://www.canva.com/letterheads/templates/
- Microsoft Create certificate maker: https://powerpoint.cloud.microsoft/create/en/certificate-maker/
- Adobe Express certificates: https://www.adobe.com/express/templates/certificate
- Adobe Express employee ID cards: https://www.adobe.com/express/templates/id-card/employee
- Adobe Express letterheads: https://www.adobe.com/express/templates/letterhead
- Adobe Express logo templates: https://www.adobe.com/express/templates/logo
- SketchValley free template library: https://sketchvalley.com/free-templates/

These links open external websites. Joes Studio does not copy or re-host their designs in this repository; the destination site's license, attribution, and commercial-use terms apply to anything downloaded there.

## Organization logo sources

| Catalogue item | Image source | Official reference / note |
| --- | --- | --- |
| National Drug Authority (NDA) | https://hcm.nda.or.ug/assets/images/nda_uganda_logo.png | NDA official site: https://www.nda.or.ug/ |
| Uganda Health Professions Assessment Board (UHPAB) | https://www.appcreator24.com/srv/imgs/gen/3811715_ico.png?v=3 | UHPAB official site: https://uhpab.go.ug/. The image currently available is an app-icon host, not a verified image file hosted by the official domain; confirm against approved UHPAB artwork before formal use. |
| Kampala School of Health Sciences (KSHS) | https://pbs.twimg.com/profile_images/1393572280526069774/fVy9514x.jpg | KSHS public profile: https://x.com/kshsUganda and school site: https://www.kshs.ac.ug/. Confirm the current approved asset with the school for official publications. |
| Uganda Vocational and Technical Assessment Board (UVTAB) | https://assessment.uvtab.go.ug/static/img/uvtab_logo.png | UVTAB official site: https://www.uvtab.go.ug/ |

Logo assets are fetched when the user selects Insert into current canvas, then embedded into the editable project. This requires an internet connection unless a local image is uploaded. The app provides **Add Your Own Logo** for approved local artwork. Do not imply an organization has endorsed a document because its logo is available in the gallery. Use marks only with appropriate authorization and follow each organization's branding rules.

## Adding and maintaining assets

Update `templates/templates.json` to add, remove, or recategorize a gallery item. Each item should include a unique `id`, clear `name` and `desc`, a `category`, a `type`, and a thumbnail. Editable templates use a repository-relative `url`; logo items use `src`, `sourceName`, and `sourceUrl`. Prefer official image hosts. If the artwork is not hosted by the institution, say so in the description and identify it as unverified where appropriate. Do not commit private marks or third-party artwork without permission.


## Examination cards

The three examination-card templates are original editable Fabric-canvas designs in 130 × 60 mm landscape label dimensions: KSHS teal, KSHS white, and a generic institution variant. They use only common installed/system font families (Arial and Georgia) and do not load Google Fonts or any other remote font files. The badge is a placeholder; insert locally approved institutional artwork from Logos & Branding when authorised. Remote assets are not required to open or edit these card templates.
