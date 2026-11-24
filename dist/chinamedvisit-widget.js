/* ChinaMedVisit Cost Comparison Widget v1.0.0 | Compiled from procedures.ts */
(() => {
  const PROCS = [["chief-physician-consultation","Chief Physician (主任医师) Consultation","知名专家 / 主任医师特需门诊","Specialist Consultation",300,800,1200,2500,450,320,"Same day (appointment scheduled 3-7 days prior)"],["mdt-tumor-board","Multi-Disciplinary Team (MDT 会诊) Tumor Board","多学科专家联合会诊（MDT）","Specialist Consultation",1500,3500,6000,15000,2800,1800,"2 to 4 business days after full dossier submission"],["pathology-second-opinion","Histopathology Slide & Biopsy 2nd Opinion Review","病理切片专家二次会诊与免疫组化复核","Specialist Consultation",600,1800,2800,6000,1500,750,"3 to 5 business days"],["brain-mri-3t","3.0T Brain MRI (with & without Contrast)","3.0T 头部磁共振平扫加增强","Diagnostic Imaging",1200,2400,3500,6500,2200,850,"Scan within 24 hrs; DICOM disc & English report in 24 hrs"],["pet-ct-whole-body","Whole-Body 18F-FDG PET-CT Oncology Scan","全身 PET-CT 肿瘤代谢显像","Diagnostic Imaging",7000,11000,15000,22000,5800,2400,"Completed in morning; formal report available next day"],["chest-ct-contrast","High-Resolution Contrast Chest CT Scan","胸部薄层高分辨 CT（增强）","Diagnostic Imaging",650,1300,2200,4200,1400,650,"Same day scan; report within 4-12 hours"],["gastroscopy-colonoscopy-painless","Painless Gastroscopy + Colonoscopy (Dual Endoscopy)","无痛胃肠镜联合检查（静脉麻醉）","Diagnostic Imaging",2200,4200,8000,16000,3800,2200,"Day procedure (2-3 hours total clinic stay)"],["executive-health-screening","Executive Comprehensive Health Assessment (VIP)","VIP 尊享深度防癌与心脑血管体检套餐","Health Checkups & Screening",4500,9800,12000,28000,4500,2800,"1 full morning; complete English bound report in 48 hrs"],["cardiac-coronary-angiography","Coronary Angiography (CAG Diagnostic)","经桡动脉冠状动脉造影检查","Surgical & Interventional",4500,8500,18000,32000,8200,4200,"1-night inpatient stay for post-puncture observation"],["knee-arthroscopy-meniscus","Arthroscopic Knee Meniscus Repair / Debridement","关节镜下膝关节半月板缝合/修整微创手术","Surgical & Interventional",18000,32000,45000,75000,14500,7200,"2 to 3 days inpatient admission"],["total-hip-replacement","Total Hip Arthroplasty (THA Replacement)","全髋关节置换术（进口陶瓷假体）","Surgical & Interventional",45000,78000,110000,180000,38000,16500,"5 to 7 days inpatient admission + early rehabilitation"],["inpatient-vip-room-daily","Inpatient IMC Private Single Room (Per Day)","特需/国际部单人间病房（按日计费）","Inpatient & Accommodations",1200,2800,3500,7500,2800,1200,"Daily billing basis"]];
  const RATES = [["USD","$",0.138,"US Dollar (USD)"],["EUR","€",0.128,"Euro (EUR)"],["GBP","£",0.109,"British Pound (GBP)"],["AUD","A$",0.212,"Australian Dollar (AUD)"],["CAD","C$",0.191,"Canadian Dollar (CAD)"],["SGD","S$",0.186,"Singapore Dollar (SGD)"],["CNY","¥",1,"Chinese Yuan (RMB)"]];
  const DEFAULTS = ["chief-physician-consultation","brain-mri-3t","pet-ct-whole-body","gastroscopy-colonoscopy-painless","executive-health-screening"];
  const CALC_URL = "https://chinamedvisit.com/cost-calculator";
  const CSS = ":host{display:block;font-family:system-ui,-apple-system,\"Segoe UI\",Roboto,sans-serif;color:var(--ink);--bg:#ffffff;--alt:#f8fafc;--bd:#cbd5e1;--bd2:#e2e8f0;--ink:#0f172a;--mut:#475569;--acc:#0f766e;--acc-bg:#f0fdfa;--sav-bg:#ecfdf5;--sav:#047857;--lnk:#0369a1}:host([data-theme=\"dark\"]){--bg:#0f172a;--alt:#1e293b;--bd:#334155;--bd2:#1e293b;--ink:#f8fafc;--mut:#94a3b8;--acc:#2dd4bf;--acc-bg:#134e4a;--sav-bg:#064e3b;--sav:#6ee7b7;--lnk:#38bdf8}*,*::before,*::after{box-sizing:border-box}.wrap{container-type:inline-size;background:var(--bg);border:1px solid var(--bd);border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.06)}.hd{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--alt);border-bottom:1px solid var(--bd)}.ttl{font-size:14px;font-weight:700;color:var(--ink);line-height:1.3}.sub{font-size:11.5px;color:var(--mut)}.ctrl{display:flex;align-items:center;gap:6px}.ctrl label{font-size:11px;font-weight:600;color:var(--mut)}select{padding:5px 8px;border-radius:6px;border:1px solid var(--bd);background:var(--bg);color:var(--ink);font-size:12px;font-weight:600;font-family:inherit;cursor:pointer}.rows{display:flex;flex-direction:column}.row{display:grid;grid-template-columns:minmax(180px,1.5fr) minmax(130px,1.1fr) minmax(120px,1fr) 84px;gap:10px;align-items:center;padding:11px 16px;border-bottom:1px solid var(--bd2)}.row.head{padding:7px 16px;background:var(--alt);font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--mut)}.row:last-child{border-bottom:0}.pname{font-size:12.5px;font-weight:700;color:var(--ink);line-height:1.3}.pzh{font-size:11px;color:var(--mut);margin-top:2px}.imc{font-size:13px;font-weight:800;color:var(--acc)}.rmb{font-size:10.5px;color:var(--mut)}.bench{font-size:12px;font-weight:600;color:var(--ink)}.sav{display:inline-block;padding:3px 7px;border-radius:999px;background:var(--sav-bg);color:var(--sav);font-size:11px;font-weight:700;text-align:center;white-space:nowrap}.ft{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;padding:9px 16px;background:var(--alt);border-top:1px solid var(--bd);font-size:11.5px;color:var(--mut)}.ft a{color:var(--lnk);font-weight:600;text-decoration:none}.ft a:hover{text-decoration:underline}.mob-lbl{display:none;font-size:10px;font-weight:600;color:var(--mut);text-transform:uppercase}@container (max-width:540px){.row.head{display:none}.row{grid-template-columns:1fr 1fr;gap:8px}.c-proc{grid-column:1 / -1}.mob-lbl{display:block}.c-sav{justify-self:start}}";

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
