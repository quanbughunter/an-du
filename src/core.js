/* ===== Ăn Đủ — lõi: tiện ích, dữ liệu, tính toán, lưu trữ ===== */

// ---------- Tiện ích ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NF0 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const NF1 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
const NF2 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
const fk = (n) => NF0.format(Math.round(n || 0));                 // kcal
const fg = (n) => (Math.abs(n) < 10 ? NF1 : NF0).format(n || 0);  // gam
const fq = (n) => NF2.format(n || 0);                             // số lượng
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const parseNum = (s) => { if (s == null) return NaN; const t = String(s).trim().replace(/\s/g, '').replace(',', '.'); return t === '' ? NaN : Number(t); };
const ic = (id, cls = '') => `<svg class="icon ${cls}"><use href="#${id}"/></svg>`;
function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9.,%\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- Ngày tháng ----------
const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayKey = () => keyOf(new Date());
const dateOf = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const addDays = (k, n) => { const d = dateOf(k); d.setDate(d.getDate() + n); return keyOf(d); };
const WD = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const WDS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const longDate = (k) => { const d = dateOf(k); return `${WD[d.getDay()]}, ${d.getDate()} tháng ${d.getMonth() + 1}`; };
const shortDate = (k) => { const d = dateOf(k); return `${d.getDate()}/${d.getMonth() + 1}`; };
function relDay(k) {
  const t = todayKey();
  if (k === t) return 'Hôm nay';
  if (k === addDays(t, -1)) return 'Hôm qua';
  if (k === addDays(t, 1)) return 'Ngày mai';
  return dateOf(k).getFullYear() === new Date().getFullYear() ? shortDate(k) : `${shortDate(k)}/${dateOf(k).getFullYear()}`;
}
const monthKey = (k) => 'm-' + k.slice(0, 7);

// ---------- Thực phẩm ----------
const MEALS = [
  { k: 's', name: 'Bữa sáng' },
  { k: 't', name: 'Bữa trưa' },
  { k: 'c', name: 'Bữa tối' },
  { k: 'p', name: 'Bữa phụ' }
];
const mealName = (k) => (MEALS.find((m) => m.k === k) || MEALS[3]).name;
function mealByClock() {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  if (h < 10.5) return 's';
  if (h < 14.5) return 't';
  if (h < 17) return 'p';
  if (h < 21.5) return 'c';
  return 'p';
}
const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function parsePortions(str) {
  return String(str || '').split('|').filter(Boolean).map((p) => {
    const i = p.lastIndexOf(':');
    return { label: p.slice(0, i), g: Number(p.slice(i + 1)) };
  });
}
function makeFood(o) {
  const f = Object.assign({}, o);
  f.nn = norm(f.name);
  f.al = String(f.alias || '').split(',').map((s) => norm(s)).filter(Boolean);
  return f;
}
const BASE = FOOD_ROWS.map((r) => makeFood({
  id: 'f-' + slug(r[0]), name: r[0], cat: r[1], k: r[2], c: r[3], p: r[4], f: r[5], x: r[6], portions: parsePortions(r[7]), alias: r[8]
}));
let FOODS = new Map();
function rebuildFoods() {
  FOODS = new Map();
  BASE.forEach((f) => FOODS.set(f.id, f));
  (S.custom || []).forEach((c) => FOODS.set(c.id, makeFood(Object.assign({ cat: 'my' }, c))));
}
const foodByName = (name) => BASE.find((f) => f.name === name);

function searchFoods(q, limit = 60) {
  const qn = norm(q);
  if (!qn) return [];
  const toks = qn.split(' ');
  const fav = new Set(S.fav || []), rec = new Set(S.recent || []);
  const out = [];
  FOODS.forEach((f) => {
    const nn = f.nn;
    let s = 0;
    if (nn === qn) s = 100;
    else if (f.al.includes(qn)) s = 92;
    else if (nn.startsWith(qn)) s = 90;
    else if ((' ' + nn).includes(' ' + qn)) s = 80;
    else if (f.al.some((a) => a.startsWith(qn))) s = 74;
    else if (nn.includes(qn)) s = 70;
    else if (f.al.some((a) => a.includes(qn))) s = 64;
    else {
      const words = (nn + ' ' + f.al.join(' ')).split(' ');
      const hit = toks.filter((t) => words.some((w) => w.startsWith(t))).length;
      const r = hit / toks.length;
      if (r === 1) s = 58; else if (r >= 0.5) s = 40 * r;
    }
    if (!s) return;
    if (f.cat === 'my') s += 3;
    if (fav.has(f.id)) s += 2;
    if (rec.has(f.id)) s += 1;
    out.push({ f, s });
  });
  out.sort((a, b) => b.s - a.s || a.f.name.length - b.f.name.length);
  return out.slice(0, limit).map((o) => o.f);
}

// ---------- Gõ nhanh: "cơm trắng 1 bát, 2 quả trứng luộc, sữa 200ml" ----------
const UNIT_G = { g: 1, gr: 1, gam: 1, gram: 1, kg: 1000, ml: 1, l: 1000, lit: 1000 };
const PORTION_WORDS = ['bat', 'to', 'qua', 'cai', 'o', 'coc', 'ly', 'lon', 'hop', 'goi', 'dia', 'suat', 'mieng', 'lat', 'thia', 'muong', 'chen', 'cuon', 'phan', 'nam', 'khuc', 'bia', 'hu', 'chai', 'lang', 'chum', 'mui', 'cu', 'bo', 'con', 'vien', 'khoanh', 'thanh', 'nam', 'bich', 'cay', 'hat'];
const NUM_WORDS = { mot: 1, hai: 2, ba: 3, bon: 4, tu: 4, nam: 5, sau: 6, bay: 7, tam: 8, chin: 9, muoi: 10, nua: 0.5 };
function parseQuick(text) {
  const chunks = String(text || '').split(/[\n,;+]|\s(?:và|với|va|voi)\s/i).map((s) => s.trim()).filter(Boolean);
  return chunks.map((raw) => {
    let s = ' ' + norm(raw).replace(/(\d),(\d)/g, '$1.$2') + ' ';
    let grams = null, count = null, unit = null, m;
    const reG = /\s(\d+(?:\.\d+)?)\s*(kg|gram|gam|gr|g|ml|lit|l)(?=\s)/;
    const reP = new RegExp('\\s(\\d+(?:\\.\\d+)?|' + Object.keys(NUM_WORDS).join('|') + ')\\s+(' + PORTION_WORDS.join('|') + ')(\\s+ruoi)?(?=\\s)');
    if ((m = s.match(reG))) {
      grams = Number(m[1]) * UNIT_G[m[2]];
      s = s.replace(m[0], ' ');
    } else if ((m = s.match(reP))) {
      count = NUM_WORDS[m[1]] != null ? NUM_WORDS[m[1]] : Number(m[1]);
      if (m[3]) count += 0.5;
      unit = m[2];
      s = s.replace(m[0], ' ');
    } else if ((m = s.match(/\s(\d+(?:\.\d+)?)(?=\s)/))) {
      const n = Number(m[1]);
      if (n >= 15) grams = n; else count = n;
      s = s.replace(m[0], ' ');
    }
    const name = s.replace(/\s+/g, ' ').trim();
    const food = name ? searchFoods(name, 1)[0] : null;
    const r = { raw, name, food: null, g: 0, label: '' };
    if (!food) return r;
    r.food = food;
    if (grams != null) { r.g = grams; r.label = `${fg(grams)} g`; return r; }
    const ps = food.portions || [];
    let por = null;
    if (unit) por = ps.find((p) => norm(p.label).split(' ')[0] === unit);
    if (!por && unit === 'lang') por = { label: 'lạng', g: 100 };
    if (!por) por = ps[0] || { label: 'phần', g: 100 };
    const c = count == null ? 1 : count;
    r.g = Math.round(c * por.g);
    r.label = `${fq(c)} ${por.label} · ${fg(r.g)} g`;
    return r;
  });
}

// ---------- Hồ sơ & mục tiêu ----------
const ACT_LEVELS = [
  { v: 1.2, name: 'Ít vận động', desc: 'Ngồi nhiều, gần như không tập' },
  { v: 1.375, name: 'Vận động nhẹ', desc: 'Tập 1–3 buổi mỗi tuần' },
  { v: 1.55, name: 'Vận động vừa', desc: 'Tập 3–5 buổi mỗi tuần' },
  { v: 1.725, name: 'Vận động nhiều', desc: 'Tập 6–7 buổi mỗi tuần' },
  { v: 1.9, name: 'Rất nhiều', desc: 'Lao động nặng hoặc tập 2 buổi mỗi ngày' }
];
const GOALS = { lose: 'Giảm cân', keep: 'Giữ cân', gain: 'Tăng cân' };
const STYLES = {
  balanced: { name: 'Cân bằng', desc: 'Đạm vừa đủ, béo khoảng 28%, phần còn lại là carb', pk: { lose: 1.6, keep: 1.2, gain: 1.6 }, fat: 0.28 },
  protein: { name: 'Giàu đạm', desc: 'Hợp khi tập tạ, giảm mỡ mà giữ cơ', pk: { lose: 2.0, keep: 1.8, gain: 2.0 }, fat: 0.27 },
  lowcarb: { name: 'Ít tinh bột', desc: 'Béo khoảng 40%, carb thấp hơn', pk: { lose: 1.8, keep: 1.6, gain: 1.8 }, fat: 0.40 },
  custom: { name: 'Tự chọn %', desc: 'Tự đặt tỉ lệ carb / đạm / béo' }
};
function bmiCat(b) {
  if (b < 18.5) return { name: 'Thiếu cân', st: 'low' };
  if (b < 23) return { name: 'Bình thường', st: 'ok' };
  if (b < 25) return { name: 'Thừa cân', st: 'low' };
  if (b < 30) return { name: 'Béo phì độ I', st: 'high' };
  return { name: 'Béo phì độ II', st: 'high' };
}
function calc(p) {
  const w = clamp(+p.weight || 60, 25, 300), h = clamp(+p.height || 165, 100, 230), a = clamp(+p.age || 25, 10, 100);
  const hm = h / 100;
  const bmi = w / (hm * hm);
  const bmr = 10 * w + 6.25 * h - 5 * a + (p.sex === 'm' ? 5 : -161);
  const tdee = bmr * (+p.act || 1.375);
  const rate = p.goal === 'keep' ? 0 : (+p.rate || 0.5);
  const delta = p.goal === 'lose' ? -rate * 7700 / 7 : p.goal === 'gain' ? rate * 7700 / 7 : 0;
  const notes = [];
  let kcal = tdee + delta;
  const floor = p.sex === 'm' ? 1500 : 1200;
  if (kcal < floor) { kcal = floor; notes.push(`Mục tiêu được giữ ở mức tối thiểu an toàn ${fk(floor)} kcal. Hãy chọn tốc độ giảm chậm hơn.`); }
  if (p.goal === 'lose' && kcal < bmr) notes.push('Mục tiêu đang thấp hơn mức chuyển hoá cơ bản (BMR). Giảm quá nhanh dễ mất cơ và mệt mỏi.');
  if (a < 18) notes.push('Công thức này dành cho người từ 18 tuổi. Người dưới 18 tuổi nên hỏi ý kiến bác sĩ dinh dưỡng.');
  kcal = Math.round(kcal / 10) * 10;
  let P, F, C;
  if (p.style === 'custom') {
    const cc = +(p.custom || {}).c || 50, cp = +(p.custom || {}).p || 20, cf = +(p.custom || {}).f || 30;
    const sum = cc + cp + cf || 100;
    C = kcal * cc / sum / 4; P = kcal * cp / sum / 4; F = kcal * cf / sum / 9;
  } else {
    const st = STYLES[p.style] || STYLES.balanced;
    const baseW = bmi > 27 ? 25 * hm * hm : w;           // người BMI cao: tính đạm theo cân nặng điều chỉnh
    P = (st.pk[p.goal] || 1.4) * baseW;
    F = kcal * st.fat / 9;
    C = (kcal - P * 4 - F * 9) / 4;
    if (C < 60) { C = 60; F = Math.max(30, (kcal - P * 4 - C * 4) / 9); }
  }
  const X = clamp(Math.round(kcal / 1000 * 14), 20, 38);
  const ideal = [18.5 * hm * hm, 22.9 * hm * hm];
  let eta = null;
  const tw = +p.tw;
  if (tw && rate && ((p.goal === 'lose' && tw < w) || (p.goal === 'gain' && tw > w))) eta = Math.ceil(Math.abs(w - tw) / rate);
  return {
    bmi, cat: bmiCat(bmi), bmr, tdee, delta, ideal, eta, water: Math.round(w * 35 / 100) / 10, notes,
    t: { k: kcal, c: Math.round(C), p: Math.round(P), f: Math.round(F), x: X }
  };
}

// ---------- Trạng thái thiếu / đủ / thừa ----------
const RANGES = { c: [0.85, 1.10], p: [0.90, 1.25], f: [0.80, 1.15], x: [0.85, 2.5] };
function kStatus(v, t) {
  const tol = Math.max(50, t * 0.05);
  if (v < t - tol) return 'low';
  if (v > t + tol) return 'high';
  return 'ok';
}
function mStatus(key, v, t) {
  if (!t) return 'ok';
  const r = v / t, [lo, hi] = RANGES[key];
  return r < lo ? 'low' : r > hi ? 'high' : 'ok';
}
const ST_NAME = { low: 'Thiếu', ok: 'Đủ', high: 'Thừa', none: 'Chưa ghi' };

// ---------- Trạng thái ứng dụng ----------
const KEY = 'andu.v1';
let S = null;
function blankState() {
  return {
    v: 1, demo: false,
    profile: { set: false, name: '', sex: 'f', age: 25, height: 160, weight: 55, act: 1.375, goal: 'keep', rate: 0.5, style: 'balanced', custom: { c: 50, p: 20, f: 30 }, tw: '' },
    settings: { theme: 'auto', burnBack: true, view: 'list' },
    custom: [], fav: [], recent: [], weights: [], days: {},
    meta: {}
  };
}
function entryFrom(food, g, meal) {
  return { i: uid(), f: food.id, n: food.name, g: Math.round(g * 10) / 10, m: meal, v: [food.k, food.c, food.p, food.f, food.x] };
}
function demoState() {
  const st = blankState();
  st.demo = true;
  st.profile = { set: true, name: 'Minh (mẫu)', sex: 'm', age: 28, height: 170, weight: 72, act: 1.55, goal: 'lose', rate: 0.5, style: 'balanced', custom: { c: 50, p: 20, f: 30 }, tw: 66 };
  const menus = {
    A: [['Phở bò', 500, 's'], ['Cơm trắng', 300, 't'], ['Cá kho', 150, 't'], ['Rau muống xào tỏi', 200, 't'], ['Chuối', 100, 't'], ['Cơm trắng', 150, 'c'], ['Ức gà (chín)', 150, 'c'], ['Canh rau', 250, 'c'], ['Sữa chua không đường', 100, 'c'], ['Hạt điều', 30, 'p']],
    B: [['Xôi xéo', 200, 's'], ['Cà phê sữa đá', 200, 's'], ['Cơm tấm sườn', 400, 't'], ['Trà sữa trân châu', 500, 'p'], ['Bún chả', 450, 'c'], ['Bia', 330, 'c']],
    C: [['Yến mạch', 50, 's'], ['Sữa tươi không đường', 250, 's'], ['Chuối', 100, 's'], ['Cơm gạo lứt', 250, 't'], ['Thịt bò (chín)', 120, 't'], ['Súp lơ xanh', 200, 't'], ['Đậu phụ sốt cà chua', 200, 't'], ['Bún riêu cua', 500, 'c'], ['Ổi', 150, 'c'], ['Sữa chua Hy Lạp', 170, 'p'], ['Hạnh nhân', 28, 'p']],
    D: [['Bánh mì thịt', 180, 's'], ['Cơm gà', 400, 't'], ['Gỏi cuốn', 240, 'c'], ['Cam', 150, 'c']],
    E: [['Bánh cuốn', 300, 's'], ['Trà đá / trà không đường', 250, 's'], ['Cơm trắng', 225, 't'], ['Cá hồi', 120, 't'], ['Canh chua cá', 300, 't'], ['Rau luộc', 200, 't'], ['Phở gà', 500, 'c'], ['Thanh long', 175, 'c'], ['Sữa đậu nành không đường', 200, 'p'], ['Lạc rang', 30, 'p'], ['Khoai lang (luộc)', 150, 'p']],
    F: [['Mì gói (khô)', 75, 's'], ['Trứng gà', 100, 's'], ['Cơm rang', 350, 't'], ['Nước ngọt có ga', 330, 't'], ['Cơm trắng', 300, 'c'], ['Thịt kho tàu', 150, 'c'], ['Rau luộc', 200, 'c'], ['Snack khoai tây', 32, 'p']],
    T: [['Bánh mì trứng', 150, 's'], ['Cà phê sữa đá', 200, 's'], ['Cơm trắng', 225, 't'], ['Thịt kho tàu', 100, 't'], ['Canh rau', 250, 't'], ['Dưa hấu', 200, 't']]
  };
  const plan = ['T', 'A', 'B', 'C', 'D', 'E', 'F', 'C', 'A', 'B', 'E', 'D', 'A', 'C'];
  const t = todayKey();
  const tg = calc(st.profile).t;
  plan.forEach((mk, i) => {
    const k = addDays(t, -i);
    const items = menus[mk].map(([n, g, m]) => { const f = foodByName(n); return f ? entryFrom(f, g, m) : null; }).filter(Boolean);
    st.days[k] = { items, acts: [], t: tg };
  });
  const w = st.profile.weight;
  const a2 = (n, met, min) => ({ i: uid(), n, met, min, kcal: Math.round(met * w * min / 60) });
  st.days[addDays(t, -2)].acts.push(a2('Đi bộ nhanh', 4.3, 40));
  st.days[addDays(t, -6)].acts.push(a2('Cầu lông', 5.5, 45));
  st.days[addDays(t, -9)].acts.push(a2('Chạy bộ (8 km/h)', 8.3, 25));
  [[-13, 73.4], [-11, 73.1], [-9, 73.2], [-7, 72.8], [-5, 72.6], [-3, 72.5], [-1, 72.2], [0, 72.0]].forEach(([d, kg]) => st.weights.push({ d: addDays(t, d), kg }));
  st.profile.weight = 72;
  st.recent = ['f-uc-ga-chin', 'f-com-trang', 'f-pho-bo', 'f-trung-ga-luoc', 'f-chuoi'];
  st.fav = ['f-com-trang', 'f-uc-ga-chin'];
  return st;
}

// ---------- Ngày & tổng ----------
function getDay(k, create) {
  let d = S.days[k];
  if (!d && create) d = S.days[k] = { items: [], acts: [] };
  return d || { items: [], acts: [] };
}
function sumItems(items) {
  const t = { k: 0, c: 0, p: 0, f: 0, x: 0 };
  items.forEach((it) => { const r = it.g / 100; t.k += it.v[0] * r; t.c += it.v[1] * r; t.p += it.v[2] * r; t.f += it.v[3] * r; t.x += it.v[4] * r; });
  return t;
}
function targetsFor(k) {
  const d = S.days[k];
  if (d && d.t && k < todayKey()) return d.t;
  return calc(S.profile).t;
}
function dayInfo(k) {
  const d = getDay(k);
  const tot = sumItems(d.items);
  const burned = (d.acts || []).reduce((s, a) => s + (a.kcal || 0), 0);
  const T = targetsFor(k);
  const allow = T.k + (S.settings.burnBack ? burned : 0);
  const has = d.items.length > 0;
  return {
    d, tot, burned, T, allow, has,
    st: has ? kStatus(tot.k, allow) : 'none',
    ms: { c: mStatus('c', tot.c, T.c), p: mStatus('p', tot.p, T.p), f: mStatus('f', tot.f, T.f), x: mStatus('x', tot.x, T.x) }
  };
}

// ---------- Lưu trữ: localStorage + (trong artifact) db riêng từng người ----------
const Store = {
  timer: null,
  load() {
    try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch (e) { /* bỏ qua */ }
    return null;
  },
  saveNow() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* bỏ qua */ } },
  save() { clearTimeout(this.timer); this.timer = setTimeout(() => this.saveNow(), 250); }
};
function touch(k) {
  const now = Date.now();
  S.meta = S.meta || {};
  if (k) { S.meta[monthKey(k)] = now; const d = S.days[k]; if (d) d.t = calc(S.profile).t; }
  else S.meta.core = now;
  Store.save();
  Cloud.mark(k ? monthKey(k) : 'core');
}
function normalizeState(st) {
  const b = blankState();
  const o = Object.assign(b, st || {});
  o.profile = Object.assign(blankState().profile, o.profile || {});
  o.settings = Object.assign(blankState().settings, o.settings || {});
  ['custom', 'fav', 'recent', 'weights'].forEach((k) => { if (!Array.isArray(o[k])) o[k] = []; });
  if (!o.days || typeof o.days !== 'object') o.days = {};
  Object.values(o.days).forEach((d) => { d.items = Array.isArray(d.items) ? d.items : []; d.acts = Array.isArray(d.acts) ? d.acts : []; });
  o.meta = o.meta || {};
  return o;
}

const Cloud = {
  db: null, uid: null, dirty: new Set(), timer: null, busy: false, onChange: null,
  async init() {
    try {
      if (!window.claude || typeof window.claude.use !== 'function') return;
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user) return;
      const id = await user.id();
      if (!id) return;
      this.db = db; this.uid = id;
      await this.pull();
    } catch (e) { this.db = null; }
  },
  col() { return this.db.collection('data/users/' + this.uid); },
  payload(key) {
    if (key === 'core') {
      const { days, meta, ...core } = S;
      return Object.assign({}, JSON.parse(JSON.stringify(core)), { updatedAt: (S.meta && S.meta.core) || Date.now() });
    }
    const ym = key.slice(2);
    const days = {};
    Object.keys(S.days).forEach((k) => { if (k.startsWith(ym)) days[k] = S.days[k]; });
    return { days: JSON.parse(JSON.stringify(days)), updatedAt: (S.meta && S.meta[key]) || Date.now() };
  },
  allKeys() {
    const ks = new Set(['core']);
    Object.keys(S.days).forEach((k) => ks.add(monthKey(k)));
    return ks;
  },
  async pull() {
    const snap = await this.col().get();
    const remote = {};
    snap.docs.forEach((d) => { if (d.exists) remote[d.id] = d.data(); });
    const rk = Object.keys(remote);
    if (!rk.length) {
      if (!S.demo) { this.allKeys().forEach((k) => this.dirty.add(k)); this.flushSoon(); }
      return;
    }
    let changed = false;
    if (S.demo && remote.core) {           // máy mới: lấy toàn bộ dữ liệu thật đã lưu
      const core = Object.assign({}, remote.core); delete core.updatedAt;
      const ns = normalizeState(Object.assign(core, { days: {}, meta: {} }));
      rk.filter((k) => k.startsWith('m-')).forEach((k) => { Object.assign(ns.days, remote[k].days || {}); ns.meta[k] = remote[k].updatedAt || 0; });
      ns.meta.core = remote.core.updatedAt || 0;
      S = normalizeState(ns);
      changed = true;
    } else {
      S.meta = S.meta || {};
      rk.forEach((k) => {
        const r = remote[k], lt = S.meta[k] || 0, rt = r.updatedAt || 0;
        if (rt > lt) {
          if (k === 'core') {
            const core = Object.assign({}, r); delete core.updatedAt;
            const keep = { days: S.days, meta: S.meta };
            S = normalizeState(Object.assign({}, core, keep));
          } else {
            const ym = k.slice(2);
            Object.keys(S.days).forEach((d) => { if (d.startsWith(ym)) delete S.days[d]; });
            Object.assign(S.days, r.days || {});
          }
          S.meta[k] = rt; changed = true;
        } else if (lt > rt) this.dirty.add(k);
      });
      this.allKeys().forEach((k) => { if (!remote[k] && !S.demo) this.dirty.add(k); });
      this.flushSoon();
    }
    if (changed) { Store.saveNow(); rebuildFoods(); if (this.onChange) this.onChange(); }
  },
  mark(key) {
    if (!this.db || S.demo) return;
    this.dirty.add(key);
    this.flushSoon();
  },
  flushSoon() { clearTimeout(this.timer); this.timer = setTimeout(() => this.flush(), 1500); },
  async flush() {
    if (!this.db || this.busy || S.demo) return;
    this.busy = true;
    try {
      while (this.dirty.size) {
        const key = this.dirty.values().next().value;
        this.dirty.delete(key);
        try { await this.col().doc(key).set(this.payload(key)); }
        catch (e) {
          if (e && e.code === 'unavailable') { this.dirty.add(key); await new Promise((r) => setTimeout(r, 2000 + Math.random() * 1500)); }
          else if (e && (e.code === 'revoked' || e.code === 'not_granted' || e.code === 'invalid_argument')) { this.db = null; break; }
        }
      }
    } finally { this.busy = false; }
  },
  async wipe() {
    if (!this.db) return;
    try { const snap = await this.col().get(); for (const d of snap.docs) await this.col().doc(d.id).delete(); } catch (e) { /* bỏ qua */ }
  }
};
