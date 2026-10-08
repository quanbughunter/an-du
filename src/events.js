/* ===== Ăn Đủ — sự kiện & khởi động ===== */
const Android = window.AnduAndroid || null;

function persistDay(k) { touch(k); }
function pushRecent(fid) {
  S.recent = [fid, ...(S.recent || []).filter((x) => x !== fid)].slice(0, 24);
}
function addEntry(food, g, meal, unitLabel, qty) {
  const k = UI.date;
  const d = getDay(k, true);
  const e = entryFrom(food, g, meal);
  if (unitLabel && unitLabel !== 'gam') { e.u = unitLabel; e.q = Math.round(qty * 100) / 100; }
  d.items.push(e);
  pushRecent(food.id);
  touch(null);
  persistDay(k);
}
function openAdd(meal, mode) {
  const st = UI.addState && UI.addState.meal === meal ? UI.addState : { type: 'add', meal, mode: 'search', q: '', cat: 'recent', text: '' };
  st.type = 'add'; st.meal = meal || st.meal; if (mode) st.mode = mode;
  if (st.cat === 'recent' && !(S.recent || []).length) st.cat = 'all';
  UI.addState = st;
  openSheet(st);
}
function openFood(fid, opts = {}) {
  const f = FOODS.get(fid); if (!f) return;
  let g = opts.g, u;
  const units = unitsOf(f);
  if (g == null) { u = 0; g = units[0].g; }
  else {
    u = units.findIndex((x) => x.g !== 1 && Math.abs(g / x.g - Math.round(g / x.g * 2) / 2) < 1e-6 && g / x.g <= 6);
    if (u < 0) u = units.length - 1;
  }
  openSheet({ type: 'food', fid, g, u, meal: opts.meal || mealByClock(), date: UI.date, back: opts.back || null });
}
function setDate(k) { UI.date = k; if (UI.view !== 'today') go('today'); else renderToday(); }

function applyTheme() {
  const r = document.documentElement, th = S.settings.theme;
  if (th === 'light' || th === 'dark') r.setAttribute('data-theme', th);
  else if (UI.initialTheme) r.setAttribute('data-theme', UI.initialTheme);
  else r.removeAttribute('data-theme');
  if (Android && Android.setBars) {
    try {
      const cs = getComputedStyle(r);
      const bg = cs.getPropertyValue('--bg').trim();
      const dark = th === 'dark' || (th === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      Android.setBars(bg, dark);
    } catch (e) { /* bỏ qua */ }
  }
}

async function capUse(name) {
  try { if (window.claude && typeof window.claude.use === 'function') return await window.claude.use(name); } catch (e) { /* bỏ qua */ }
  return null;
}
async function doExport() {
  const json = exportJSON();
  const name = `an-du-sao-luu-${todayKey()}.json`;
  if (Android && Android.saveFile) {
    let r = '';
    try { r = Android.saveFile(name, json); } catch (e) { r = ''; }
    if (r) { toast(r === name ? `Đã lưu ${name} vào thư mục Tải xuống (Download)` : `Đã lưu tại ${r}`); return; }
    if (Android.share) { try { Android.share(name, json); return; } catch (e) { /* tiếp */ } }
  }
  if (window.claude && typeof window.claude.use === 'function') {
    const dl = await capUse('downloads');
    if (dl) {
      try { await dl.save({ filename: name, data: json }); toast('Đã lưu tệp sao lưu'); }
      catch (e) { if (!e || e.code !== 'declined') { UI.sheet.showText = true; renderSheet(); toast('Không lưu được tệp. Hãy sao chép mã bên dưới.'); } }
      return;
    }
    UI.sheet.showText = true; renderSheet(); toast('Hãy sao chép mã sao lưu bên dưới.');
    return;
  }
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    toast('Đã tải tệp sao lưu');
  } catch (e) { UI.sheet.showText = true; renderSheet(); }
}
function copyText(text) {
  if (Android && Android.copy) { try { Android.copy(text); toast('Đã sao chép'); return; } catch (e) { /* tiếp */ } }
  const fallback = () => {
    UI.sheet.showText = true; renderSheet();
    const ta = $('#bk-out');
    if (ta) { ta.focus(); ta.select(); try { document.execCommand('copy'); toast('Đã sao chép'); } catch (e) { toast('Hãy chọn và sao chép mã bên dưới'); } }
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast('Đã sao chép mã sao lưu')).catch(fallback);
  else fallback();
}
function applyImport(data) {
  S = normalizeState(Object.assign({}, data, { demo: false }));
  const now = Date.now();
  S.meta = { core: now };
  Object.keys(S.days).forEach((k) => { S.meta[monthKey(k)] = now; });
  rebuildFoods(); Store.saveNow();
  if (Cloud.db) { Cloud.allKeys().forEach((k) => Cloud.dirty.add(k)); Cloud.flushSoon(); }
  applyTheme(); closeSheet(); UI.date = todayKey(); go('today');
  toast('Đã khôi phục dữ liệu');
}

// ---------- Click ----------
document.addEventListener('click', (ev) => {
  const nav = ev.target.closest('[data-nav]');
  if (nav) { closeSheet(); go(nav.dataset.nav); return; }
  const el = ev.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action, st = UI.sheet;
  switch (a) {
    case 'close-sheet': closeSheet(); break;
    case 'quick-add': openAdd(mealByClock()); break;
    case 'add': openAdd(el.dataset.meal); break;
    case 'shift-date': setDate(addDays(UI.date, +el.dataset.n)); break;
    case 'pick-date': setDate(el.dataset.date); break;
    case 'open-cal': { const i = $('#date-input'); try { if (i.showPicker) i.showPicker(); else i.click(); } catch (e) { i.click(); } break; }
    case 'set-view': S.settings.view = el.dataset.v; touch(null); renderToday(); break;
    case 'start-real': {
      S = blankState(); rebuildFoods(); Store.saveNow();
      if (Cloud.db) Cloud.mark('core');
      UI.date = todayKey(); go('profile');
      openSheet({ type: 'me', d: cloneP(S.profile), flow: 'setup' });
      toast('Đã xoá dữ liệu mẫu');
      break;
    }
    case 'setup': if (UI.view !== 'profile') go('profile'); openSheet({ type: 'me', d: cloneP(S.profile), flow: 'setup' }); break;
    case 'edit-me': openSheet({ type: 'me', d: cloneP(S.profile) }); break;
    case 'edit-goal': openSheet({ type: 'goal', d: cloneP(S.profile) }); break;
    case 'dset': {
      const k = el.dataset.k; let v = el.dataset.v;
      if (k === 'act' || k === 'rate') v = +v;
      st.d[k] = v;
      if (k === 'goal' && v === 'gain' && st.d.rate > 0.5) st.d.rate = 0.5;
      if (k === 'goal' || k === 'style') renderSheet();
      else {
        $$(`#sheet [data-action="dset"][data-k="${k}"]`).forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === String(el.dataset.v)));
        if (st.type === 'me') updateMeLive(); else updateGoalLive();
      }
      break;
    }
    case 'dstep': {
      const k = el.dataset.k, step = +el.dataset.d;
      const lim = { age: [10, 100], height: [100, 230], weight: [25, 300], tw: [25, 300], km: [0, 300], min: [0, 1440], steps: [0, 200000], sets: [1, 50], reps: [0, 2000], floors: [0, 500] }[k];
      const cur = +st.d[k] || (k === 'tw' ? +st.d.weight : 0);
      if (k === 'sets' && cur + step < 1) break;
      st.d[k] = clamp(Math.round((cur + step) * 10) / 10, lim[0], lim[1]);
      const inp = $(`#sheet [data-d-k="${k}"]`); if (inp) inp.value = k === 'steps' ? String(st.d[k]) : fq(st.d[k]);
      if (st.type === 'me') updateMeLive(); else if (st.type === 'goal') updateGoalLive(); else updateActPreview();
      break;
    }
    case 'me-commit': {
      const d = st.d;
      const bad = !(d.age >= 10 && d.age <= 100) ? 'Tuổi từ 10 đến 100' : !(d.height >= 100 && d.height <= 230) ? 'Chiều cao từ 100 đến 230 cm' : !(d.weight >= 25 && d.weight <= 300) ? 'Cân nặng từ 25 đến 300 kg' : '';
      if (bad) { toast(bad); break; }
      if (st.flow === 'setup') { openSheet({ type: 'goal', d, flow: 'setup' }); break; }
      const oldT = S.profile.goalSet ? calc(S.profile).t : null;
      const wChanged = +d.weight !== +S.profile.weight;
      ['name', 'sex', 'age', 'height', 'weight', 'act'].forEach((k) => { S.profile[k] = d[k]; });
      S.profile.set = true;
      if (wChanged) { const t = todayKey(); S.weights = S.weights.filter((w) => w.d !== t); S.weights.push({ d: t, kg: +d.weight }); }
      touch(null); closeSheet(); renderProfile();
      if (S.profile.goalSet) revealTargets(oldT);
      toast('Đã lưu thông tin cá nhân');
      break;
    }
    case 'goal-commit': {
      const d = st.d;
      if (d.goal !== 'keep' && d.tw && ((d.goal === 'lose' && +d.tw >= +d.weight) || (d.goal === 'gain' && +d.tw <= +d.weight))) { toast(d.goal === 'lose' ? 'Cân nặng mong muốn cần nhỏ hơn hiện tại' : 'Cân nặng mong muốn cần lớn hơn hiện tại'); break; }
      const oldT = S.profile.goalSet ? calc(S.profile).t : null;
      const goalChanged = !S.profile.goalSet || d.goal !== S.profile.goal || +d.tw !== +S.profile.tw;
      const wChanged = +d.weight !== +S.profile.weight;
      Object.assign(S.profile, cloneP(d));
      if (d.goal === 'keep') S.profile.tw = '';
      if (goalChanged || !S.profile.startW) S.profile.startW = +S.profile.weight;
      S.profile.set = true; S.profile.goalSet = true;
      if (wChanged) { const t = todayKey(); S.weights = S.weights.filter((w) => w.d !== t); S.weights.push({ d: t, kg: +d.weight }); }
      touch(null); closeSheet();
      if (UI.view !== 'profile') go('profile'); else renderProfile();
      requestAnimationFrame(() => revealTargets(oldT));
      toast(`Đã áp dụng: ${fk(calc(S.profile).t.k)} kcal mỗi ngày`);
      break;
    }
    case 'copy-meal': {
      const prev = getDay(addDays(UI.date, -1)).items.filter((it) => it.m === el.dataset.meal);
      const d = getDay(UI.date, true);
      prev.forEach((it) => d.items.push(Object.assign({}, it, { i: uid() })));
      persistDay(UI.date); renderToday();
      toast(`Đã chép ${prev.length} món từ hôm trước`);
      break;
    }
    case 'edit-item': {
      const it = getDay(UI.date).items.find((x) => x.i === el.dataset.id); if (!it) break;
      const f = FOODS.get(it.f);
      const units = f ? unitsOf(f) : [{ label: 'gam', g: 1 }];
      let u = it.u ? units.findIndex((x) => x.label === it.u) : -1;
      if (u < 0) u = units.length - 1;
      openSheet({ type: 'food', edit: it.i, fid: it.f, g: it.g, u, meal: it.m, date: UI.date });
      break;
    }
    case 'open-food': openFood(el.dataset.fid, { g: el.dataset.g ? +el.dataset.g : null, meal: el.dataset.meal }); break;
    case 'pick-food': openFood(el.dataset.fid, { meal: st.meal, back: 'add' }); break;
    case 'sheet-back': sheetBack(); break;
    case 'sheet-meal': if (st) { st.meal = el.dataset.meal; if (st.type === 'add') UI.addState = st; renderSheet(); } break;
    case 'add-mode': st.mode = el.dataset.v; renderSheet(); { const f = $('#sheet [data-autofocus]'); if (f) f.focus(); } break;
    case 'food-cat':
      if (st && st.type === 'add') { st.cat = el.dataset.cat; renderSheet(); }
      else { UI.foodCat = el.dataset.cat; renderFoods(); }
      break;
    case 'fav': {
      const id = el.dataset.fid;
      S.fav = (S.fav || []).includes(id) ? S.fav.filter((x) => x !== id) : [id, ...(S.fav || [])];
      touch(null);
      const on = S.fav.includes(id);
      $$(`[data-action="fav"][data-fid="${CSS.escape(id)}"]`).forEach((b) => b.setAttribute('aria-pressed', on));
      if (UI.view === 'foods' && UI.foodCat === 'fav' && !st) renderFoods();
      break;
    }
    case 'unit': {
      const f = sheetFood(st), units = unitsOf(f), nu = units[+el.dataset.i];
      st.u = +el.dataset.i;
      if (nu.g !== 1) st.g = Math.max(0.5, Math.round(st.g / nu.g * 2) / 2) * nu.g;
      renderSheet();
      break;
    }
    case 'qty': {
      const f = sheetFood(st), u = unitsOf(f)[st.u];
      const step = u.g === 1 ? 10 : 0.5;
      let q = Math.round((st.g / u.g + (+el.dataset.d) * step) / step) * step;
      q = Math.max(step, q);
      st.g = q * u.g;
      $('#qty').value = fq(q);
      updateFoodPreview();
      break;
    }
    case 'food-commit': {
      const f = sheetFood(st);
      if (!(st.g > 0)) { toast('Nhập số lượng lớn hơn 0'); break; }
      const u = unitsOf(f)[st.u];
      if (st.edit) {
        const d = getDay(st.date, true), it = d.items.find((x) => x.i === st.edit);
        if (it) { it.g = Math.round(st.g * 10) / 10; it.m = st.meal; if (u && u.g !== 1) { it.u = u.label; it.q = Math.round(st.g / u.g * 100) / 100; } else { delete it.u; delete it.q; } }
        persistDay(st.date); closeSheet(); renderToday(); toast('Đã lưu thay đổi');
      } else {
        const back = st.back;
        addEntry(f, st.g, st.meal, u && u.label, u ? st.g / u.g : null);
        toast(`Đã thêm ${f.name} vào ${mealName(st.meal).toLowerCase()}`);
        if (back === 'add' && UI.addState) { UI.addState.meal = st.meal; openSheet(UI.addState); } else closeSheet();
        if (UI.view !== 'today') go('today'); else renderToday();
      }
      break;
    }
    case 'del-item': {
      const d = getDay(st.date, true);
      d.items = d.items.filter((x) => x.i !== st.edit);
      persistDay(st.date); closeSheet(); renderToday(); toast('Đã xoá món');
      break;
    }
    case 'quick-find': {
      const r = (st.parsed || [])[+el.dataset.i];
      st.mode = 'search'; st.q = r ? r.name || r.raw : ''; renderSheet();
      break;
    }
    case 'quick-commit': {
      const ok = (st.parsed || []).filter((r) => r.food && r.g > 0);
      ok.forEach((r) => addEntry(r.food, r.g, st.meal));
      st.text = ''; closeSheet(); renderToday();
      toast(`Đã thêm ${ok.length} món vào ${mealName(st.meal).toLowerCase()}`);
      break;
    }
    case 'man-basis': st.man.basis = el.dataset.v; renderSheet(); break;
    case 'man-commit': {
      const m = st.man, g = parseNum(m.g);
      const name = (m.name || '').trim();
      if (!name) { toast('Nhập tên món'); $('#man-name').focus(); break; }
      if (!(g > 0)) { toast('Nhập khối lượng đã ăn (g)'); $('#man-g').focus(); break; }
      const vals = {}; ['k', 'c', 'p', 'f', 'x'].forEach((k) => { const v = parseNum(m[k]); vals[k] = isNaN(v) ? 0 : v; });
      if (isNaN(parseNum(m.k))) vals.k = vals.c * 4 + vals.p * 4 + vals.f * 9;
      if (!vals.k && !vals.c && !vals.p && !vals.f) { toast('Nhập ít nhất năng lượng hoặc carb/đạm/béo'); break; }
      const scale = m.basis === '100' ? 1 : 100 / g;
      const per = { k: vals.k * scale, c: vals.c * scale, p: vals.p * scale, f: vals.f * scale, x: vals.x * scale };
      let food;
      if ($('#man-save').checked) {
        const c = { id: 'u-' + uid(), name, k: +per.k.toFixed(1), c: +per.c.toFixed(1), p: +per.p.toFixed(1), f: +per.f.toFixed(1), x: +per.x.toFixed(1), portions: [{ label: 'phần', g }] };
        S.custom.push(c); rebuildFoods(); food = FOODS.get(c.id);
      } else food = makeFood({ id: 'tmp-' + uid(), name, cat: 'my', k: per.k, c: per.c, p: per.p, f: per.f, x: per.x, portions: [] });
      const d = getDay(UI.date, true);
      d.items.push(entryFrom(food, g, st.meal));
      if (FOODS.has(food.id)) pushRecent(food.id);
      touch(null); persistDay(UI.date);
      st.man = null; closeSheet(); renderToday();
      toast(`Đã thêm ${name}`);
      break;
    }
    case 'add-act': openSheet({ type: 'act', a: null, q: '' }); break;
    case 'edit-act': {
      const e = (getDay(UI.date).acts || []).find((x) => x.i === el.dataset.id); if (!e) break;
      if (e.a && ACT.has(e.a)) {
        const a = ACT.get(e.a);
        openSheet({ type: 'act', a: e.a, edit: e.i, d: { mode: e.mode || 'time', km: e.km != null ? e.km : '', min: e.min != null ? e.min : '', steps: e.steps, sets: e.sets, reps: e.reps, floors: e.floors, lv: e.lv != null ? e.lv : defLv(a) } });
      } else {
        const a = actByText(' ' + norm(e.n) + ' ') || ACT.get('hiit');
        openSheet({ type: 'act', a: a.id, edit: e.i, d: { mode: 'time', min: e.min || 30, lv: defLv(a) } });
      }
      break;
    }
    case 'act-choose': st.a = el.dataset.a; st.d = actDraft(ACT.get(st.a)); renderSheet(); break;
    case 'act-back': st.a = null; renderSheet(); break;
    case 'act-mode': { const a = ACT.get(st.a); st.d = Object.assign(actDraft(a, el.dataset.v), { lv: st.d.lv }); renderSheet(); break; }
    case 'act-lv': st.d.lv = +el.dataset.i; $$('#sheet [data-action="act-lv"]').forEach((b) => b.setAttribute('aria-pressed', b === el)); updateActPreview(); break;
    case 'act-commit': {
      const d = st.d;
      const amt = { dist: +d.km, time: +d.min, steps: +d.steps, reps: +d.reps, floors: +d.floors }[d.mode];
      if (!(amt > 0)) { toast('Nhập số lượng lớn hơn 0'); break; }
      const day = getDay(UI.date, true);
      const rec = actRecord(st.a, d, st.edit);
      if (st.edit) day.acts = day.acts.map((x) => (x.i === st.edit ? rec : x)); else day.acts.push(rec);
      persistDay(UI.date); closeSheet(); renderToday();
      toast(`Đã ghi ${rec.n} · −${fk(rec.kcal)} kcal`);
      break;
    }
    case 'actq-commit': {
      const ok = (UI.actParsed || []).filter((r) => r.a && r.mode);
      if (!ok.length) break;
      const day = getDay(UI.date, true);
      const recs = ok.map((r) => actRecord(r.a, r));
      day.acts.push(...recs);
      UI.actQ = ''; UI.actParsed = [];
      persistDay(UI.date); renderToday();
      toast(`Đã ghi ${recs.length} hoạt động · −${fk(recs.reduce((s, r) => s + r.kcal, 0))} kcal`);
      break;
    }
    case 'del-act': { const d = getDay(UI.date, true); d.acts = d.acts.filter((x) => x.i !== st.edit); persistDay(UI.date); closeSheet(); renderToday(); toast('Đã xoá vận động'); break; }
    case 'new-custom': openSheet({ type: 'custom', c: { name: UI.foodQ || '', k: '', c: '', p: '', f: '', x: '', pl: '', pg: '' } }); break;
    case 'edit-custom': {
      const c = S.custom.find((x) => x.id === el.dataset.fid); if (!c) break;
      const p0 = (c.portions || [])[0] || {};
      openSheet({ type: 'custom', id: c.id, c: { name: c.name, k: c.k, c: c.c, p: c.p, f: c.f, x: c.x, pl: p0.label || '', pg: p0.g || '' } });
      break;
    }
    case 'custom-commit': {
      const c = st.c, name = String(c.name || '').trim();
      if (!name) { toast('Nhập tên món'); break; }
      const v = {}; ['k', 'c', 'p', 'f', 'x'].forEach((k) => { const n = parseNum(c[k]); v[k] = isNaN(n) ? 0 : n; });
      if (isNaN(parseNum(c.k))) v.k = Math.round(v.c * 4 + v.p * 4 + v.f * 9);
      const pg = parseNum(c.pg);
      const rec = { id: st.id || 'u-' + uid(), name, k: v.k, c: v.c, p: v.p, f: v.f, x: v.x, portions: pg > 0 ? [{ label: String(c.pl || 'phần').trim() || 'phần', g: pg }] : [] };
      if (st.id) S.custom = S.custom.map((x) => (x.id === st.id ? rec : x)); else S.custom.push(rec);
      rebuildFoods(); touch(null); closeSheet();
      UI.foodCat = 'my'; UI.foodQ = ''; if ($('#food-q')) $('#food-q').value = '';
      if (UI.view === 'foods') renderFoods();
      toast(st.id ? 'Đã lưu món' : `Đã tạo “${name}” trong Món của tôi`);
      break;
    }
    case 'custom-del': {
      S.custom = S.custom.filter((x) => x.id !== st.id);
      S.fav = S.fav.filter((x) => x !== st.id); S.recent = S.recent.filter((x) => x !== st.id);
      rebuildFoods(); touch(null); closeSheet(); if (UI.view === 'foods') renderFoods();
      toast('Đã xoá món. Nhật ký cũ vẫn giữ nguyên.');
      break;
    }
    case 'range': UI.range = +el.dataset.n; renderProgress(); break;
    case 'save-weight': {
      const kg = parseNum($('#w-today').value);
      if (!(kg >= 25 && kg <= 300)) { toast('Nhập cân nặng từ 25 đến 300 kg'); break; }
      const t = todayKey();
      S.weights = S.weights.filter((w) => w.d !== t); S.weights.push({ d: t, kg: Math.round(kg * 10) / 10 });
      S.profile.weight = Math.round(kg * 10) / 10;
      touch(null); renderProgress();
      toast(`Đã lưu ${NF1.format(kg)} kg. Mục tiêu mới: ${fk(calc(S.profile).t.k)} kcal`);
      break;
    }
    case 'del-weight': S.weights = S.weights.filter((w) => w.d !== el.dataset.d); touch(null); renderProgress(); break;
    case 'theme': S.settings.theme = el.dataset.v; touch(null); applyTheme(); $$('[data-action="theme"]').forEach((b) => b.setAttribute('aria-pressed', b === el)); break;
    case 'backup': openSheet({ type: 'backup' }); break;
    case 'export': doExport(); break;
    case 'copy-backup': copyText(exportJSON()); break;
    case 'import-file': $('#file-import').click(); break;
    case 'import-paste': { const r = checkImport($('#bk-in').value); st.pasted = $('#bk-in').value; st.err = r.err || ''; st.pending = r.err ? null : r; renderSheet(); break; }
    case 'import-yes': applyImport(st.pending.data); break;
    case 'import-no': st.pending = null; renderSheet(); break;
    case 'reset-ask': UI.confirmReset = true; renderProfile(); break;
    case 'reset-no': UI.confirmReset = false; renderProfile(); break;
    case 'reset-yes': {
      UI.confirmReset = false;
      S = blankState(); rebuildFoods(); Store.saveNow(); Cloud.wipe();
      applyTheme(); UI.date = todayKey(); go('profile');
      toast('Đã xoá toàn bộ dữ liệu');
      break;
    }
    default: break;
  }
});

// ---------- Nhập liệu ----------
let qTimer = null;
document.addEventListener('input', (ev) => {
  const t = ev.target, st = UI.sheet;
  if (t.id === 'food-q') { UI.foodQ = t.value; clearTimeout(qTimer); qTimer = setTimeout(() => { $('#food-list').innerHTML = foodListHTML(UI.foodQ, UI.foodCat, {}); }, 120); return; }
  if (t.id === 'add-q') {
    st.q = t.value;
    clearTimeout(qTimer);
    qTimer = setTimeout(() => {
      const cats = $('#add-cats');
      if (cats) cats.hidden = !!st.q;
      if (!cats && !st.q) { renderSheet(); const i = $('#add-q'); i.focus(); return; }
      $('#add-list').innerHTML = foodListHTML(st.q, st.cat, { action: 'pick-food', star: false });
    }, 120);
    return;
  }
  if (t.id === 'quick-text') { st.text = t.value; clearTimeout(qTimer); qTimer = setTimeout(updateQuick, 200); return; }
  if (t.dataset.man) { st.man[t.dataset.man] = t.value; return; }
  if (t.dataset.cu) { st.c[t.dataset.cu] = t.value; return; }
  if (t.id === 'qty') {
    const n = parseNum(t.value); if (!(n > 0)) return;
    const u = unitsOf(sheetFood(st))[st.u]; st.g = n * u.g; updateFoodPreview(); return;
  }
  if (t.id === 'act-quick') { UI.actQ = t.value; clearTimeout(qTimer); qTimer = setTimeout(updateActQuick, 160); return; }
  if (t.id === 'act-q') { st.q = t.value; renderSheet(); const i = $('#act-q'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } return; }
  if (st && st.type === 'act' && t.dataset.dK) {
    const k = t.dataset.dK, raw = k === 'steps' ? String(t.value).replace(/[.\s]/g, '') : t.value;
    const n = parseNum(raw); st.d[k] = n >= 0 ? n : ''; updateActPreview(); return;
  }
  if (st && (st.type === 'me' || st.type === 'goal')) {
    if (t.dataset.pct) { st.d.custom[t.dataset.pct] = Math.max(0, Math.round(parseNum(t.value) || 0)); updateGoalLive(); return; }
    const k = t.dataset.dK; if (!k) return;
    if (k === 'name') st.d.name = t.value;
    else { const n = parseNum(t.value); if (k === 'tw') st.d.tw = n > 0 ? n : ''; else if (n > 0) st.d[k] = n; }
    if (st.type === 'me') updateMeLive(); else updateGoalLive();
  }
});
document.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.id === 'date-input' && t.value) setDate(t.value);
  if (t.id === 'burnback') { S.settings.burnBack = t.checked; touch(null); }
  if (t.id === 'man-save' && UI.sheet && UI.sheet.man) UI.sheet.man.save = t.checked;
  if (t.dataset && t.dataset.grams) {
    const n = parseNum(t.value);
    const it = getDay(UI.date).items.find((x) => x.i === t.dataset.grams);
    if (it && n > 0) { it.g = Math.round(n * 10) / 10; delete it.u; delete it.q; persistDay(UI.date); renderToday(); }
  }
  if (t.id === 'file-import' && t.files && t.files[0]) {
    const fr = new FileReader();
    fr.onload = () => {
      if (!UI.sheet || UI.sheet.type !== 'backup') openSheet({ type: 'backup' });
      const r = checkImport(String(fr.result || ''));
      UI.sheet.err = r.err || ''; UI.sheet.pending = r.err ? null : r; renderSheet();
    };
    fr.readAsText(t.files[0]); t.value = '';
  }
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && UI.sheet) closeSheet();
  if (ev.key === 'Enter' && ev.target.id === 'w-today') $('[data-action="save-weight"]').click();
  if (ev.key === 'Enter' && ev.target.id === 'act-quick') { const b = $('[data-action="actq-commit"]'); if (b) b.click(); }
});
let rzTimer = null;
window.addEventListener('resize', () => { clearTimeout(rzTimer); rzTimer = setTimeout(() => { if (UI.view === 'progress') renderProgress(); }, 200); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') Store.saveNow();
  else if (UI.view === 'today' && !UI.sheet) renderToday();
});
try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme); } catch (e) { /* trình duyệt cũ */ }

// Nút Back của Android: đóng sheet → về Hôm nay → thoát
window.__back = function () {
  if (UI.sheet) return sheetBack();
  if (UI.view !== 'today') { go('today'); return true; }
  if (UI.date !== todayKey()) { setDate(todayKey()); return true; }
  return false;
};

// ---------- Khởi động ----------
(function boot() {
  UI.initialTheme = document.documentElement.getAttribute('data-theme');
  const saved = Store.load();
  S = saved ? normalizeState(saved) : demoState();
  if (!saved) Store.saveNow();
  rebuildFoods();
  applyTheme();
  go('today');
  Cloud.onChange = () => { applyTheme(); render(); };
  Cloud.init();
  if (/^https?:$/.test(location.protocol) && 'serviceWorker' in navigator && !window.claude && document.querySelector('link[rel="manifest"]')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
