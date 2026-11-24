#!/usr/bin/env node
/**
 * E:\Soft\misc\widgets\chinamedvisit-widget\scripts\build-widget.mjs
 *
 * Reads the single source of truth (E:\Soft\xoesim\MedVisit\src\data\procedures.ts)
 * and compiles:
 *   - dist/chinamedvisit-widget.js (< 18 KB zero-dependency Web Component + Shadow DOM)
 *   - dist/badge-mri-cost.svg
 *   - dist/badge-petct-cost.svg
 *   - dist/index.html (interactive preview + HTML/Markdown embed code generator)
 *   - dist/_headers (Cloudflare Pages CORS headers for JS/SVG embedding)
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WIDGET_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(WIDGET_ROOT, 'dist');
const PROCEDURES_TS_PATH = 'E:\\Soft\\xoesim\\MedVisit\\src\\data\\procedures.ts';
const MEDVISIT_PKG_JSON = 'E:\\Soft\\xoesim\\MedVisit\\package.json';
const MAX_WIDGET_BYTES = 18432;
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/ChinaMedVisit/chinamedvisit-widget@v1.0.1/dist';

function stripTsFallback(source) {
  let code = source.replace(/export\s+interface\s+\w+\s*\{[\s\S]*?\r?\n\}/g, '');
  code = code.replace(/export\s+const\s+(\w+)\s*:\s*[^=]+=/g, 'exports.$1 =');
  return code;
}

function loadProceduresTruthSource() {
  const tsSource = fs.readFileSync(PROCEDURES_TS_PATH, 'utf8');
  let jsCode = '';

  if (fs.existsSync(MEDVISIT_PKG_JSON)) {
    try {
      const requireFromMedVisit = createRequire(MEDVISIT_PKG_JSON);
      const ts = requireFromMedVisit('typescript');
      jsCode = ts.transpileModule(tsSource, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020
        }
      }).outputText;
    } catch {
      jsCode = stripTsFallback(tsSource);
    }
  } else {
    jsCode = stripTsFallback(tsSource);
  }

  const sandbox = { exports: {}, module: { exports: {} } };
  vm.runInNewContext(jsCode, sandbox, { filename: 'procedures.ts' });
  const mod = Object.keys(sandbox.exports).length ? sandbox.exports : sandbox.module.exports;

  const procedures = mod.PROCEDURES_DATA;
  const exchangeRates = mod.EXCHANGE_RATES;

  if (!Array.isArray(procedures) || procedures.length !== 12) {
    throw new Error(`Expected 12 procedures in procedures.ts, got ${procedures?.length}`);
  }
  if (!exchangeRates || Object.keys(exchangeRates).length !== 7) {
    throw new Error(`Expected 7 currencies in EXCHANGE_RATES, got ${Object.keys(exchangeRates || {}).length}`);
  }

  const mri = procedures.find((p) => p.id === 'brain-mri-3t');
  const petct = procedures.find((p) => p.id === 'pet-ct-whole-body');
  if (!mri || mri.tier3aImcRmbMin !== 1200 || mri.tier3aImcRmbMax !== 2400 || mri.usAverageUsd !== 2200) {
    throw new Error('Brain MRI truth-source assertion failed');
  }
  if (!petct || petct.tier3aImcRmbMin !== 7000 || petct.tier3aImcRmbMax !== 11000 || petct.usAverageUsd !== 5800) {
    throw new Error('PET-CT truth-source assertion failed');
  }

  return { procedures, exchangeRates };
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildWidgetBundle({ procedures, exchangeRates }) {
  // Compact tuples keep bundle well under 18 KB while preserving exact truth-source fields
  const compactProcs = procedures.map((p) => [
    p.id,
    p.name,
    p.chineseName || '',
    p.category,
    p.tier3aImcRmbMin,
    p.tier3aImcRmbMax,
    p.privateHospitalRmbMin,
    p.privateHospitalRmbMax,
    p.usAverageUsd,
    p.ukPrivateGbp,
    p.typicalTurnaround
  ]);

  const compactRates = Object.entries(exchangeRates).map(([code, info]) => [
    code,
    info.symbol,
    info.rateToRmb,
    info.name
  ]);

  const defaultIds = [
    'chief-physician-consultation',
    'brain-mri-3t',
    'pet-ct-whole-body',
    'gastroscopy-colonoscopy-painless',
    'executive-health-screening'
  ];

  const css = [
    ':host{display:block;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);--bg:#ffffff;--alt:#f8fafc;--bd:#cbd5e1;--bd2:#e2e8f0;--ink:#0f172a;--mut:#475569;--acc:#0f766e;--acc-bg:#f0fdfa;--sav-bg:#ecfdf5;--sav:#047857;--lnk:#0369a1}',
    ':host([data-theme="dark"]){--bg:#0f172a;--alt:#1e293b;--bd:#334155;--bd2:#1e293b;--ink:#f8fafc;--mut:#94a3b8;--acc:#2dd4bf;--acc-bg:#134e4a;--sav-bg:#064e3b;--sav:#6ee7b7;--lnk:#38bdf8}',
    '*,*::before,*::after{box-sizing:border-box}',
    '.wrap{container-type:inline-size;background:var(--bg);border:1px solid var(--bd);border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.06)}',
    '.hd{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--alt);border-bottom:1px solid var(--bd)}',
    '.ttl{font-size:14px;font-weight:700;color:var(--ink);line-height:1.3}',
    '.sub{font-size:11.5px;color:var(--mut)}',
    '.ctrl{display:flex;align-items:center;gap:6px}',
    '.ctrl label{font-size:11px;font-weight:600;color:var(--mut)}',
    'select{padding:5px 8px;border-radius:6px;border:1px solid var(--bd);background:var(--bg);color:var(--ink);font-size:12px;font-weight:600;font-family:inherit;cursor:pointer}',
    '.rows{display:flex;flex-direction:column}',
    '.row{display:grid;grid-template-columns:minmax(180px,1.5fr) minmax(130px,1.1fr) minmax(120px,1fr) 84px;gap:10px;align-items:center;padding:11px 16px;border-bottom:1px solid var(--bd2)}',
    '.row.head{padding:7px 16px;background:var(--alt);font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--mut)}',
    '.row:last-child{border-bottom:0}',
    '.pname{font-size:12.5px;font-weight:700;color:var(--ink);line-height:1.3}',
    '.pzh{font-size:11px;color:var(--mut);margin-top:2px}',
    '.imc{font-size:13px;font-weight:800;color:var(--acc)}',
    '.rmb{font-size:10.5px;color:var(--mut)}',
    '.bench{font-size:12px;font-weight:600;color:var(--ink)}',
    '.sav{display:inline-block;padding:3px 7px;border-radius:999px;background:var(--sav-bg);color:var(--sav);font-size:11px;font-weight:700;text-align:center;white-space:nowrap}',
    '.ft{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;padding:9px 16px;background:var(--alt);border-top:1px solid var(--bd);font-size:11.5px;color:var(--mut)}',
    '.ft a{color:var(--lnk);font-weight:600;text-decoration:none}',
    '.ft a:hover{text-decoration:underline}',
    '.mob-lbl{display:none;font-size:10px;font-weight:600;color:var(--mut);text-transform:uppercase}',
    '@container (max-width:540px){.row.head{display:none}.row{grid-template-columns:1fr 1fr;gap:8px}.c-proc{grid-column:1 / -1}.mob-lbl{display:block}.c-sav{justify-self:start}}'
  ].join('');

  return `/* ChinaMedVisit Cost Comparison Widget v1.0.0 | Compiled from procedures.ts */
(() => {
  const PROCS = ${JSON.stringify(compactProcs)};
  const RATES = ${JSON.stringify(compactRates)};
  const DEFAULTS = ${JSON.stringify(defaultIds)};
  const CALC_URL = "https://chinamedvisit.com/cost-calculator";
  const CSS = ${JSON.stringify(css)};

  const procMap = new Map(PROCS.map((p) => [p[0], p]));
  const rateMap = new Map(RATES.map((r) => [r[0], { code: r[0], sym: r[1], rate: r[2], name: r[3] }]));
  const usdRate = rateMap.get("USD").rate;
  const gbpRate = rateMap.get("GBP").rate;

  const h = (tag, cls, txt) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt !== undefined && txt !== null) n.textContent = String(txt);
    return n;
  };
  const fmt = (n, sym) => sym + Math.round(n).toLocaleString("en-US");

  class ChinaMedVisitCostWidget extends HTMLElement {
    static get observedAttributes() {
      return ["data-procedures", "data-currency", "data-theme", "data-rel"];
    }
    constructor() {
      super();
      this._curr = null;
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      this.render();
    }
    attributeChangedCallback(name, oldVal, newVal) {
      if (oldVal === newVal) return;
      if (name === "data-currency") this._curr = null;
      if (this.isConnected) this.render();
    }
    _getCurrencyCode() {
      const attr = (this.getAttribute("data-currency") || "USD").trim().toUpperCase();
      if (this._curr && rateMap.has(this._curr)) return this._curr;
      return rateMap.has(attr) ? attr : "USD";
    }
    _getProcedures() {
      const raw = (this.getAttribute("data-procedures") || "").trim();
      if (raw.toLowerCase() === "all") return PROCS;
      if (raw) {
        const picked = raw.split(",").map((s) => procMap.get(s.trim())).filter(Boolean);
        if (picked.length) return picked;
      }
      return DEFAULTS.map((id) => procMap.get(id)).filter(Boolean);
    }
    render() {
      const currCode = this._getCurrencyCode();
      const rateInfo = rateMap.get(currCode);
      const r = rateInfo.rate;
      const sym = rateInfo.sym;
      const items = this._getProcedures();

      const styleEl = h("style", "", CSS);
      const wrap = h("div", "wrap");

      const hd = h("div", "hd");
      const titleBox = h("div");
      titleBox.appendChild(h("div", "ttl", "China Tier-3A Hospital vs. US/UK Costs"));
      titleBox.appendChild(h("div", "sub", "2026 Regulated Public IMC Fee Benchmarks (" + items.length + " Procedures)"));

      const ctrl = h("div", "ctrl");
      const lbl = h("label", "", "Currency");
      const sel = h("select");
      sel.setAttribute("aria-label", "Display currency");
      RATES.forEach(([code, symbol]) => {
        const opt = h("option", "", code + " (" + symbol + ")");
        opt.value = code;
        if (code === currCode) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener("change", () => {
        this._curr = sel.value;
        this.render();
      });
      ctrl.appendChild(lbl);
      ctrl.appendChild(sel);
      hd.appendChild(titleBox);
      hd.appendChild(ctrl);

      const rows = h("div", "rows");
      const thead = h("div", "row head");
      thead.appendChild(h("div", "", "Procedure"));
      thead.appendChild(h("div", "", "China Tier-3A IMC"));
      thead.appendChild(h("div", "", "US Avg / UK Private"));
      thead.appendChild(h("div", "", "vs. US"));
      rows.appendChild(thead);

      items.forEach((p) => {
        const [id, name, zh, , rMin, rMax, , , usUsd, ukGbp, tat] = p;
        const row = h("div", "row");
        row.setAttribute("data-procedure-id", id);

        const cProc = h("div", "c-proc");
        cProc.appendChild(h("div", "pname", name));
        cProc.appendChild(h("div", "pzh", (zh ? zh + " • " : "") + tat));

        const imcMin = rMin * r;
        const imcMax = rMax * r;
        const usVal = (usUsd / usdRate) * r;
        const ukVal = (ukGbp / gbpRate) * r;
        const savPct = usVal > 0 ? Math.max(0, Math.round(((usVal - (imcMin + imcMax) / 2) / usVal) * 100)) : 0;

        const cImc = h("div");
        cImc.appendChild(h("span", "mob-lbl", "China Tier-3A IMC"));
        cImc.appendChild(h("div", "imc", fmt(imcMin, sym) + "–" + fmt(imcMax, sym)));
        cImc.appendChild(
          h(
            "div",
            "rmb",
            currCode === "CNY"
              ? "≈ $" + Math.round(rMin * usdRate).toLocaleString("en-US") + "–$" + Math.round(rMax * usdRate).toLocaleString("en-US") + " USD"
              : "¥" + rMin.toLocaleString("en-US") + "–¥" + rMax.toLocaleString("en-US") + " RMB"
          )
        );

        const cBench = h("div");
        cBench.appendChild(h("span", "mob-lbl", "US / UK Self-Pay"));
        cBench.appendChild(h("div", "bench", "US " + fmt(usVal, sym)));
        cBench.appendChild(h("div", "rmb", "UK " + fmt(ukVal, sym)));

        const cSav = h("div", "c-sav");
        cSav.appendChild(h("span", "sav", "-" + savPct + "%"));

        row.appendChild(cProc);
        row.appendChild(cImc);
        row.appendChild(cBench);
        row.appendChild(cSav);
        rows.appendChild(row);
      });

      const ft = h("div", "ft");
      ft.appendChild(h("span", "", "Official Tier-3A VIP/IMC published ranges (RMB base)"));
      const link = h("a", "", "Data source: ChinaMedVisit");
      link.href = CALC_URL;
      link.target = "_blank";
      const customRel = (this.getAttribute("data-rel") || "").trim();
      link.rel = customRel || "nofollow noopener";
      ft.appendChild(link);

      wrap.appendChild(hd);
      wrap.appendChild(rows);
      wrap.appendChild(ft);
      this.shadowRoot.replaceChildren(styleEl, wrap);
    }
  }

  if (!customElements.get("chinamedvisit-cost-widget")) {
    customElements.define("chinamedvisit-cost-widget", ChinaMedVisitCostWidget);
  }
})();
`;
}

function buildBadgeSvg({ title, label, priceText, savingsPct }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="76" viewBox="0 0 560 76" role="img" aria-label="${escapeXml(title + ': ' + priceText)}">
  <title>${escapeXml(title + ' — ' + priceText + ' (Data source: ChinaMedVisit)')}</title>
  <defs>
    <clipPath id="cardClip">
      <rect x="0.5" y="0.5" width="559" height="75" rx="9.5" />
    </clipPath>
  </defs>
  <g clip-path="url(#cardClip)">
    <rect x="0.5" y="0.5" width="559" height="75" rx="9.5" fill="#ffffff" />
    <rect x="0" y="0" width="148" height="76" fill="#0f766e" />
    <text x="14" y="27" fill="#99f6e4" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="9.5" font-weight="700" letter-spacing="0.6">${escapeXml(label)}</text>
    <text x="14" y="49" fill="#ffffff" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="13.5" font-weight="700">${escapeXml(title)}</text>
    <text x="164" y="30" fill="#0f172a" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="14" font-weight="800">${escapeXml(priceText)}</text>
    <text x="164" y="55" fill="#475569" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="11" font-weight="500">China Tier-3A Public IMC (2026) • Data source: ChinaMedVisit</text>
    <rect x="474" y="40" width="72" height="22" rx="11" fill="#ecfdf5" />
    <text x="510" y="55" text-anchor="middle" fill="#047857" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="11" font-weight="700">Save ~${savingsPct}%</text>
  </g>
  <rect x="0.5" y="0.5" width="559" height="75" rx="9.5" fill="none" stroke="#cbd5e1" stroke-width="1" />
</svg>
`;
}

function buildPreviewHtml({ procedures, exchangeRates, widgetSri }) {
  const procCheckboxes = procedures
    .map((p, idx) => {
      const checked = [
        'chief-physician-consultation',
        'brain-mri-3t',
        'pet-ct-whole-body',
        'gastroscopy-colonoscopy-painless',
        'executive-health-screening'
      ].includes(p.id)
        ? 'checked'
        : '';
      return `<label class="chk"><input type="checkbox" name="proc" value="${p.id}" ${checked} /> <span>${escapeXml(p.name)}</span></label>`;
    })
    .join('\n          ');

  const currOptions = Object.entries(exchangeRates)
    .map(([code, info]) => `<option value="${code}"${code === 'USD' ? ' selected' : ''}>${code} (${escapeXml(info.symbol)}) — ${escapeXml(info.name)}</option>`)
    .join('\n            ');

  const mriHtmlCode = `<a href="https://chinamedvisit.com/cost-calculator" rel="nofollow noopener"><img src="${CDN_BASE}/badge-mri-cost.svg" alt="ChinaMedVisit 3.0T Brain MRI Cost Benchmark" width="560" height="76" /></a>`;
  const mriMdCode = `[![ChinaMedVisit 3.0T Brain MRI Cost Benchmark](${CDN_BASE}/badge-mri-cost.svg)](https://chinamedvisit.com/cost-calculator)`;

  const petHtmlCode = `<a href="https://chinamedvisit.com/cost-calculator" rel="nofollow noopener"><img src="${CDN_BASE}/badge-petct-cost.svg" alt="ChinaMedVisit Whole-Body PET-CT Cost Benchmark" width="560" height="76" /></a>`;
  const petMdCode = `[![ChinaMedVisit Whole-Body PET-CT Cost Benchmark](${CDN_BASE}/badge-petct-cost.svg)](https://chinamedvisit.com/cost-calculator)`;

  const tableRows = procedures
    .map((p) => {
      const usdMin = Math.round(p.tier3aImcRmbMin * exchangeRates.USD.rateToRmb);
      const usdMax = Math.round(p.tier3aImcRmbMax * exchangeRates.USD.rateToRmb);
      return `<tr>
        <td><strong>${escapeXml(p.name)}</strong><div class="zh-sub">${escapeXml(p.chineseName || '')}</div></td>
        <td><code>¥${p.tier3aImcRmbMin.toLocaleString('en-US')}–¥${p.tier3aImcRmbMax.toLocaleString('en-US')}</code><div class="zh-sub">$${usdMin.toLocaleString('en-US')}–$${usdMax.toLocaleString('en-US')} USD</div></td>
        <td>$${p.usAverageUsd.toLocaleString('en-US')}</td>
        <td>£${p.ukPrivateGbp.toLocaleString('en-US')}</td>
      </tr>`;
    })
    .join('\n      ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, follow" />
  <link rel="canonical" href="https://chinamedvisit.com/cost-calculator" />
  <title>ChinaMedVisit Cost Widget &amp; SVG Badges</title>
  <style>
    :root { --bg: #f8fafc; --card: #ffffff; --bd: #cbd5e1; --ink: #0f172a; --mut: #475569; --acc: #0f766e; --blue: #0369a1; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--ink); line-height: 1.5; }
    header { background: #0f172a; color: #f8fafc; padding: 28px 20px; }
    .container { max-width: 1020px; margin: 0 auto; padding: 0 20px; }
    header h1 { margin: 0 0 6px; font-size: 24px; }
    header p { margin: 0; color: #cbd5e1; max-width: 720px; font-size: 14px; }
    .nav-pills { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
    .nav-pills a { color: #99f6e4; text-decoration: none; font-size: 13px; font-weight: 600; padding: 5px 10px; border: 1px solid #334155; border-radius: 6px; }
    .nav-pills a:hover { background: #1e293b; }
    main { padding: 26px 0 48px; }
    section.card { background: var(--card); border: 1px solid var(--bd); border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    h2 { margin: 0 0 8px; font-size: 18px; }
    .lead { margin: 0 0 16px; color: var(--mut); font-size: 13.5px; }
    .grid { display: grid; grid-template-columns: 310px 1fr; gap: 20px; align-items: start; }
    @media (max-width: 820px) { .grid { grid-template-columns: 1fr; } }
    .controls { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
    .ctrl-grp { margin-bottom: 12px; }
    .ctrl-grp label.lbl { display: block; font-size: 12px; font-weight: 700; color: var(--mut); margin-bottom: 5px; }
    select { width: 100%; padding: 7px 9px; border-radius: 6px; border: 1px solid var(--bd); font-size: 13px; background: #fff; }
    .proc-list { max-height: 220px; overflow-y: auto; border: 1px solid #e2e8f0; background: #fff; border-radius: 6px; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
    .chk { display: flex; align-items: flex-start; gap: 7px; font-size: 12px; cursor: pointer; }
    .preset-row { display: flex; gap: 6px; margin-bottom: 6px; }
    .btn-sm { padding: 4px 8px; border-radius: 5px; border: 1px solid var(--bd); background: #fff; font-size: 11.5px; font-weight: 600; cursor: pointer; }
    .btn-sm:hover { background: #f1f5f9; }
    .code-box { margin-top: 16px; background: #0f172a; color: #e2e8f0; border-radius: 8px; padding: 12px 14px; position: relative; }
    .code-box pre { margin: 0; overflow-x: auto; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
    .copy-btn { margin-top: 8px; padding: 6px 12px; border-radius: 6px; border: 0; background: var(--acc); color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; }
    .copy-btn:hover { background: #115e59; }
    .badges-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    @media (max-width: 820px) { .badges-grid { grid-template-columns: 1fr; } }
    .badge-item { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; background: #f8fafc; }
    .badge-item img { max-width: 100%; height: auto; display: block; margin-bottom: 10px; }
    .btn-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 9px 10px; border-bottom: 1px solid #e2e8f0; }
    th { font-size: 11.5px; text-transform: uppercase; letter-spacing: .04em; color: var(--mut); background: #f8fafc; }
    .zh-sub { font-size: 11.5px; color: var(--mut); }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <h1>ChinaMedVisit Embeddable Cost Widget &amp; SVG Badges</h1>
      <p>Zero-dependency Shadow DOM Web Component (&lt;18 KB) and static SVG price badges built directly from verified 2026 Chinese Tier-3A IMC benchmarks.</p>
      <div class="nav-pills">
        <a href="https://chinamedvisit.com/cost-calculator" target="_blank" rel="noopener">Full Cost Calculator →</a>
        <a href="https://chinamedvisit.com/hospitals" target="_blank" rel="noopener">76 Tier-3A Hospitals →</a>
        <a href="https://chinamedvisit.com/hospitals/chinese-names" target="_blank" rel="noopener">Bilingual Taxi Cards →</a>
      </div>
    </div>
  </header>

  <main class="container">
    <section class="card">
      <h2>1. Interactive Web Component Configurator</h2>
      <p class="lead">Customize procedures, currency, theme, and publisher <code>rel</code> policy. Includes one clean brand link (<code>Data source: ChinaMedVisit</code>) to <code>https://chinamedvisit.com/cost-calculator</code>.</p>
      <div class="grid">
        <div class="controls">
          <div class="ctrl-grp">
            <label class="lbl" for="themeSel">Theme (<code>data-theme</code>)</label>
            <select id="themeSel">
              <option value="light" selected>Light (Clinical Paper)</option>
              <option value="dark">Dark (Slate Night)</option>
            </select>
          </div>
          <div class="ctrl-grp">
            <label class="lbl" for="currSel">Initial Currency (<code>data-currency</code>)</label>
            <select id="currSel">
              ${currOptions}
            </select>
          </div>
          <div class="ctrl-grp">
            <label class="lbl" for="relSel">Publisher Attribution <code>rel</code></label>
            <select id="relSel">
              <option value="nofollow noopener" selected>nofollow noopener (Default, SEO-safe)</option>
              <option value="ugc nofollow noopener">ugc nofollow noopener</option>
              <option value="noopener">noopener (Editorial override)</option>
            </select>
          </div>
          <div class="ctrl-grp">
            <label class="lbl">Procedures (<code>data-procedures</code>)</label>
            <div class="preset-row">
              <button type="button" class="btn-sm" id="btnTop5">Top 5 Flagship</button>
              <button type="button" class="btn-sm" id="btnAll12">All 12 Procedures</button>
            </div>
            <div class="proc-list" id="procList">
              ${procCheckboxes}
            </div>
          </div>
        </div>

        <div>
          <chinamedvisit-cost-widget id="liveWidget" data-currency="USD" data-theme="light"></chinamedvisit-cost-widget>
          <div class="code-box">
            <pre id="embedSnippet"></pre>
            <button type="button" class="copy-btn" id="copyHtmlBtn">Copy HTML Embed Code</button>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>2. Zero-JS Static SVG Cost Badges (WordPress / Substack / Medium / GitHub)</h2>
      <p class="lead">Lightweight vector price cards with zero JavaScript required. Both HTML and Markdown snippets link cleanly to <code>https://chinamedvisit.com/cost-calculator</code>.</p>
      <div class="badges-grid">
        <div class="badge-item">
          <img src="./badge-mri-cost.svg" alt="ChinaMedVisit 3.0T Brain MRI Cost Benchmark" width="560" height="76" />
          <div class="code-box"><pre id="mriHtmlPre">${escapeXml(mriHtmlCode)}</pre></div>
          <div class="btn-row">
            <button type="button" class="copy-btn" data-copy-target="mriHtmlPre">Copy HTML</button>
            <button type="button" class="copy-btn" data-copy-raw="${escapeXml(mriMdCode)}">Copy Markdown</button>
          </div>
        </div>
        <div class="badge-item">
          <img src="./badge-petct-cost.svg" alt="ChinaMedVisit Whole-Body PET-CT Cost Benchmark" width="560" height="76" />
          <div class="code-box"><pre id="petHtmlPre">${escapeXml(petHtmlCode)}</pre></div>
          <div class="btn-row">
            <button type="button" class="copy-btn" data-copy-target="petHtmlPre">Copy HTML</button>
            <button type="button" class="copy-btn" data-copy-raw="${escapeXml(petMdCode)}">Copy Markdown</button>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>3. Verified 12-Procedure Benchmark Reference (Truth Source)</h2>
      <table>
        <thead>
          <tr>
            <th>Procedure</th>
            <th>China Tier-3A IMC</th>
            <th>US Avg Self-Pay</th>
            <th>UK Private</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </section>
  </main>

  <script src="./chinamedvisit-widget.js" defer></script>
  <script>
    (() => {
      const widget = document.getElementById('liveWidget');
      const themeSel = document.getElementById('themeSel');
      const currSel = document.getElementById('currSel');
      const relSel = document.getElementById('relSel');
      const procBoxes = Array.from(document.querySelectorAll('#procList input[type="checkbox"]'));
      const snippetEl = document.getElementById('embedSnippet');
      const copyHtmlBtn = document.getElementById('copyHtmlBtn');

      const CDN_URL = '${CDN_BASE}/chinamedvisit-widget.js';
      const WIDGET_SRI = '${widgetSri}';

      function updateConfig() {
        const theme = themeSel.value;
        const curr = currSel.value;
        const rel = relSel.value;
        const checked = procBoxes.filter((c) => c.checked).map((c) => c.value);

        widget.setAttribute('data-theme', theme);
        widget.setAttribute('data-currency', curr);
        if (rel !== 'nofollow noopener') {
          widget.setAttribute('data-rel', rel);
        } else {
          widget.removeAttribute('data-rel');
        }

        let procAttrVal = '';
        if (checked.length === procBoxes.length) {
          procAttrVal = 'all';
          widget.setAttribute('data-procedures', 'all');
        } else if (checked.length > 0) {
          procAttrVal = checked.join(',');
          widget.setAttribute('data-procedures', procAttrVal);
        } else {
          widget.removeAttribute('data-procedures');
        }

        const attrs = [];
        if (procAttrVal) attrs.push('  data-procedures="' + procAttrVal + '"');
        attrs.push('  data-currency="' + curr + '"');
        attrs.push('  data-theme="' + theme + '"');
        if (rel !== 'nofollow noopener') attrs.push('  data-rel="' + rel + '"');

        snippetEl.textContent =
          '<script src="' + CDN_URL + '" integrity="' + WIDGET_SRI + '" crossorigin="anonymous" defer><\\/script>\\n' +
          '<chinamedvisit-cost-widget\\n' +
          attrs.join('\\n') +
          '>\\n</chinamedvisit-cost-widget>';
      }

      document.getElementById('btnTop5').addEventListener('click', () => {
        const top5 = new Set([
          'chief-physician-consultation',
          'brain-mri-3t',
          'pet-ct-whole-body',
          'gastroscopy-colonoscopy-painless',
          'executive-health-screening'
        ]);
        procBoxes.forEach((c) => { c.checked = top5.has(c.value); });
        updateConfig();
      });

      document.getElementById('btnAll12').addEventListener('click', () => {
        procBoxes.forEach((c) => { c.checked = true; });
        updateConfig();
      });

      [themeSel, currSel, relSel].forEach((el) => el.addEventListener('change', updateConfig));
      procBoxes.forEach((c) => c.addEventListener('change', updateConfig));

      function flashCopy(btn, text) {
        const orig = btn.textContent;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(() => {
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = orig; }, 1600);
          }).catch(() => {});
        }
      }

      copyHtmlBtn.addEventListener('click', () => flashCopy(copyHtmlBtn, snippetEl.textContent));

      document.querySelectorAll('[data-copy-target]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const target = document.getElementById(btn.getAttribute('data-copy-target'));
          if (target) flashCopy(btn, target.textContent);
        });
      });

      document.querySelectorAll('[data-copy-raw]').forEach((btn) => {
        btn.addEventListener('click', () => {
          flashCopy(btn, btn.getAttribute('data-copy-raw'));
        });
      });

      updateConfig();
    })();
  </script>
</body>
</html>
`;
}

function main() {
  const truth = loadProceduresTruthSource();
  fs.mkdirSync(DIST_DIR, { recursive: true });

  const widgetJs = buildWidgetBundle(truth);
  const widgetBytes = Buffer.byteLength(widgetJs, 'utf8');
  if (widgetBytes >= MAX_WIDGET_BYTES) {
    throw new Error(`Widget bundle too large: ${widgetBytes} bytes (limit < ${MAX_WIDGET_BYTES})`);
  }

  const widgetOutPath = path.join(DIST_DIR, 'chinamedvisit-widget.js');
  fs.writeFileSync(widgetOutPath, widgetJs, 'utf8');
  execFileSync(process.execPath, ['--check', widgetOutPath]);
  const widgetSri = 'sha384-' + crypto.createHash('sha384').update(widgetJs, 'utf8').digest('base64');

  const usdRate = truth.exchangeRates.USD.rateToRmb;
  const mri = truth.procedures.find((p) => p.id === 'brain-mri-3t');
  const pet = truth.procedures.find((p) => p.id === 'pet-ct-whole-body');

  const mriPriceText = `¥${mri.tier3aImcRmbMin.toLocaleString('en-US')}–¥${mri.tier3aImcRmbMax.toLocaleString('en-US')} / $${Math.round(mri.tier3aImcRmbMin * usdRate)}–$${Math.round(mri.tier3aImcRmbMax * usdRate)} vs US $${mri.usAverageUsd.toLocaleString('en-US')}`;
  const petPriceText = `¥${pet.tier3aImcRmbMin.toLocaleString('en-US')}–¥${pet.tier3aImcRmbMax.toLocaleString('en-US')} / $${Math.round(pet.tier3aImcRmbMin * usdRate).toLocaleString('en-US')}–$${Math.round(pet.tier3aImcRmbMax * usdRate).toLocaleString('en-US')} vs US $${pet.usAverageUsd.toLocaleString('en-US')}`;

  if (mriPriceText !== '¥1,200–¥2,400 / $166–$331 vs US $2,200') {
    throw new Error(`Unexpected MRI badge text: ${mriPriceText}`);
  }
  if (petPriceText !== '¥7,000–¥11,000 / $966–$1,518 vs US $5,800') {
    throw new Error(`Unexpected PET-CT badge text: ${petPriceText}`);
  }

  const mriSvg = buildBadgeSvg({
    title: '3.0T Brain MRI',
    label: 'CHINA TIER-3A IMC',
    priceText: mriPriceText,
    savingsPct: 89
  });
  const petSvg = buildBadgeSvg({
    title: 'Whole-Body PET-CT',
    label: 'CHINA TIER-3A IMC',
    priceText: petPriceText,
    savingsPct: 79
  });

  fs.writeFileSync(path.join(DIST_DIR, 'badge-mri-cost.svg'), mriSvg, 'utf8');
  fs.writeFileSync(path.join(DIST_DIR, 'badge-petct-cost.svg'), petSvg, 'utf8');
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), buildPreviewHtml({ ...truth, widgetSri }), 'utf8');
  fs.writeFileSync(
    path.join(DIST_DIR, '_headers'),
    [
      '/*',
      '  X-Robots-Tag: noindex, follow',
      '  X-Content-Type-Options: nosniff',
      '  Referrer-Policy: strict-origin-when-cross-origin',
      '',
      '/*.js',
      '  Access-Control-Allow-Origin: *',
      '  Cross-Origin-Resource-Policy: cross-origin',
      '  Cache-Control: public, max-age=31536000, immutable',
      '',
      '/*.svg',
      '  Access-Control-Allow-Origin: *',
      '  Cross-Origin-Resource-Policy: cross-origin',
      '  Cache-Control: public, max-age=31536000, immutable',
      ''
    ].join('\n'),
    'utf8'
  );
  fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), 'User-agent: *\nAllow: /\n', 'utf8');

  console.log(`Built ${widgetOutPath}: ${widgetBytes} bytes (< ${MAX_WIDGET_BYTES} bytes limit)`);
  console.log(`SRI: ${widgetSri}`);
  console.log(`node --check passed: ${widgetOutPath}`);
  console.log(`Built SVG badges: badge-mri-cost.svg (${Buffer.byteLength(mriSvg)}B), badge-petct-cost.svg (${Buffer.byteLength(petSvg)}B)`);
  console.log(`Built preview page: ${path.join(DIST_DIR, 'index.html')}`);
}

main();
