# ChinaMedVisit Cost Comparison Widget

Standalone, zero-dependency, zero-intrusion embeddable Web Component (`<chinamedvisit-cost-widget>`) and static SVG cost badges compiled directly from the MedVisit truth source (`E:\Soft\xoesim\MedVisit\src\data\procedures.ts`), distributed via immutable jsDelivr CDN (`@v1.0.1`).

## Key Capabilities

- **Zero-Dependency Web Component (`dist/chinamedvisit-widget.js`)**: Encapsulated Shadow DOM CSS + `<chinamedvisit-cost-widget>` custom element under `18 KB`, zero external runtime calls, zero cookies, zero tracking.
- **12 Verified Core Procedures & 7 Live Currencies**: Live currency conversion across `USD ($)`, `EUR (€)`, `GBP (£)`, `AUD (A$)`, `CAD (C$)`, `SGD (S$)`, and `CNY (¥)` using exact `EXCHANGE_RATES` and `PROCEDURES_DATA` benchmarks.
- **Configurable Attributes**:
  - `data-procedures`: Comma-separated list of procedure IDs (e.g., `brain-mri-3t,pet-ct-whole-body,chief-physician-consultation`) or `"all"` for all 12 procedures. Defaults to 5 flagship benchmarks when omitted.
  - `data-currency`: Initial display currency (`USD`, `EUR`, `GBP`, `AUD`, `CAD`, `SGD`, `CNY`; default `USD`).
  - `data-theme`: `"light"` or `"dark"` (default `"light"`).
  - `data-rel`: Optional `rel` attribute applied to the attribution link so embedding publishers retain full control (defaults to `nofollow noopener` for Google Widget Link Spam safety).
- **White-Hat Editorial Attribution**: Displays a single clean brand attribution link (`Data source: ChinaMedVisit`) pointing to the canonical parameter-free URL `https://chinamedvisit.com/cost-calculator` (no UTM parameters, no commercial keyword stuffing).
- **Static SVG Price Badges (Zero JS)**:
  - `dist/badge-mri-cost.svg` (`¥1,200–¥2,400 / $166–$331 vs US $2,200`)
  - `dist/badge-petct-cost.svg` (`¥7,000–¥11,000 / $966–$1,518 vs US $5,800`)

## Build & Verify

```bash
node scripts/build-widget.mjs
node --check dist/chinamedvisit-widget.js
```

## Embed Examples (Immutable jsDelivr CDN `@v1.0.1`)

### 1. Interactive Web Component (HTML)

```html
<script src="https://cdn.jsdelivr.net/gh/ChinaMedVisit/chinamedvisit-widget@v1.0.1/dist/chinamedvisit-widget.js" crossorigin="anonymous" defer></script>
<chinamedvisit-cost-widget
  data-procedures="chief-physician-consultation,brain-mri-3t,pet-ct-whole-body"
  data-currency="USD"
  data-theme="light">
</chinamedvisit-cost-widget>
```

### 2. Static SVG Cost Badges (HTML & Markdown)

```html
<a href="https://chinamedvisit.com/cost-calculator" rel="nofollow noopener">
  <img src="https://cdn.jsdelivr.net/gh/ChinaMedVisit/chinamedvisit-widget@v1.0.1/dist/badge-mri-cost.svg" alt="ChinaMedVisit 3.0T Brain MRI Cost Benchmark" width="560" height="76" />
</a>
```

```markdown
[![ChinaMedVisit 3.0T Brain MRI Cost Benchmark](https://cdn.jsdelivr.net/gh/ChinaMedVisit/chinamedvisit-widget@v1.0.1/dist/badge-mri-cost.svg)](https://chinamedvisit.com/cost-calculator)
```

## Static Hardening (`dist/_headers` & `dist/robots.txt`)

`dist/_headers` sets `X-Robots-Tag: noindex, follow`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Access-Control-Allow-Origin: *` + `Cross-Origin-Resource-Policy: cross-origin` + `Cache-Control: public, max-age=31536000, immutable` on `.js`/`.svg` assets, paired with `dist/robots.txt` allowing crawlers so Googlebot can honor `noindex` while rendering cross-origin embeds.

## Truth-Source Procedure IDs

- `chief-physician-consultation` — Chief Physician Consultation (¥300–¥800 RMB vs US $450)
- `mdt-tumor-board` — MDT Tumor Board (¥1,500–¥3,500 RMB vs US $2,800)
- `pathology-second-opinion` — Histopathology 2nd Opinion (¥600–¥1,800 RMB vs US $1,500)
- `brain-mri-3t` — 3.0T Brain MRI (¥1,200–¥2,400 RMB / $166–$331 vs US $2,200)
- `pet-ct-whole-body` — Whole-Body 18F-FDG PET-CT (¥7,000–¥11,000 RMB / $966–$1,518 vs US $5,800)
- `chest-ct-contrast` — Contrast Chest CT (¥650–¥1,300 RMB vs US $1,400)
- `gastroscopy-colonoscopy-painless` — Painless Dual Endoscopy (¥2,200–¥4,200 RMB vs US $3,800)
- `executive-health-screening` — Executive VIP Screening (¥4,500–¥9,800 RMB vs US $4,500)
- `cardiac-coronary-angiography` — Coronary Angiography (¥4,500–¥8,500 RMB vs US $8,200)
- `knee-arthroscopy-meniscus` — Knee Arthroscopy Repair (¥18,000–¥32,000 RMB vs US $14,500)
- `total-hip-replacement` — Total Hip Arthroplasty (¥45,000–¥78,000 RMB vs US $38,000)
- `inpatient-vip-room-daily` — Inpatient IMC Private Single Room Daily (¥1,200–¥2,800 RMB vs US $2,800)
