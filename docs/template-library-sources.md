# Joes Studio template library sources and usage

## Locally editable templates

The templates in `templates/` with `.paper` or JSON project data are original Joes Studio starter designs built from editable canvas objects. They are not downloaded copies of third-party Canva, Adobe or Microsoft templates. Local SVG files under `templates/previews/` are purpose-made gallery previews. The starter designs use placeholder text so the institution name, recipient, course, reference, date and signature information can be replaced in Joes Studio.

Current categories: Certificates; Student IDs & Badges; Official Documents; Logos & Branding.

## External template inspiration and template-making tools

- Canva certificate templates: https://www.canva.com/certificates/templates/
- Microsoft Create certificate maker: https://powerpoint.cloud.microsoft/create/en/certificate-maker/
- Adobe Express certificate templates: https://www.adobe.com/express/templates/certificate
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
