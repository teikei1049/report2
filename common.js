// common.js
const STORAGE_KEY = "hb_monthly_report_state_v3"; // v2から変える（旧バグ状態と切り離す）

const clone = (obj) => (window.structuredClone ? structuredClone(obj) : JSON.parse(JSON.stringify(obj)));

function pad2(n){ return String(n).padStart(2, "0"); }
function iso(d){ return d.getFullYear() + "-" + pad2(d.getMonth()+1) + "-" + pad2(d.getDate()); }

function monthStartEnd(date = new Date()){
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-based
  const s = new Date(y, m, 1);
  const e = new Date(y, m+1, 0);
  return { start: iso(s), end: iso(e) };
}

const DEFAULT_STATE = (() => {
  const cur = monthStartEnd(new Date());
  return {
    meta: { periodStart: cur.start, periodEnd: cur.end },
    counts: { partnerCompanies: 0, targetCompanies: 0 },
    perf: { totalVisit: 0, totalContract: 0, corpVisit: 0, corpContract: 0, referralCards: 0 },
    lastYear: { totalVisit: 0, totalContract: 0, corpVisit: 0, corpContract: 0, referralCards: 0 },
    partners: [
      { name:"", property:"", visit:0, first:0, apply:0, contract:0, pr:"", cost:0, benefit:"", fee:0, note:"" }
    ],
    planned: [
      { name:"", companySize:"", proposal:"", status:"", nextAction:"", schedule:"" }
    ],
    topics: ""
  };
})();

function deepMerge(base, patch){
  const out = clone(base);
  for(const k of Object.keys(patch||{})){
    if(patch[k] && typeof patch[k] === "object" && !Array.isArray(patch[k])){
      out[k] = deepMerge(out[k] || {}, patch[k]);
    }else{
      out[k] = patch[k];
    }
  }
  return out;
}

function loadState(){
  // v2が残ってたら拾ってマージしたい場合はここで読んで移行もできる
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw) return clone(DEFAULT_STATE);
  try{
    const obj = JSON.parse(raw);
    const merged = deepMerge(DEFAULT_STATE, obj);
    merged.partners = Array.isArray(obj.partners) && obj.partners.length ? obj.partners : clone(DEFAULT_STATE.partners);
    merged.planned  = Array.isArray(obj.planned) && obj.planned.length ? obj.planned : clone(DEFAULT_STATE.planned);
    return merged;
  }catch{
    return clone(DEFAULT_STATE);
  }
}

function saveState(state){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clamp0(v){
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function pct(a,b){ return b > 0 ? (a/b) * 100 : 0; }
function fmt1(n){ return (Number.isFinite(n) ? n : 0).toFixed(1); }

function fmtJPDate(isoStr){
  if(!isoStr) return "—";
  const p = String(isoStr).split("-");
  if(p.length !== 3) return "—";
  const y = Number(p[0]), m = Number(p[1]), d = Number(p[2]);
  if(!y || !m || !d) return "—";
  return `${y}年${pad2(m)}月${pad2(d)}日現在`;
}
function derivePeriodLabel(isoStart){
  if(!isoStart) return "—";
  const p = String(isoStart).split("-");
  if(p.length < 2) return "—";
  const y = Number(p[0]), m = Number(p[1]);
  if(!y || !m) return "—";
  return `${y}.${pad2(m)}`;
}

function computeKPI(state){
  const c = state.perf || {};
  const ly = state.lastYear || {};

  const now = {
    ty:  pct(clamp0(c.totalContract), clamp0(c.totalVisit)),
    cvr: pct(clamp0(c.corpVisit), clamp0(c.totalVisit)),
    ccr: pct(clamp0(c.corpContract), clamp0(c.totalContract)),
    cy:  pct(clamp0(c.corpContract), clamp0(c.corpVisit)),
  };
  const base = {
    ty:  pct(clamp0(ly.totalContract), clamp0(ly.totalVisit)),
    cvr: pct(clamp0(ly.corpVisit), clamp0(ly.totalVisit)),
    ccr: pct(clamp0(ly.corpContract), clamp0(ly.totalContract)),
    cy:  pct(clamp0(ly.corpContract), clamp0(ly.corpVisit)),
  };
  return { now, base };
}

function resetState(){
  const s = clone(DEFAULT_STATE);
  saveState(s);
  return s;
}
