/* ===== Ăn Đủ — giao diện ===== */
const UI = { view: 'today', date: todayKey(), range: 7, foodQ: '', foodCat: 'all', sheet: null, addState: null, confirmReset: false, animKey: null, initialTheme: null };
const MC = [['c', 'Carb', 'carb'], ['p', 'Đạm', 'pro'], ['f', 'Béo', 'fat'], ['x', 'Chất xơ', 'fib']];
const MC_LONG = { c: 'Carb (tinh bột)', p: 'Đạm (protein)', f: 'Chất béo', x: 'Chất xơ' };

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.tm); toast.tm = setTimeout(() => { t.hidden = true; }, 2600);
}
const weightKg = () => clamp(+S.profile.weight || 60, 25, 300);
const catOf = (f) => CATS[f.cat] || CATS.my;
const catIcon = (f) => `<span class="cat-ic cc-${catOf(f).color}">${ic('c-' + (CATS[f.cat] ? f.cat : 'my'))}</span>`;
const per100 = (f) => `C ${fg(f.c)} · Đ ${fg(f.p)} · B ${fg(f.f)} · Xơ ${fg(f.x)}`;

// ---------- Điều hướng ----------
function go(view) {
  UI.view = view;
  ['today', 'foods', 'progress', 'profile'].forEach((v) => { $('#v-' + v).hidden = v !== view; });
  $$('[data-nav]').forEach((b) => { if (b.dataset.nav === view) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  render();
  window.scrollTo(0, 0);
}
function render() {
  if (UI.view === 'today') renderToday();
  else if (UI.view === 'foods') renderFoods();
  else if (UI.view === 'progress') renderProgress();
  else renderProfile();
}

// ---------- Đĩa (hero) ----------
function arc(r, len, total, cls, w, off = 0, extra = '') {
  return `<circle cx="120" cy="120" r="${r}" fill="none" class="${cls}" stroke-width="${w}" stroke-dasharray="${len.toFixed(2)} ${total.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 120 120)" ${extra}/>`;
}
function plateSVG(info, anim) {
  const rimR = 105, rimW = 16, Cr = 2 * Math.PI * rimR;
  const ratio = info.has ? info.tot.k / Math.max(1, info.allow) : 0;
  const first = Math.min(ratio, 1), over = Math.max(0, Math.min(ratio - 1, 1));
  let s = `<svg viewBox="0 0 240 240" aria-hidden="true">
    <circle cx="120" cy="120" r="119" class="plate-dish-shadow"/>
    <circle cx="120" cy="120" r="${rimR}" fill="none" class="plate-rim-track" stroke-width="${rimW}"/>`;
  if (first > 0) s += arc(rimR, first * Cr, Cr, 'plate-rim' + (anim ? ' anim' : ''), rimW, 0, `stroke-linecap="round" style="--len:${(first * Cr).toFixed(1)}"`);
  if (over > 0) s += arc(rimR, over * Cr, Cr, 'plate-over', rimW - 8, 0, 'stroke-linecap="round"');
  s += `<circle cx="120" cy="120" r="92" class="plate-dish"/>`;
  const r = 71, Cf = 2 * Math.PI * r, w = 15;
  const kc = info.tot.c * 4, kp = info.tot.p * 4, kf = info.tot.f * 9, sum = kc + kp + kf;
  if (sum > 0) {
    const segs = [[kc, 'var(--carb)'], [kp, 'var(--pro)'], [kf, 'var(--fat)']].filter((x) => x[0] > 0);
    const gap = segs.length > 1 ? 3 : 0;
    let off = 0;
    segs.forEach(([v, col]) => {
      const len = Math.max(0, Cf * v / sum - gap);
      s += `<circle cx="120" cy="120" r="${r}" fill="none" stroke="${col}" stroke-width="${w}" stroke-dasharray="${len.toFixed(2)} ${Cf.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 120 120)"/>`;
      off += Cf * v / sum;
    });
    s += `<circle cx="120" cy="120" r="${r - w / 2 - 1}" class="plate-dish"/>`;
  } else {
    s += `<circle cx="120" cy="120" r="${r}" class="plate-empty" stroke-width="2"/>`;
  }
  return s + '</svg>';
}
function miniPlate(info) {
  const r = 13, C = 2 * Math.PI * r;
  const col = { low: 'var(--low)', ok: 'var(--ok)', high: 'var(--high)' }[info.st];
  let s = `<svg class="mini" viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="${r}" fill="none" stroke="var(--line)" stroke-width="4" ${info.has ? '' : 'stroke-dasharray="2 4"'}/>`;
  if (info.has) {
    const ratio = Math.min(1, info.tot.k / Math.max(1, info.allow));
    s += `<circle cx="17" cy="17" r="${r}" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(ratio * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 17 17)"/>`;
    s += `<circle cx="17" cy="17" r="6" fill="${col}" opacity=".9"/>`;
  }
  return s + '</svg>';
}
function macroBars(info) {
  return MC.map(([k, label, cls]) => {
    const v = info.tot[k], t = info.T[k] || 1, r = v / t;
    const st = info.has ? info.ms[k] : 'none';
    const chip = !info.has ? '—' : st === 'low' ? `Thiếu ${fg(t - v)} g` : st === 'high' ? (k === 'x' ? 'Rất nhiều' : `Thừa ${fg(v - t)} g`) : 'Đủ';
    let bar;
    if (r > 1) { const p = 100 / r; bar = `<b style="width:${p.toFixed(1)}%"></b><s style="left:${p.toFixed(1)}%"></s>`; }
    else bar = `<b style="width:${(r * 100).toFixed(1)}%"></b>`;
    return `<div class="macro m-${cls}">
      <div class="macro-name"><i></i>${label}<em class="num">${fg(v)} / ${fg(t)} g</em></div>
      <span class="chip-st" data-st="${st}">${chip}</span>
      <div class="bar" role="img" aria-label="${label}: ${fg(v)} trên ${fg(t)} gam">${bar}</div>
    </div>`;
  }).join('');
}

// ---------- Gợi ý ----------
const SUGG = {
  p: ['Ức gà (chín)', 'Trứng gà luộc', 'Cá rô phi', 'Đậu phụ', 'Sữa chua Hy Lạp', 'Tôm luộc / hấp', 'Thịt bò (chín)', 'Cá ngừ hộp (ngâm nước)'],
  x: ['Ổi', 'Súp lơ xanh', 'Rau luộc', 'Đậu bắp', 'Táo', 'Yến mạch', 'Thanh long', 'Cà rốt'],
  c: ['Khoai lang (luộc)', 'Chuối', 'Cơm gạo lứt', 'Yến mạch', 'Ngô luộc'],
  f: ['Hạt điều', 'Quả bơ', 'Lạc rang', 'Hạnh nhân', 'Óc chó']
};
const BURN = ['Đi bộ nhanh', 'Đạp xe vừa sức', 'Chạy bộ (8 km/h)', 'Nhảy dây', 'Leo cầu thang', 'Làm việc nhà'];
const HEALTH_TIPS = [
  ['i-drop', 'Uống đủ nước', (c) => `Khoảng ${NF1.format(c.water)} lít mỗi ngày (35 ml × cân nặng). Khát hay bị nhầm với đói.`],
  ['c-rc', 'Nửa đĩa là rau', () => 'Mỗi bữa chính, để rau củ chiếm nửa đĩa — no lâu mà ít calo.'],
  ['c-du', 'Cẩn thận đồ uống ngọt', () => 'Một cốc trà sữa lớn ≈ 430 kcal, gần bằng một bữa ăn. Chọn ít đường hoặc không đường.'],
  ['c-tt', 'Đạm ở mọi bữa', () => 'Chia đạm đều cho 3 bữa (trứng, cá, đậu phụ, thịt nạc) giúp giữ cơ và no lâu.'],
  ['c-tb', 'Tinh bột tốt', () => 'Thay một nửa cơm trắng bằng gạo lứt, khoai lang hoặc yến mạch để tăng chất xơ.'],
  ['i-flame', 'Đi bộ sau bữa', () => '10–15 phút đi bộ sau bữa ăn giúp ổn định đường huyết.'],
  ['c-gv', 'Ít dầu mỡ', () => 'Một thìa canh dầu ăn ≈ 115 kcal. Ưu tiên luộc, hấp, nướng thay vì chiên.'],
  ['i-cal', 'Ghi ngay sau khi ăn', () => 'Ghi món ngay sau bữa sẽ chính xác hơn ghi dồn cuối ngày.']
];
function niceGrams(food, g, capMul = 1) {
  const p = (food.portions || [])[0];
  if (p && p.g >= 20) {
    const cnt = clamp(Math.round(g / p.g * 2) / 2, 0.5, capMul);
    return { g: cnt * p.g, label: `${fq(cnt)} ${p.label}` };
  }
  const gg = clamp(Math.round(g / 10) * 10, 30, 150 * capMul);
  return { g: gg, label: `${gg} g` };
}
function shuffled(names, seedKey) {
  const rnd = seeded(hashStr(seedKey));
  return names.map(foodByName).filter(Boolean).map((f) => ({ f, r: rnd() })).sort((a, b) => a.r - b.r).map((o) => o.f);
}
function suggestFor(m, gap, kcalLeft, seedKey, skip = []) {
  const out = [];
  for (const f of shuffled(SUGG[m], seedKey + m)) {
    const v = f[m]; if (!v || skip.includes(f.id)) continue;
    const ng = niceGrams(f, gap / v * 100, 1);
    const kcal = f.k * ng.g / 100;
    if (kcalLeft != null && kcal > kcalLeft + 60 && m !== 'x') continue;
    out.push({ f, g: ng.g, label: ng.label, kcal, got: v * ng.g / 100 });
    if (out.length === 2) break;
  }
  return out;
}
function mealCombo(gap, info, seedKey) {
  if (gap < 300) {
    const out = [];
    for (const f of shuffled(['Sữa chua Hy Lạp', 'Chuối', 'Táo', 'Sữa đậu nành không đường', 'Ổi', 'Trứng gà luộc', 'Hạt điều'], seedKey + 's')) {
      const p = f.portions[0]; const kcal = f.k * p.g / 100;
      if (kcal <= gap + 60) out.push({ f, g: p.g, label: `1 ${p.label}`, kcal });
      if (out.length === 3) break;
    }
    return { snack: true, items: out };
  }
  const veg = shuffled(['Rau luộc', 'Súp lơ xanh', 'Canh rau', 'Cải ngọt / cải chíp', 'Dưa chuột'], seedKey + 'v')[0];
  const pro = shuffled(SUGG.p, seedKey + 'p')[0];
  const carb = shuffled(['Cơm trắng', 'Cơm gạo lứt', 'Khoai lang (luộc)', 'Bún tươi', 'Bánh mì nguyên cám'], seedKey + 'c')[0];
  const items = [];
  const vp = veg.portions[0]; items.push({ f: veg, g: vp.g, label: `1 ${vp.label}`, kcal: veg.k * vp.g / 100 });
  const pNeed = clamp(info.T.p - info.tot.p, 20, 45);
  let pg = niceGrams(pro, pNeed / pro.p * 100, 2);
  if (pro.k * pg.g / 100 + items[0].kcal > gap + 80) pg = niceGrams(pro, 0, 1);
  items.unshift({ f: pro, g: pg.g, label: pg.label, kcal: pro.k * pg.g / 100 });
  const left = gap - items.reduce((s, i) => s + i.kcal, 0);
  if (left > 70) {
    const cg = niceGrams(carb, left / carb.k * 100, (carb.portions[0] || { g: 100 }).g < 60 ? 4 : 2);
    items.splice(1, 0, { f: carb, g: cg.g, label: cg.label, kcal: carb.k * cg.g / 100 });
  }
  const left2 = gap - items.reduce((s, i) => s + i.kcal, 0);
  if (left2 > 120) {
    const ex = shuffled(['Chuối', 'Sữa chua Hy Lạp', 'Hạt điều', 'Quả bơ', 'Táo', 'Sữa đậu nành không đường'], seedKey + 'e')
      .map((f) => ({ f, p: f.portions[0] })).find((o) => o.f.k * o.p.g / 100 <= left2 + 60);
    if (ex) items.push({ f: ex.f, g: ex.p.g, label: `1 ${ex.p.label}`, kcal: ex.f.k * ex.p.g / 100 });
  }
  return { snack: false, items };
}
const MUNIT = { p: 'đạm', x: 'xơ', c: 'carb', f: 'béo' };
function suggButtons(list, meal, m) {
  return `<div class="sugg">${list.map((s) => `<button data-action="open-food" data-fid="${s.f.id}" data-g="${s.g}" data-meal="${meal}">${ic('i-plus')}<span>${esc(s.f.name)} · ${esc(s.label)} <span class="muted">${m ? `+${fg(s.got)} g ${MUNIT[m]}` : `${fk(s.kcal)} kcal`}</span></span></button>`).join('')}</div>`;
}
function adviceHTML(info, k) {
  const tips = [];
  const isToday = k === todayKey();
  const hour = new Date().getHours();
  const meal = isToday ? mealByClock() : 'c';
  const c0 = calc(S.profile);
  const W = weightKg();
  let comboIds = [];
  const tip = (st, icon, title, body) => tips.push(`<div class="tip" data-st="${st}"><span class="tip-mark">${ic(icon, 'sm')}</span><div class="tip-body"><strong>${title}</strong>${body}</div></div>`);
  if (!info.has) {
    tip('none', 'i-plate', isToday ? 'Bắt đầu ghi bữa đầu tiên' : 'Ngày này chưa có món nào', `<p>Mục tiêu là ${fk(info.T.k)} kcal: ${fg(info.T.c)} g carb, ${fg(info.T.p)} g đạm, ${fg(info.T.f)} g béo, ${fg(info.T.x)} g chất xơ.</p>`);
  } else {
    const diff = info.tot.k - info.allow;
    if (info.st === 'high') {
      const ex = Math.round(diff);
      const chips = BURN.map((n) => ACTIVITIES.find((a) => a[0] === n)).filter(Boolean)
        .map(([n, met]) => ({ n, min: Math.ceil(ex / (met * W / 60)) })).filter((a) => a.min <= 180).slice(0, 4)
        .map((a) => `<span>${esc(a.n)} <b class="num">${a.min}</b> phút</span>`).join('');
      tip('high', 'i-flame', `Dư ${fk(ex)} kcal so với mục tiêu`, `<p>Vận động thêm để đốt phần dư (tính theo cân nặng ${fg(W)} kg):</p><div class="burn">${chips}</div><p style="margin-top:8px">Ghi lại hoạt động ở mục Vận động để cân bằng. Hoặc bữa sau bớt nửa bát cơm (≈ 100 kcal).</p>`);
    } else if (info.st === 'ok') {
      tip('ok', 'i-check', 'Đã đủ năng lượng hôm nay', `<p>${diff >= 0 ? `Chỉ chênh +${fk(diff)} kcal, nằm trong mức cho phép.` : `Còn ${fk(-diff)} kcal — có thể dừng ở đây hoặc ăn nhẹ một phần trái cây.`}</p>`);
    } else {
      const gap = Math.round(-diff);
      const combo = mealCombo(gap, info, k);
      comboIds = combo.items.map((i) => i.f.id);
      const what = combo.snack ? 'một món ăn nhẹ' : `${mealName(meal).toLowerCase()} cân bằng`;
      const body = isToday && hour < 20
        ? `<p>Bạn còn ${fk(gap)} kcal cho hôm nay. Gợi ý ${what}:</p>`
        : `<p>Ngày này ăn thiếu ${fk(gap)} kcal. Thiếu kéo dài dễ mệt và mất cơ. Gợi ý ${what}:</p>`;
      const tot = combo.items.reduce((s, i) => s + i.kcal, 0);
      tip('low', 'i-down', `Còn thiếu ${fk(gap)} kcal`, body + suggButtons(combo.items, meal) + (combo.snack ? '' : `<p class="small" style="margin-top:6px">Cả bữa ≈ ${fk(tot)} kcal. Bấm từng món để thêm.</p>`));
    }
    const kLeft = Math.max(0, info.allow - info.tot.k);
    const ms = [];
    ['p', 'x', 'c', 'f'].forEach((m) => {
      const st = info.ms[m], v = info.tot[m], t = info.T[m];
      if (st === 'low' && !((m === 'c' || m === 'f') && info.st !== 'ok')) ms.push({ m, st, w: (t - v) / t });
      if (st === 'high' && m !== 'x') ms.push({ m, st, w: (v - t) / t });
    });
    ms.sort((a, b) => b.w - a.w).slice(0, 2).forEach(({ m, st }) => {
      const v = info.tot[m], t = info.T[m];
      if (st === 'low') {
        const g = t - v;
        const intro = { p: 'Đạm giúp giữ cơ và no lâu. Thêm một trong các món:', x: 'Chất xơ tốt cho tiêu hoá và đường huyết. Thêm rau, trái cây:', c: 'Thêm tinh bột tốt để đủ năng lượng:', f: 'Thêm chất béo tốt từ hạt và quả bơ:' }[m];
        tip('low', 'i-down', `Thiếu ${fg(g)} g ${MC_LONG[m].toLowerCase()}`, `<p>${intro}</p>` + suggButtons(suggestFor(m, g, m === 'x' ? null : kLeft, k, comboIds), meal, m));
      } else {
        const g = v - t;
        const txt = {
          p: 'Không đáng lo nếu bạn tập luyện. Nhớ uống đủ nước và ăn thêm rau.',
          c: 'Bữa sau giảm cơm, bún, đồ ngọt; tăng rau và món nhiều đạm.',
          f: 'Ưu tiên món luộc, hấp, nướng; hạn chế chiên rán, nước cốt dừa và đồ ăn vặt.'
        }[m];
        tip('high', 'i-up', `${MC_LONG[m]} vượt ${fg(g)} g`, `<p>${txt}</p>`);
      }
    });
  }
  const ht = HEALTH_TIPS[hashStr(k) % HEALTH_TIPS.length];
  tip('none', ht[0], ht[1], `<p>${ht[2](c0)}</p>`);
  return `<section class="advice" aria-label="Lời khuyên"><h3>${ic('i-spark')}Lời khuyên</h3>${tips.join('')}</section>`;
}

// ---------- Hôm nay ----------
function itemSub(it) {
  const r = it.g / 100;
  const q = it.u ? `${fq(it.q)} ${esc(it.u)} · ` : '';
  return `<span>${q}${fg(it.g)} g</span>
    <span class="mc m-carb"><i></i>C ${fg(it.v[1] * r)}</span><span class="mc m-pro"><i></i>Đ ${fg(it.v[2] * r)}</span><span class="mc m-fat"><i></i>B ${fg(it.v[3] * r)}</span>`;
}
function mealsHTML(info, k) {
  return `<div class="meals">${MEALS.map((m) => {
    const items = info.d.items.filter((it) => it.m === m.k);
    const t = sumItems(items);
    const list = items.length
      ? `<ul class="items">${items.map((it) => `<li><button class="item" data-action="edit-item" data-id="${it.i}">
          <div class="item-main"><div class="item-name">${esc(it.n)}</div><div class="item-sub">${itemSub(it)}</div></div>
          <div class="item-kcal num">${fk(it.v[0] * it.g / 100)}</div></button></li>`).join('')}</ul>`
      : `<div class="empty-meal"><span>Chưa có món nào.</span>${m.k !== 's' && hasPrevMeal(k, m.k) ? `<button class="linkbtn" data-action="copy-meal" data-meal="${m.k}">Chép từ hôm trước</button>` : ''}</div>`;
    return `<article class="meal" data-meal="${m.k}">
      <header class="meal-head">
        <div class="meal-title"><h3>${m.name}</h3><span class="num">${items.length ? `${items.length} món · C ${fg(t.c)} · Đ ${fg(t.p)} · B ${fg(t.f)} g` : 'Trống'}</span></div>
        <div class="meal-kcal num">${fk(t.k)}<small>kcal</small></div>
        <button class="add-btn" data-action="add" data-meal="${m.k}" aria-label="Thêm món vào ${m.name.toLowerCase()}">${ic('i-plus', 'sm')}Thêm</button>
      </header>${list}</article>`;
  }).join('')}</div>`;
}
function hasPrevMeal(k, meal) {
  const p = S.days[addDays(k, -1)];
  return !!(p && p.items.some((it) => it.m === meal));
}
function tableHTML(info) {
  const tdSt = (m, v, t) => `<td data-st="${info.has ? (m === 'k' ? kStatus(v, t) : mStatus(m, v, t)) : 'none'}">`;
  let rows = '';
  MEALS.forEach((m) => {
    const items = info.d.items.filter((it) => it.m === m.k);
    const t = sumItems(items);
    rows += `<tr class="grp" data-meal="${m.k}"><td>${m.name}</td><td></td><td>${fk(t.k)}</td><td>${fg(t.c)}</td><td>${fg(t.p)}</td><td>${fg(t.f)}</td><td>${fg(t.x)}</td></tr>`;
    items.forEach((it) => {
      const r = it.g / 100;
      rows += `<tr><td><button class="linkbtn" style="text-decoration:none;font-weight:600" data-action="edit-item" data-id="${it.i}">${esc(it.n)}</button></td>
        <td><input class="num" inputmode="decimal" aria-label="Khối lượng ${esc(it.n)} (g)" data-grams="${it.i}" value="${fq(it.g)}"></td>
        <td>${fk(it.v[0] * r)}</td><td>${fg(it.v[1] * r)}</td><td>${fg(it.v[2] * r)}</td><td>${fg(it.v[3] * r)}</td><td>${fg(it.v[4] * r)}</td></tr>`;
    });
  });
  const T = info.T, tot = info.tot;
  rows += `<tr class="tot"><td>Tổng đã ăn</td><td></td><td>${fk(tot.k)}</td><td>${fg(tot.c)}</td><td>${fg(tot.p)}</td><td>${fg(tot.f)}</td><td>${fg(tot.x)}</td></tr>`;
  rows += `<tr class="tgt"><td>Mục tiêu${info.burned && S.settings.burnBack ? ' (+ vận động)' : ''}</td><td></td><td>${fk(info.allow)}</td><td>${fg(T.c)}</td><td>${fg(T.p)}</td><td>${fg(T.f)}</td><td>${fg(T.x)}</td></tr>`;
  const sg = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + (Math.abs(n) < 10 ? NF1 : NF0).format(Math.abs(n));
  rows += `<tr><td><b>Chênh lệch</b></td><td></td>${tdSt('k', tot.k, info.allow)}${sg(Math.round(tot.k - info.allow))}</td>${tdSt('c', tot.c, T.c)}${sg(tot.c - T.c)}</td>${tdSt('p', tot.p, T.p)}${sg(tot.p - T.p)}</td>${tdSt('f', tot.f, T.f)}${sg(tot.f - T.f)}</td>${tdSt('x', tot.x, T.x)}${sg(tot.x - T.x)}</td></tr>`;
  return `<div class="table-wrap"><table class="daytable"><thead><tr><th>Món</th><th>Gam</th><th>kcal</th><th>Carb</th><th>Đạm</th><th>Béo</th><th>Xơ</th></tr></thead><tbody>${rows}</tbody></table></div>
    <button class="btn block" data-action="add" data-meal="${mealByClock()}">${ic('i-plus')}Thêm món</button>`;
}
function actsHTML(info) {
  const acts = info.d.acts || [];
  const W = weightKg();
  const list = acts.length
    ? `<ul class="items">${acts.map((a) => `<li><button class="item" data-action="edit-act" data-id="${a.i}"><div class="item-main"><div class="item-name">${esc(a.n)}</div><div class="item-sub"><span>${a.min} phút · MET ${NF1.format(a.met)}</span></div></div><div class="item-kcal num">−${fk(a.kcal)}</div></button></li>`).join('')}</ul>`
    : `<div class="empty-meal"><span>Chưa ghi vận động. Đi bộ nhanh 30 phút ≈ ${fk(4.3 * W / 2)} kcal.</span></div>`;
  return `<article class="acts"><header class="meal-head"><div class="meal-title"><h3>Vận động</h3><span>${S.settings.burnBack ? 'Calo đốt được cộng vào mục tiêu ngày' : 'Chỉ ghi lại, không cộng vào mục tiêu'}</span></div>
    <div class="meal-kcal num">${fk(info.burned)}<small>kcal</small></div>
    <button class="add-btn" data-action="add-act" aria-label="Thêm vận động">${ic('i-plus', 'sm')}Thêm</button></header>${list}</article>`;
}
function renderToday() {
  const k = UI.date, t = todayKey();
  const info = dayInfo(k);
  const anim = UI.animKey !== k;
  UI.animKey = k;
  const d0 = dateOf(k), dow = (d0.getDay() + 6) % 7, mon = addDays(k, -dow);
  const week = Array.from({ length: 7 }, (_, i) => addDays(mon, i)).map((dk) => {
    const di = dayInfo(dk), dd = dateOf(dk);
    return `<button class="wday ${dk === t ? 'is-today' : ''}" data-action="pick-date" data-date="${dk}" aria-pressed="${dk === k}" aria-label="${longDate(dk)}: ${ST_NAME[di.st]}">
      ${WDS[dd.getDay()]}${miniPlate(di)}<span class="d">${dd.getDate()}</span></button>`;
  }).join('');
  const name = (S.profile.name || '').trim();
  const leftTxt = !info.has ? 'Chưa ghi món nào'
    : info.st === 'high' ? `Dư ${fk(info.tot.k - info.allow)} kcal`
      : info.st === 'ok' ? 'Đã đủ' : `Còn ${fk(info.allow - info.tot.k)} kcal`;
  const pill = { none: 'Chưa ghi', low: 'Thiếu', ok: 'Đủ', high: 'Thừa' }[info.st];
  const banner = S.demo
    ? `<div class="demo"><p><b>Đây là dữ liệu mẫu</b> để bạn xem thử cách app hoạt động.</p><button class="btn primary sm" data-action="start-real">Bắt đầu của tôi</button></div>`
    : !S.profile.set || !S.profile.goalSet ? `<div class="demo"><p><b>${S.profile.set ? 'Đặt mục tiêu' : 'Nhập hồ sơ'}</b> để app tính lượng calo, carb, đạm, béo phù hợp riêng cho bạn.</p><button class="btn primary sm" data-action="${S.profile.set ? 'edit-goal' : 'setup'}">${S.profile.set ? 'Đặt mục tiêu' : 'Bắt đầu'}</button></div>` : '';
  $('#v-today').innerHTML = `
    <div class="topbar"><div class="wordmark"><span class="wordmark-dot" aria-hidden="true"></span>Ăn Đủ</div>
      <button class="avatar" data-nav="profile" aria-label="Hồ sơ">${name ? esc(name[0].toUpperCase()) : ic('i-user', 'sm')}</button></div>
    <div class="datebar">
      <button class="iconbtn" data-action="shift-date" data-n="-1" aria-label="Ngày trước">${ic('i-left')}</button>
      <button class="date-label" data-action="open-cal"><strong>${relDay(k) === 'Hôm nay' || relDay(k) === 'Hôm qua' || relDay(k) === 'Ngày mai' ? relDay(k) : WD[d0.getDay()]}</strong><span>${longDate(k)}</span></button>
      <input type="date" class="date-input" id="date-input" value="${k}" aria-label="Chọn ngày" tabindex="-1">
      <button class="iconbtn" data-action="shift-date" data-n="1" aria-label="Ngày sau">${ic('i-right')}</button>
    </div>
    <div class="week" role="group" aria-label="Tuần này">${week}</div>
    ${banner}
    <div class="today-grid">
      <div class="today-side">
        <section class="plate-card" data-st="${info.st}" aria-label="Tổng kết ngày">
          <div class="plate-head"><h2>Đĩa ${k === t ? 'hôm nay' : 'ngày ' + shortDate(k)}</h2><span class="status-pill"><i></i>${pill}</span></div>
          <div class="plate-wrap">${plateSVG(info, anim)}
            <div class="plate-center"><div class="big num">${fk(info.tot.k)}</div><div class="of num">/ ${fk(info.allow)} kcal</div><div class="left num">${leftTxt}</div></div>
          </div>
          <div class="kcal-row"><div><b class="num">${fk(info.T.k)}</b><span>Mục tiêu</span></div><div><b class="num">${fk(info.tot.k)}</b><span>Đã ăn</span></div><div><b class="num">${fk(info.burned)}</b><span>Vận động</span></div></div>
          <div class="macros">${macroBars(info)}</div>
        </section>
        ${adviceHTML(info, k)}
      </div>
      <div class="today-main">
        <div class="sec-head"><h2>Nhật ký ăn uống</h2>
          <div class="seg" role="group" aria-label="Kiểu xem"><button data-action="set-view" data-v="list" aria-pressed="${S.settings.view !== 'table'}">${ic('i-list', 'sm')}Theo bữa</button><button data-action="set-view" data-v="table" aria-pressed="${S.settings.view === 'table'}">${ic('i-table', 'sm')}Bảng</button></div>
        </div>
        ${S.settings.view === 'table' ? tableHTML(info) : mealsHTML(info, k)}
        ${actsHTML(info)}
      </div>
    </div>`;
}

// ---------- Thực phẩm ----------
function foodRow(f, opts = {}) {
  const p = (f.portions || [])[0];
  const fav = (S.fav || []).includes(f.id);
  return `<li class="frow"><button class="frow-btn" data-action="${opts.action || 'open-food'}" data-fid="${f.id}">${catIcon(f)}
    <div class="frow-main"><div class="frow-name">${esc(f.name)}</div><div class="frow-sub num">${p ? `${esc(p.label)} ${fg(p.g)} g · ` : ''}${per100(f)}</div></div>
    <div class="frow-kcal num">${fk(f.k)}<small>kcal/100g</small></div></button>
    ${opts.star === false ? '' : `<button class="star" data-action="fav" data-fid="${f.id}" aria-pressed="${fav}" aria-label="${fav ? 'Bỏ yêu thích' : 'Yêu thích'}">${ic('i-star', 'sm')}</button>`}</li>`;
}
function foodsFor(cat) {
  if (cat === 'fav') return (S.fav || []).map((id) => FOODS.get(id)).filter(Boolean);
  if (cat === 'recent') return (S.recent || []).map((id) => FOODS.get(id)).filter(Boolean);
  const all = Array.from(FOODS.values());
  return cat === 'all' ? all : all.filter((f) => f.cat === cat);
}
function catChips(active, extra) {
  const cs = [...extra, ['all', 'Tất cả'], ...Object.keys(CATS).map((c) => [c, CATS[c].name])];
  return cs.map(([v, n]) => `<button class="chip" data-action="food-cat" data-cat="${v}" aria-pressed="${active === v}">${n}</button>`).join('');
}
function foodListHTML(q, cat, rowOpts) {
  if (q.trim()) {
    const res = searchFoods(q);
    return res.length ? res.map((f) => foodRow(f, rowOpts)).join('') : `<li class="list-note">Không tìm thấy “${esc(q)}”. Bạn có thể tạo món mới với giá trị dinh dưỡng của riêng bạn.</li>`;
  }
  const list = foodsFor(cat);
  if (!list.length) {
    const msg = cat === 'fav' ? 'Chưa có món yêu thích. Bấm ngôi sao cạnh một món để lưu vào đây.' : cat === 'recent' ? 'Món bạn thêm gần đây sẽ hiện ở đây.' : cat === 'my' ? 'Chưa có món riêng. Tạo món mới với nhãn dinh dưỡng của bạn.' : 'Không có món nào.';
    return `<li class="list-note">${msg}</li>`;
  }
  if (cat === 'all') {
    return Object.keys(CATS).map((c) => {
      const fs = list.filter((f) => f.cat === c);
      return fs.length ? `<li class="groupname">${CATS[c].name}</li>` + fs.map((f) => foodRow(f, rowOpts)).join('') : '';
    }).join('');
  }
  return list.map((f) => foodRow(f, rowOpts)).join('');
}
function renderFoods() {
  const v = $('#v-foods');
  if (!v.querySelector('#food-q')) {
    v.innerHTML = `<div class="topbar"><h1 style="font-size:28px">Thực phẩm</h1><button class="btn sm primary" data-action="new-custom">${ic('i-plus', 'sm')}Món mới</button></div>
      <p class="muted small">${BASE.length} món có sẵn, giá trị trên 100 g (đồ uống: 100 ml). Món ăn chế biến là ước tính cho một suất phổ biến.</p>
      <div class="searchbox">${ic('i-search')}<input class="input" id="food-q" type="search" placeholder="Tìm: phở, ức gà, sữa chua…" autocomplete="off" aria-label="Tìm thực phẩm"></div>
      <div class="chips" id="food-cats"></div>
      <div class="card" style="padding:6px 12px"><ul class="flist" id="food-list"></ul></div>`;
    $('#food-q').value = UI.foodQ;
  }
  $('#food-cats').innerHTML = catChips(UI.foodCat, [['fav', 'Yêu thích'], ['recent', 'Gần đây']]);
  $('#food-list').innerHTML = foodListHTML(UI.foodQ, UI.foodCat, {});
}

// ---------- Tiến trình ----------
function kcalChart(keys, width) {
  const H = 236, L = 46, R = 14, T = 22, B = 30, n = keys.length;
  const infos = keys.map(dayInfo);
  const vals = infos.map((i) => (i.has ? i.tot.k : 0)), tgs = infos.map((i) => i.allow);
  const step = Math.max(...vals, ...tgs) > 3200 ? 1000 : 500;
  const max = Math.max(step * 2, Math.ceil(Math.max(...vals, ...tgs) * 1.08 / step) * step);
  const iw = width - L - R, ih = H - T - B, cw = iw / n;
  const x = (i) => L + cw * (i + 0.5), y = (v) => T + ih * (1 - v / max);
  const bw = Math.max(4, Math.min(30, cw * 0.62));
  let s = `<svg class="chart" viewBox="0 0 ${width} ${H}" width="${width}" height="${H}" role="img" aria-label="Biểu đồ calo theo ngày so với mục tiêu">`;
  for (let v = 0; v <= max; v += step) s += `<line class="grid" x1="${L}" x2="${width - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${fk(v)}</text>`;
  infos.forEach((info, i) => {
    if (info.has) {
      const top = y(vals[i]);
      s += `<rect class="b-${info.st}" x="${(x(i) - bw / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${(T + ih - top).toFixed(1)}" rx="${Math.min(7, bw / 2).toFixed(1)}"><title>${shortDate(keys[i])}: ${fk(vals[i])} / ${fk(tgs[i])} kcal</title></rect>`;
    } else s += `<rect class="b-none" x="${(x(i) - bw / 2).toFixed(1)}" y="${T + ih - 3}" width="${bw.toFixed(1)}" height="3" rx="1.5"/>`;
  });
  const pts = []; tgs.forEach((t, i) => { pts.push(`${(L + cw * i).toFixed(1)},${y(t).toFixed(1)}`, `${(L + cw * (i + 1)).toFixed(1)},${y(t).toFixed(1)}`); });
  s += `<polyline class="tline" fill="none" points="${pts.join(' ')}"/>`;
  s += `<text class="tlabel" x="${width - R}" y="${y(tgs[n - 1]) - 7}" text-anchor="end">Mục tiêu</text>`;
  const every = n <= 7 ? 1 : n <= 14 ? 2 : 5;
  keys.forEach((k, i) => {
    if ((n - 1 - i) % every) return;
    const d = dateOf(k);
    s += `<text x="${x(i)}" y="${H - 9}" text-anchor="middle">${n <= 7 ? WDS[d.getDay()] + ' ' + d.getDate() : shortDate(k)}</text>`;
  });
  return s + '</svg>';
}
function weightChart(points, width, from, to, tw) {
  const H = 210, L = 46, R = 46, T = 18, B = 28;
  const span = Math.max(1, (dateOf(to) - dateOf(from)) / 864e5);
  const kgs = points.map((p) => p.kg);
  let lo = Math.min(...kgs), hi = Math.max(...kgs);
  if (tw && Math.abs(tw - lo) < 4) { lo = Math.min(lo, tw); hi = Math.max(hi, tw); }
  lo = Math.floor(lo - 0.5); hi = Math.ceil(hi + 0.5);
  const iw = width - L - R, ih = H - T - B;
  const x = (k) => L + iw * ((dateOf(k) - dateOf(from)) / 864e5) / span, y = (v) => T + ih * (1 - (v - lo) / (hi - lo));
  const st = (hi - lo) > 6 ? 2 : 1;
  let s = `<svg class="chart" viewBox="0 0 ${width} ${H}" width="${width}" height="${H}" role="img" aria-label="Biểu đồ cân nặng">`;
  for (let v = lo; v <= hi; v += st) s += `<line class="grid" x1="${L}" x2="${width - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  if (tw && tw >= lo && tw <= hi) s += `<line class="tline" x1="${L}" x2="${width - R}" y1="${y(tw)}" y2="${y(tw)}"/><text class="tlabel" x="${L + 4}" y="${y(tw) - 6}">Mục tiêu ${fg(tw)} kg</text>`;
  const pp = points.map((p) => [x(p.d), y(p.kg)]);
  if (pp.length > 1) {
    s += `<path class="warea" d="M${pp[0][0]},${T + ih} ${pp.map((p) => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')} L${pp[pp.length - 1][0]},${T + ih} Z"/>`;
    s += `<polyline class="wline" points="${pp.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}"/>`;
  }
  pp.forEach((p, i) => { s += `<circle class="${i === pp.length - 1 ? 'wlast' : 'wdot'}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i === pp.length - 1 ? 5.5 : 4}"/>`; });
  const last = pp[pp.length - 1];
  s += `<text class="tlabel" x="${Math.min(width - 4, last[0] + 8)}" y="${last[1] + 4}">${NF1.format(points[points.length - 1].kg)}</text>`;
  s += `<text x="${L}" y="${H - 8}">${shortDate(from)}</text><text x="${width - R}" y="${H - 8}" text-anchor="end">${shortDate(to)}</text>`;
  return s + '</svg>';
}
function renderProgress() {
  const t = todayKey(), n = UI.range;
  const keys = Array.from({ length: n }, (_, i) => addDays(t, i - n + 1));
  const infos = keys.map(dayInfo), logged = infos.filter((i) => i.has);
  const avg = (f) => (logged.length ? logged.reduce((s, i) => s + f(i), 0) / logged.length : 0);
  const okDays = logged.filter((i) => i.st === 'ok').length;
  let streak = 0; for (let i = 0, k = dayInfo(t).has ? t : addDays(t, -1); i < 400; i++, k = addDays(k, -1)) { if (getDay(k).items.length) streak++; else break; }
  const ws = [...S.weights].sort((a, b) => a.d.localeCompare(b.d));
  const wIn = ws.filter((w) => w.d >= keys[0]);
  const wDelta = wIn.length > 1 ? wIn[wIn.length - 1].kg - wIn[0].kg : null;
  const v = $('#v-progress');
  const width = Math.max(300, Math.min(900, (v.clientWidth || $('#main').clientWidth || 600) - 36));
  const lastW = ws.length ? ws[ws.length - 1].kg : S.profile.weight;
  const wFrom = addDays(t, -Math.max(n - 1, 13));
  const wPts = ws.filter((w) => w.d >= wFrom);
  v.innerHTML = `<div class="topbar"><h1 style="font-size:28px">Tiến trình</h1>
      <div class="seg" role="group" aria-label="Khoảng thời gian"><button data-action="range" data-n="7" aria-pressed="${n === 7}">7 ngày</button><button data-action="range" data-n="30" aria-pressed="${n === 30}">30 ngày</button></div></div>
    <div class="kpis">
      <div class="kpi"><b class="num">${logged.length ? fk(avg((i) => i.tot.k)) : '—'}</b><span>kcal trung bình mỗi ngày đã ghi</span></div>
      <div class="kpi"><b class="num">${okDays}/${logged.length}</b><span>ngày ăn đủ mục tiêu</span></div>
      <div class="kpi"><b class="num">${streak}</b><span>ngày ghi chép liên tiếp</span></div>
      <div class="kpi"><b class="num">${wDelta == null ? '—' : (wDelta > 0 ? '+' : wDelta < 0 ? '−' : '') + NF1.format(Math.abs(wDelta)) + ' kg'}</b><span>cân nặng thay đổi</span></div>
    </div>
    <section class="card"><div class="card-head"><h2>Calo mỗi ngày</h2></div>
      <div style="overflow-x:auto">${kcalChart(keys, width)}</div>
      <div class="legend"><span><i style="background:var(--low)"></i>Thiếu</span><span><i style="background:var(--ok)"></i>Đủ</span><span><i style="background:var(--high)"></i>Thừa</span><span><i style="background:transparent;border-top:2px dashed var(--ink);height:0;border-radius:0"></i>Mục tiêu (gồm vận động)</span></div>
    </section>
    <section class="card"><div class="card-head"><h2>Dinh dưỡng trung bình</h2><span class="muted small">${logged.length} ngày có ghi</span></div>
      <div class="avgm">${logged.length ? macroBars({ has: true, tot: { c: avg((i) => i.tot.c), p: avg((i) => i.tot.p), f: avg((i) => i.tot.f), x: avg((i) => i.tot.x) }, T: { c: avg((i) => i.T.c), p: avg((i) => i.T.p), f: avg((i) => i.T.f), x: avg((i) => i.T.x) }, ms: (() => { const tt = { c: avg((i) => i.tot.c), p: avg((i) => i.tot.p), f: avg((i) => i.tot.f), x: avg((i) => i.tot.x) }; const TT = { c: avg((i) => i.T.c), p: avg((i) => i.T.p), f: avg((i) => i.T.f), x: avg((i) => i.T.x) }; return { c: mStatus('c', tt.c, TT.c), p: mStatus('p', tt.p, TT.p), f: mStatus('f', tt.f, TT.f), x: mStatus('x', tt.x, TT.x) }; })() }) : '<p class="muted">Chưa có ngày nào được ghi trong khoảng này.</p>'}</div>
    </section>
    <section class="card"><div class="card-head"><h2>Cân nặng</h2><span class="muted small">Cập nhật cân nặng sẽ tính lại mục tiêu</span></div>
      <div class="row" style="margin-bottom:12px"><div class="input-unit" style="flex:1;min-width:140px"><input class="input num" id="w-today" inputmode="decimal" value="${fq(lastW)}" aria-label="Cân nặng hôm nay (kg)"><em>kg</em></div><button class="btn primary" data-action="save-weight">${ic('i-scale')}Lưu cân hôm nay</button></div>
      ${wPts.length ? `<div style="overflow-x:auto">${weightChart(wPts, width, wFrom, t, +S.profile.tw || null)}</div>` : '<p class="muted">Lưu cân nặng vài lần để thấy biểu đồ.</p>'}
      ${ws.length ? `<ul class="wlist">${ws.slice(-6).reverse().map((w) => `<li><span>${longDate(w.d)}</span><span class="row"><b class="num">${NF1.format(w.kg)} kg</b><button class="star" data-action="del-weight" data-d="${w.d}" aria-label="Xoá">${ic('i-trash', 'sm')}</button></span></li>`).join('')}</ul>` : ''}
    </section>`;
}

// ---------- Hồ sơ ----------
const GOAL_META = {
  lose: { icon: 'i-down', name: 'Giảm cân', desc: 'Ăn ít hơn TDEE để giảm mỡ', tone: 'sky' },
  keep: { icon: 'i-check', name: 'Giữ cân', desc: 'Ăn bằng TDEE, giữ vóc dáng', tone: 'fib' },
  gain: { icon: 'i-up', name: 'Tăng cân', desc: 'Ăn nhiều hơn TDEE để tăng cân', tone: 'peach' }
};
const cloneP = (p) => JSON.parse(JSON.stringify(p));
const pctOf = (T) => ({ c: Math.round(T.c * 4 / T.k * 100), p: Math.round(T.p * 4 / T.k * 100), f: Math.round(T.f * 9 / T.k * 100) });
const mixBar = (T) => { const q = pctOf(T); return `<span class="mix" aria-hidden="true"><i style="flex:${q.c};background:var(--carb)"></i><i style="flex:${q.p};background:var(--pro)"></i><i style="flex:${q.f};background:var(--fat)"></i></span>`; };
function goalLine(p) {
  if (p.goal === 'keep') return 'Ăn bằng TDEE mỗi ngày';
  return `${fq(p.rate)} kg/tuần${p.tw ? ` · đích ${NF1.format(+p.tw)} kg` : ''}`;
}
function meCardHTML() {
  const p = S.profile, name = (p.name || '').trim();
  const act = ACT_LEVELS.find((a) => a.v === +p.act) || ACT_LEVELS[1];
  if (!p.set) {
    return `<button class="me-card empty" data-action="setup"><span class="me-avatar">${ic('i-user')}</span>
      <span class="me-main"><b>Nhập thông tin của bạn</b><span>Tuổi, chiều cao, cân nặng và mức vận động — mất khoảng 1 phút.</span></span>${ic('i-right')}</button>`;
  }
  return `<button class="me-card" data-action="edit-me" aria-label="Sửa thông tin cá nhân">
    <span class="me-avatar">${name ? esc(name[0].toUpperCase()) : ic('i-user')}</span>
    <span class="me-main"><b>${esc(name || 'Bạn')}</b><span class="num">${p.sex === 'm' ? 'Nam' : 'Nữ'} · ${p.age} tuổi · ${fq(p.height)} cm · ${NF1.format(+p.weight)} kg</span><em>${act.name}</em></span>
    <span class="edit-hint">Sửa ${ic('i-right', 'sm')}</span></button>`;
}
function goalCardHTML() {
  const p = S.profile;
  if (!p.goalSet) {
    return `<button class="goal-card empty" data-action="edit-goal"><span class="goal-ic">${ic('i-plus')}</span>
      <span class="goal-main"><b>Đặt mục tiêu</b><span>Chọn giảm, giữ hay tăng cân. Bấm OK là app tính ngay lượng calo, carb, đạm, béo mỗi ngày cho bạn.</span></span></button>`;
  }
  const g = GOAL_META[p.goal], c = calc(p);
  let prog = '';
  const tw = +p.tw, w = +p.weight, sw = +p.startW || w;
  if (p.goal !== 'keep' && tw && sw !== tw) {
    const done = p.goal === 'lose' ? sw - w : w - sw, total = Math.abs(sw - tw);
    const r = clamp(done / total, 0, 1);
    prog = `<span class="goal-prog"><span class="bar"><b style="width:${(r * 100).toFixed(1)}%"></b></span>
      <span class="num">${done > 0 ? `Đã ${p.goal === 'lose' ? 'giảm' : 'tăng'} ${NF1.format(done)} / ${NF1.format(total)} kg` : `Còn ${NF1.format(total)} kg để đạt mục tiêu`}${c.eta ? ` · khoảng ${c.eta} tuần nữa` : ''}</span></span>`;
  }
  return `<button class="goal-card tone-${g.tone}" data-action="edit-goal" aria-label="Sửa mục tiêu">
    <span class="goal-ic">${ic(g.icon)}</span>
    <span class="goal-main"><span class="eyebrow">Mục tiêu</span><b>${g.name}</b><span class="num">${goalLine(p)}</span>${prog}</span>
    <span class="edit-hint">Sửa ${ic('i-right', 'sm')}</span></button>`;
}
function targetsPanelHTML() {
  const p = S.profile;
  if (!p.goalSet) return '';
  const c = calc(p), T = c.t, q = pctOf(T);
  const sign = c.delta < 0 ? '−' : '+';
  return `<section class="card targets" id="targets-panel" aria-live="polite">
    <div class="card-head"><h2>Mục tiêu dinh dưỡng mỗi ngày</h2></div>
    <div class="tg-big"><b class="num" data-count="k">${fk(T.k)}</b><span>kcal mỗi ngày</span></div>
    <div class="tg-eq num"><span>TDEE ${fk(c.tdee)}</span>${p.goal === 'keep' ? '' : `<span>${sign} ${fk(Math.abs(c.delta))}</span>`}<span class="tg-eq-res">= ${fk(T.k)} kcal</span></div>
    ${mixBar(T)}
    <div class="mtargets">
      <div class="mt m-carb"><b class="num"><span data-count="c">${T.c}</span> g</b><span>Carb ${q.c}%</span></div>
      <div class="mt m-pro"><b class="num"><span data-count="p">${T.p}</span> g</b><span>Đạm ${q.p}%</span></div>
      <div class="mt m-fat"><b class="num"><span data-count="f">${T.f}</span> g</b><span>Béo ${q.f}%</span></div>
      <div class="mt m-fib"><b class="num"><span data-count="x">${T.x}</span> g</b><span>Chất xơ</span></div>
    </div>
    <p class="hint">Kiểu phân bổ: <b>${STYLES[p.style].name}</b>. Nước: khoảng ${NF1.format(c.water)} lít mỗi ngày.</p>
    ${c.notes.map((n) => `<p class="warn">${n}</p>`).join('')}
  </section>`;
}
function bodyCardHTML() {
  const p = S.profile, c = calc(p);
  const pos = clamp((c.bmi - 15) / (35 - 15), 0, 1);
  return `<section class="card"><div class="card-head"><h2>Chỉ số cơ thể</h2><span class="chip-st" data-st="${c.cat.st}">${c.cat.name}</span></div>
    <div class="bmi"><div class="bmi-wrap"><div class="bmi-pin" style="left:${(pos * 100).toFixed(1)}%"><b class="num">${NF1.format(c.bmi)}</b></div>
      <div class="bmi-scale" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div></div>
      <div class="bmi-ticks" aria-hidden="true">${[18.5, 23, 25, 30].map((v) => `<span style="left:${((v - 15) / 20 * 100).toFixed(1)}%">${NF1.format(v)}</span>`).join('')}</div>
      <div class="legend">${[['var(--sky)', 'Thiếu cân'], ['var(--ok)', 'Bình thường'], ['var(--fat)', 'Thừa cân'], ['var(--low)', 'Béo phì I'], ['var(--high)', 'Béo phì II']].map(([col, n]) => `<span><i style="background:${col}"></i>${n}</span>`).join('')}</div>
    </div>
    <div class="stats" style="margin-top:14px">
      <div class="stat"><b class="num">${NF1.format(c.bmi)}</b><span>BMI</span></div>
      <div class="stat"><b class="num">${fk(c.bmr)}</b><span>BMR (kcal)</span></div>
      <div class="stat"><b class="num">${fk(c.tdee)}</b><span>TDEE (kcal)</span></div>
    </div>
    <p class="hint" style="margin-top:10px">Cân nặng hợp lý với chiều cao của bạn: <b>${fg(c.ideal[0])}–${fg(c.ideal[1])} kg</b> (BMI 18,5–22,9, chuẩn người châu Á).</p>
    <details class="how"><summary>Cách tính các chỉ số</summary>
      <p class="formula">BMI = cân nặng ÷ chiều cao² (m). BMR theo Mifflin–St Jeor: <code>10 × cân nặng + 6,25 × chiều cao − 5 × tuổi ${p.sex === 'm' ? '+ 5' : '− 161'}</code>. TDEE = BMR × hệ số vận động (${NF2.format(+p.act)}). Giảm hoặc tăng 1 kg mỡ cần chênh khoảng 7.700 kcal, nên 0,5 kg/tuần ≈ 550 kcal/ngày. Chất xơ: 14 g cho mỗi 1.000 kcal. Nước: 35 ml cho mỗi kg cân nặng.</p>
    </details>
  </section>`;
}
function renderProfile() {
  const th = S.settings.theme;
  $('#v-profile').innerHTML = `<div class="topbar"><h1 style="font-size:28px">Hồ sơ</h1>${S.demo ? '<span class="chip-st" data-st="none">Dữ liệu mẫu</span>' : ''}</div>
  <div class="prof-grid">
    <div class="prof-col">${meCardHTML()}${goalCardHTML()}${targetsPanelHTML()}</div>
    <div class="prof-col">
      ${S.profile.set ? bodyCardHTML() : ''}
      <section class="card stack"><h2>Cài đặt</h2>
        <div class="field"><span>Giao diện</span><div class="seg wide" role="group">${[['auto', 'Theo máy'], ['light', 'Sáng'], ['dark', 'Tối']].map(([v, n]) => `<button data-action="theme" data-v="${v}" aria-pressed="${th === v}">${n}</button>`).join('')}</div></div>
        <label class="switch"><span><b>Cộng calo vận động vào mục tiêu</b><br><span class="hint">Ghi 300 kcal vận động thì hôm đó được ăn thêm 300 kcal.</span></span><input type="checkbox" id="burnback" ${S.settings.burnBack ? 'checked' : ''}></label>
        <div class="row"><button class="btn" data-action="backup">${ic('i-download')}Sao lưu & khôi phục</button></div>
        ${UI.confirmReset ? `<div class="confirm"><b>Xoá toàn bộ nhật ký, hồ sơ và món tự tạo?</b><span class="small">Không thể hoàn tác. Hãy sao lưu trước nếu cần.</span><div class="row"><button class="btn danger" data-action="reset-yes">${ic('i-trash')}Xoá hết</button><button class="btn" data-action="reset-no">Giữ lại</button></div></div>` : `<button class="btn danger" data-action="reset-ask">${ic('i-trash')}Xoá toàn bộ dữ liệu</button>`}
      </section>
      <section class="card stack"><h2>Về dữ liệu</h2>
        <p class="small muted">Giá trị dinh dưỡng tham khảo Bảng thành phần thực phẩm Việt Nam (Viện Dinh dưỡng) và USDA FoodData Central. Món chế biến sẵn là ước tính, nên dùng làm mốc tham khảo. Calo vận động tính theo chỉ số MET. BMI phân loại theo chuẩn châu Á (IDI & WPRO). App không thay thế tư vấn của bác sĩ dinh dưỡng.</p>
        <p class="small muted">Dữ liệu của bạn chỉ lưu trên thiết bị này${Cloud.db ? ' và trong tài khoản Claude của bạn' : ''}.</p>
      </section>
    </div>
  </div>`;
}
// Hiệu ứng sau khi bấm OK: khung mục tiêu nảy nhẹ và các con số chạy từ giá trị cũ sang mới
function revealTargets(oldT) {
  const panel = $('#targets-panel'); if (!panel) return;
  const T = calc(S.profile).t;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  panel.classList.remove('reveal'); void panel.offsetWidth; panel.classList.add('reveal');
  try { panel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); } catch (e) { panel.scrollIntoView(); }
  if (reduce) return;
  $$('[data-count]', panel).forEach((el) => {
    const k = el.dataset.count, to = T[k], from = oldT ? oldT[k] : 0;
    if (from === to) return;
    const t0 = performance.now(), dur = 900;
    const step = (now) => {
      const r = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - r, 3);
      el.textContent = k === 'k' ? fk(from + (to - from) * e) : Math.round(from + (to - from) * e);
      if (r < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

// -- Sheet: thông tin cá nhân (nháp, chỉ lưu khi bấm Lưu / Tiếp tục)
const numField = (id, k, val, unit, step, mode = 'decimal') => `<div class="numfield"><button class="iconbtn" data-action="dstep" data-k="${k}" data-d="-${step}" aria-label="Giảm">${ic('i-minus')}</button>
  <div class="input-unit"><input class="input num" id="${id}" data-d-k="${k}" inputmode="${mode}" value="${val === '' || val == null ? '' : fq(val)}" placeholder="—"><em>${unit}</em></div>
  <button class="iconbtn" data-action="dstep" data-k="${k}" data-d="${step}" aria-label="Tăng">${ic('i-plus')}</button></div>`;
function meSheetHTML(st) {
  const d = st.d;
  const setup = st.flow === 'setup';
  return `${topBar(setup ? 'Thông tin của bạn' : 'Sửa thông tin cá nhân')}
    ${setup ? '<div class="steps" aria-label="Bước 1 trên 2"><i class="on"></i><i></i><span>Bước 1/2</span></div>' : ''}
    <div class="field"><label for="d-name">Tên gọi</label><input class="input" id="d-name" data-d-k="name" value="${esc(d.name)}" placeholder="Ví dụ: Hiển" autocomplete="off"></div>
    <div class="field"><span>Giới tính</span><div class="seg wide" role="group">${[['f', 'Nữ'], ['m', 'Nam']].map(([v, n]) => `<button data-action="dset" data-k="sex" data-v="${v}" aria-pressed="${d.sex === v}">${n}</button>`).join('')}</div></div>
    <div class="grid3 numgrid">
      <div class="field"><label for="d-age">Tuổi</label>${numField('d-age', 'age', d.age, 'tuổi', 1, 'numeric')}</div>
      <div class="field"><label for="d-height">Chiều cao</label>${numField('d-height', 'height', d.height, 'cm', 1)}</div>
      <div class="field"><label for="d-weight">Cân nặng</label>${numField('d-weight', 'weight', d.weight, 'kg', 0.5)}</div>
    </div>
    <div class="field"><span>Mức vận động</span><div class="optcards">${ACT_LEVELS.map((a, i) => `<button class="optcard" data-action="dset" data-k="act" data-v="${a.v}" aria-pressed="${+d.act === a.v}"><span class="lvl" aria-hidden="true">${[0, 1, 2, 3, 4].map((j) => `<i class="${j <= i ? 'on' : ''}" style="height:${6 + j * 4}px"></i>`).join('')}</span><span><b>${a.name}</b><span>${a.desc}</span></span></button>`).join('')}</div></div>
    <div class="sheet-foot"><div class="live num" id="me-live"></div>
      <div class="row"><button class="btn" data-action="close-sheet">Huỷ</button><button class="btn primary" style="flex:1" data-action="me-commit">${setup ? 'Tiếp tục' : 'Lưu'}</button></div></div>`;
}
function updateMeLive() {
  const el = $('#me-live'); if (!el) return;
  const c = calc(UI.sheet.d);
  el.innerHTML = `<span>BMI <b>${NF1.format(c.bmi)}</b> <span class="chip-st" data-st="${c.cat.st}">${c.cat.name}</span></span><span>TDEE <b>${fk(c.tdee)}</b> kcal</span>`;
}

// -- Sheet: mục tiêu (nháp, chỉ áp dụng khi bấm OK)
function goalSheetHTML(st) {
  const d = st.d, setup = st.flow === 'setup';
  const rates = d.goal === 'gain' ? [0.25, 0.5] : [0.25, 0.5, 0.75, 1];
  const c = calc(d);
  return `${topBar(setup ? 'Mục tiêu của bạn' : 'Sửa mục tiêu', setup ? 'sheet-back' : '')}
    ${setup ? '<div class="steps" aria-label="Bước 2 trên 2"><i class="on"></i><i class="on"></i><span>Bước 2/2</span></div>' : ''}
    <div class="goalopts" role="group" aria-label="Mục tiêu">${Object.entries(GOAL_META).map(([k, g]) => `<button class="goalopt tone-${g.tone}" data-action="dset" data-k="goal" data-v="${k}" aria-pressed="${d.goal === k}"><span class="goal-ic">${ic(g.icon)}</span><b>${g.name}</b><span>${g.desc}</span></button>`).join('')}</div>
    ${d.goal !== 'keep' ? `<div class="field"><span>Tốc độ</span><div class="rates">${rates.map((r) => `<button class="rate" data-action="dset" data-k="rate" data-v="${r}" aria-pressed="${+d.rate === r}"><b class="num">${fq(r)} kg</b><span class="num">mỗi tuần</span><em class="num">${d.goal === 'lose' ? '−' : '+'}${fk(r * 1100)} kcal/ngày</em></button>`).join('')}</div>
      <p class="hint">${d.goal === 'lose' ? 'Giảm 0,25–0,5 kg mỗi tuần là bền vững nhất, ít mất cơ.' : 'Tăng 0,25 kg mỗi tuần giúp hạn chế tích mỡ.'}</p></div>
    <div class="field"><label for="d-tw">Cân nặng mong muốn (không bắt buộc)</label>${numField('d-tw', 'tw', d.tw, 'kg', 0.5)}<p class="hint" id="tw-hint"></p></div>` : ''}
    <div class="field"><span>Phân bổ dinh dưỡng</span><div class="optcards">${Object.entries(STYLES).map(([k, s]) => {
      const T = calc(Object.assign({}, d, { style: k })).t, q = pctOf(T);
      return `<button class="optcard style" data-action="dset" data-k="style" data-v="${k}" aria-pressed="${d.style === k}"><span style="flex:1;min-width:0"><b>${s.name}</b><span>${s.desc}</span><span id="mix-${k}" class="mixrow">${mixBar(T)}<span class="num">C ${q.c}% · Đ ${q.p}% · B ${q.f}%</span></span></span></button>`;
    }).join('')}</div></div>
    ${d.style === 'custom' ? `<div class="grid3">${[['c', 'Carb'], ['p', 'Đạm'], ['f', 'Béo']].map(([k, n]) => `<div class="field"><label for="d-c${k}">${n}</label><div class="input-unit"><input class="input num" id="d-c${k}" data-pct="${k}" inputmode="numeric" value="${d.custom[k]}"><em>%</em></div></div>`).join('')}</div><p class="hint" id="pct-sum"></p>` : ''}
    <div class="sheet-foot"><div class="live num" id="goal-live"></div>
      <div class="row"><button class="btn" data-action="${setup ? 'sheet-back' : 'close-sheet'}">${setup ? 'Quay lại' : 'Huỷ'}</button><button class="btn brand" style="flex:1" data-action="goal-commit">${ic('i-check')}OK, áp dụng</button></div></div>`;
}
function updateGoalLive() {
  const st = UI.sheet, d = st.d, el = $('#goal-live'); if (!el) return;
  const c = calc(d), T = c.t;
  el.innerHTML = `<span><b class="big">${fk(T.k)}</b> kcal/ngày</span><span>C <b>${T.c}</b> · Đ <b>${T.p}</b> · B <b>${T.f}</b> · Xơ <b>${T.x}</b> g</span>`;
  const h = $('#tw-hint');
  if (h) {
    const tw = +d.tw, w = +d.weight;
    let msg = `Khoảng hợp lý với chiều cao của bạn: ${fg(c.ideal[0])}–${fg(c.ideal[1])} kg.`;
    if (tw) {
      if (d.goal === 'lose' && tw >= w) msg = `Để giảm cân, cân nặng mong muốn cần nhỏ hơn hiện tại (${NF1.format(w)} kg).`;
      else if (d.goal === 'gain' && tw <= w) msg = `Để tăng cân, cân nặng mong muốn cần lớn hơn hiện tại (${NF1.format(w)} kg).`;
      else if (c.eta) { const day = new Date(); day.setDate(day.getDate() + c.eta * 7); msg = `Khoảng ${c.eta} tuần, tới khoảng ${day.getDate()}/${day.getMonth() + 1}/${day.getFullYear()}. ` + msg; }
    }
    h.textContent = msg;
  }
  Object.keys(STYLES).forEach((k) => {
    const m = $('#mix-' + k); if (!m) return;
    const T2 = calc(Object.assign({}, d, { style: k })).t, q = pctOf(T2);
    m.innerHTML = `${mixBar(T2)}<span class="num">C ${q.c}% · Đ ${q.p}% · B ${q.f}%</span>`;
  });
  const ps = $('#pct-sum');
  if (ps) { const s = (+d.custom.c || 0) + (+d.custom.p || 0) + (+d.custom.f || 0); ps.textContent = s === 100 ? 'Tổng 100%.' : `Tổng hiện là ${s}%. App sẽ tự quy đổi theo tỉ lệ.`; }
}
function sheetBack() {
  const st = UI.sheet; if (!st) return false;
  if (st.type === 'goal' && st.flow === 'setup') { openSheet({ type: 'me', d: st.d, flow: 'setup' }); return true; }
  if (st.back === 'add' && UI.addState) { UI.addState.meal = st.meal; openSheet(UI.addState); return true; }
  closeSheet(); return true;
}

// ---------- Sheet ----------
function openSheet(state) {
  UI.sheet = state;
  $('#sheet').hidden = false;
  document.body.style.overflow = 'hidden';
  renderSheet();
  setTimeout(() => { const f = $('#sheet [data-autofocus]'); if (f && window.matchMedia('(min-width: 700px)').matches) f.focus(); }, 60);
}
function closeSheet() {
  UI.sheet = null;
  $('#sheet').hidden = true;
  document.body.style.overflow = '';
}
function renderSheet() {
  const st = UI.sheet; if (!st) return;
  const body = $('#sheet-body');
  const h = { add: addSheetHTML, food: foodSheetHTML, act: actSheetHTML, custom: customSheetHTML, backup: backupSheetHTML, me: meSheetHTML, goal: goalSheetHTML }[st.type];
  const keep = body.dataset.type === st.type ? body.scrollTop : 0;
  body.innerHTML = h(st);
  body.dataset.type = st.type;
  body.scrollTop = keep;
  if (st.type === 'me') updateMeLive();
  if (st.type === 'goal') updateGoalLive();
  if (st.type === 'add' && st.mode === 'quick') updateQuick();
  if (st.type === 'food') updateFoodPreview();
  if (st.type === 'act') updateActPreview();
}
const topBar = (title, back, extra = '') => `<div class="sheet-top">${back ? `<button class="iconbtn ghost" data-action="${back}" aria-label="Quay lại">${ic('i-left')}</button>` : ''}<h2 id="sheet-title">${title}</h2>${extra}<button class="iconbtn ghost" data-action="close-sheet" aria-label="Đóng">${ic('i-x')}</button></div>`;
const mealSeg = (cur, action = 'sheet-meal') => `<div class="seg wide" role="group" aria-label="Chọn bữa">${MEALS.map((m) => `<button data-action="${action}" data-meal="${m.k}" aria-pressed="${cur === m.k}">${m.name.replace('Bữa ', '').replace(/^./, (c) => c.toUpperCase())}</button>`).join('')}</div>`;

// -- Thêm món
function addSheetHTML(st) {
  const tabs = [['search', 'i-search', 'Tìm món'], ['quick', 'i-type', 'Gõ nhanh'], ['manual', 'i-pen', 'Nhập tay']];
  let inner = '';
  if (st.mode === 'search') {
    inner = `<div class="searchbox">${ic('i-search')}<input class="input" id="add-q" type="search" placeholder="Tìm: phở, cơm, trứng, ức gà…" autocomplete="off" value="${esc(st.q)}" data-autofocus aria-label="Tìm món"></div>
      ${st.q ? '' : `<div class="chips" id="add-cats">${catChips(st.cat, [['recent', 'Gần đây'], ['fav', 'Yêu thích']])}</div>`}
      <ul class="flist" id="add-list">${foodListHTML(st.q, st.cat, { action: 'pick-food', star: false })}</ul>`;
  } else if (st.mode === 'quick') {
    inner = `<div class="field"><label for="quick-text">Gõ các món đã ăn, mỗi món một dòng hoặc cách nhau dấu phẩy</label>
      <textarea class="input" id="quick-text" placeholder="cơm trắng 1 bát, 2 quả trứng luộc, rau muống xào 150g, sữa tươi 200ml" data-autofocus>${esc(st.text || '')}</textarea>
      <p class="hint">Hiểu được: 200g, 1,5 bát, nửa ổ, 2 quả, 1 lạng, 250ml… Không ghi lượng thì tính 1 khẩu phần.</p></div>
      <ul class="parsed" id="quick-res"></ul>
      <div class="sheet-foot"><button class="btn primary block" data-action="quick-commit" id="quick-btn" disabled>Thêm vào ${mealName(st.meal).toLowerCase()}</button></div>`;
  } else {
    const m = st.man || (st.man = { name: '', g: '', basis: 'serving', k: '', c: '', p: '', f: '', x: '', save: false });
    inner = `<div class="field"><label for="man-name">Tên món</label><input class="input" id="man-name" data-man="name" value="${esc(m.name)}" placeholder="Ví dụ: Bánh mì chả cá nhà làm" data-autofocus></div>
      <div class="field"><label for="man-g">Khối lượng đã ăn</label><div class="input-unit"><input class="input num" id="man-g" data-man="g" inputmode="decimal" value="${esc(m.g)}" placeholder="100"><em>g</em></div></div>
      <div class="field"><span>Giá trị dinh dưỡng nhập theo</span><div class="seg wide" role="group"><button data-action="man-basis" data-v="serving" aria-pressed="${m.basis === 'serving'}">Cả phần đã ăn</button><button data-action="man-basis" data-v="100" aria-pressed="${m.basis === '100'}">Mỗi 100 g</button></div></div>
      <div class="grid2">${[['k', 'Năng lượng', 'kcal'], ['c', 'Carb', 'g'], ['p', 'Đạm', 'g'], ['f', 'Béo', 'g'], ['x', 'Chất xơ', 'g']].map(([k, n, u]) => `<div class="field"><label for="man-${k}">${n}</label><div class="input-unit"><input class="input num" id="man-${k}" data-man="${k}" inputmode="decimal" value="${esc(m[k])}" placeholder="${k === 'k' ? 'tự tính' : '0'}"><em>${u}</em></div></div>`).join('')}</div>
      <p class="hint">Để trống năng lượng thì app tự tính: 4 kcal/g carb và đạm, 9 kcal/g béo.</p>
      <label class="switch"><span><b>Lưu vào “Món của tôi”</b><br><span class="hint">Lần sau chỉ cần tìm tên món.</span></span><input type="checkbox" id="man-save" ${m.save ? 'checked' : ''}></label>
      <div class="sheet-foot"><button class="btn primary block" data-action="man-commit">Thêm vào ${mealName(st.meal).toLowerCase()}</button></div>`;
  }
  return `${topBar(`Thêm món · ${relDay(UI.date)}`)}${mealSeg(st.meal)}
    <div class="seg wide" role="tablist">${tabs.map(([v, i, n]) => `<button data-action="add-mode" data-v="${v}" aria-pressed="${st.mode === v}">${ic(i, 'sm')}${n}</button>`).join('')}</div>${inner}`;
}
function updateQuick() {
  const st = UI.sheet, res = $('#quick-res'); if (!res) return;
  const rows = parseQuick(st.text || '');
  st.parsed = rows;
  const ok = rows.filter((r) => r.food && r.g > 0);
  res.innerHTML = rows.map((r, i) => r.food
    ? `<li><div class="p-main"><div class="p-name">${esc(r.food.name)}</div><div class="p-src">${esc(r.label)} · bạn gõ “${esc(r.raw)}”</div></div><div class="p-k num">${fk(r.food.k * r.g / 100)}</div></li>`
    : `<li class="miss"><div class="p-main"><div class="p-name">Chưa nhận ra “${esc(r.raw)}”</div><div class="p-src">Sửa lại tên hoặc tìm trong danh sách.</div></div><button class="btn sm" data-action="quick-find" data-i="${i}">Tìm</button></li>`).join('');
  const tot = ok.reduce((s, r) => s + r.food.k * r.g / 100, 0);
  const btn = $('#quick-btn');
  btn.disabled = !ok.length;
  btn.textContent = ok.length ? `Thêm ${ok.length} món (${fk(tot)} kcal) vào ${mealName(st.meal).toLowerCase()}` : `Thêm vào ${mealName(st.meal).toLowerCase()}`;
}

// -- Chi tiết món (thêm mới / sửa)
function sheetFood(st) {
  if (st.edit) {
    const it = getDay(st.date).items.find((x) => x.i === st.edit);
    const f = FOODS.get(it && it.f);
    if (f) return f;
    return makeFood({ id: it.f || 'x', name: it.n, cat: 'my', k: it.v[0], c: it.v[1], p: it.v[2], f: it.v[3], x: it.v[4], portions: [] });
  }
  return FOODS.get(st.fid);
}
function unitsOf(f) { return [...(f.portions || []), { label: 'gam', g: 1 }]; }
function foodSheetHTML(st) {
  const f = sheetFood(st);
  const units = unitsOf(f);
  const u = units[st.u] || units[units.length - 1];
  const qty = st.g / u.g;
  const fav = (S.fav || []).includes(f.id);
  const actions = st.edit
    ? `<div class="row"><button class="btn danger" data-action="del-item">${ic('i-trash')}Xoá</button><button class="btn primary" style="flex:1" data-action="food-commit">Lưu thay đổi</button></div>`
    : `<button class="btn primary block" data-action="food-commit">${ic('i-plus')}Thêm vào ${mealName(st.meal).toLowerCase()}</button>`;
  const star = FOODS.has(f.id) ? `<button class="star" data-action="fav" data-fid="${f.id}" aria-pressed="${fav}" aria-label="Yêu thích">${ic('i-star')}</button>` : '';
  return `${topBar(esc(f.name), st.back ? 'sheet-back' : '', star)}
    <p class="muted small">${catOf(f).name} · ${fk(f.k)} kcal / 100 g · ${per100(f)}</p>
    <div class="field"><label for="qty">Số lượng (${esc(u.label)})</label>
      <div class="stepper"><button class="iconbtn" data-action="qty" data-d="-1" aria-label="Giảm">${ic('i-minus')}</button>
        <input class="input num" id="qty" inputmode="decimal" value="${fq(Math.round(qty * 100) / 100)}" data-autofocus>
        <button class="iconbtn" data-action="qty" data-d="1" aria-label="Tăng">${ic('i-plus')}</button></div></div>
    <div class="chips wrap" role="group" aria-label="Đơn vị">${units.map((x, i) => `<button class="chip" data-action="unit" data-i="${i}" aria-pressed="${units[st.u] === x || (!units[st.u] && i === units.length - 1)}">${esc(x.label)}${x.g !== 1 ? ` · ${fg(x.g)} g` : ''}</button>`).join('')}</div>
    <div class="preview" id="food-pv"></div>
    <div class="field"><span>Bữa · ${relDay(st.date)}</span>${mealSeg(st.meal)}</div>
    ${f.cat === 'my' && FOODS.has(f.id) && !st.edit ? `<button class="linkbtn" data-action="edit-custom" data-fid="${f.id}">Sửa món này</button>` : ''}
    <div class="sheet-foot">${actions}</div>`;
}
function updateFoodPreview() {
  const st = UI.sheet, el = $('#food-pv'); if (!el) return;
  const f = sheetFood(st), r = st.g / 100;
  el.innerHTML = `<div class="preview-top"><b class="num">${fk(f.k * r)} <span style="font-size:15px">kcal</span></b><span class="num">${fg(st.g)} g</span></div>
    <div class="mini-macros">${MC.map(([k, n, cls]) => `<div class="m-${cls}"><b class="num">${fg(f[k] * r)}</b><span>${k === 'x' ? 'Xơ' : n} (g)</span></div>`).join('')}</div>`;
}

// -- Vận động
function actSheetHTML(st) {
  return `${topBar(st.edit ? 'Sửa vận động' : 'Thêm vận động')}
    <div class="chips wrap" role="group" aria-label="Hoạt động">${ACTIVITIES.map(([n, met]) => `<button class="chip" data-action="act-pick" data-n="${esc(n)}" data-met="${met}" aria-pressed="${st.n === n}">${esc(n)}</button>`).join('')}</div>
    <div class="field"><label for="act-min">Thời gian (phút)</label>
      <div class="stepper"><button class="iconbtn" data-action="act-step" data-d="-5" aria-label="Giảm 5 phút">${ic('i-minus')}</button>
      <input class="input num" id="act-min" inputmode="numeric" value="${st.min}"><button class="iconbtn" data-action="act-step" data-d="5" aria-label="Tăng 5 phút">${ic('i-plus')}</button></div></div>
    <div class="preview" id="act-pv"></div>
    <div class="sheet-foot">${st.edit ? `<div class="row"><button class="btn danger" data-action="del-act">${ic('i-trash')}Xoá</button><button class="btn primary" style="flex:1" data-action="act-commit">Lưu</button></div>` : `<button class="btn primary block" data-action="act-commit">${ic('i-flame')}Ghi vận động</button>`}</div>`;
}
function updateActPreview() {
  const st = UI.sheet, el = $('#act-pv'); if (!el) return;
  const kcal = Math.round(st.met * weightKg() * (st.min || 0) / 60);
  st.kcal = kcal;
  el.innerHTML = `<div class="preview-top"><b class="num">−${fk(kcal)} <span style="font-size:15px">kcal</span></b><span>${esc(st.n)} · MET ${NF1.format(st.met)}</span></div><p class="hint">kcal ≈ MET × ${fg(weightKg())} kg × ${st.min || 0} phút ÷ 60</p>`;
}

// -- Món tự tạo
function customSheetHTML(st) {
  const c = st.c;
  return `${topBar(st.id ? 'Sửa món của tôi' : 'Tạo món mới')}
    <div class="field"><label for="cu-name">Tên món</label><input class="input" id="cu-name" data-cu="name" value="${esc(c.name)}" placeholder="Ví dụ: Sữa chua nếp cẩm" data-autofocus></div>
    <p class="hint">Giá trị trên 100 g (xem nhãn dinh dưỡng trên bao bì).</p>
    <div class="grid2">${[['k', 'Năng lượng', 'kcal'], ['c', 'Carb', 'g'], ['p', 'Đạm', 'g'], ['f', 'Béo', 'g'], ['x', 'Chất xơ', 'g']].map(([k, n, u]) => `<div class="field"><label for="cu-${k}">${n}</label><div class="input-unit"><input class="input num" id="cu-${k}" data-cu="${k}" inputmode="decimal" value="${c[k] === '' ? '' : fq(c[k])}" placeholder="${k === 'k' ? 'tự tính' : '0'}"><em>${u}</em></div></div>`).join('')}</div>
    <div class="grid2"><div class="field"><label for="cu-pl">Khẩu phần (không bắt buộc)</label><input class="input" id="cu-pl" data-cu="pl" value="${esc(c.pl)}" placeholder="hũ, gói, cái…"></div>
      <div class="field"><label for="cu-pg">Khối lượng 1 khẩu phần</label><div class="input-unit"><input class="input num" id="cu-pg" data-cu="pg" inputmode="decimal" value="${c.pg === '' ? '' : fq(c.pg)}" placeholder="100"><em>g</em></div></div></div>
    <div class="sheet-foot">${st.id ? `<div class="row"><button class="btn danger" data-action="custom-del">${ic('i-trash')}Xoá món</button><button class="btn primary" style="flex:1" data-action="custom-commit">Lưu món</button></div>` : `<button class="btn primary block" data-action="custom-commit">Lưu món</button>`}</div>`;
}

// -- Sao lưu
function backupSheetHTML(st) {
  return `${topBar('Sao lưu & khôi phục')}
    <p class="small muted">Tệp sao lưu chứa hồ sơ, nhật ký ăn uống, vận động, cân nặng và món tự tạo. Dùng để chuyển dữ liệu giữa điện thoại và máy tính.</p>
    <div class="row"><button class="btn primary" data-action="export">${ic('i-download')}Lưu tệp sao lưu</button><button class="btn" data-action="copy-backup">${ic('i-copy')}Sao chép mã</button></div>
    ${st.showText ? `<textarea class="input" id="bk-out" readonly style="min-height:120px;font-size:12px">${esc(exportJSON())}</textarea>` : ''}
    <h3 style="font-size:18px;margin-top:6px">Khôi phục</h3>
    <div class="row"><button class="btn" data-action="import-file">${ic('i-upload')}Chọn tệp .json</button></div>
    <div class="field"><label for="bk-in">Hoặc dán mã sao lưu</label><textarea class="input" id="bk-in" placeholder='{"app":"an-du", …}' style="min-height:90px;font-size:12px">${esc(st.pasted || '')}</textarea></div>
    ${st.pending ? `<div class="confirm"><b>Thay toàn bộ dữ liệu hiện tại bằng bản sao lưu?</b><span class="small">${st.pending.summary}</span><div class="row"><button class="btn danger" data-action="import-yes">Khôi phục</button><button class="btn" data-action="import-no">Huỷ</button></div></div>` : `<button class="btn block" data-action="import-paste">Khôi phục từ mã đã dán</button>`}
    ${st.err ? `<p class="warn">${esc(st.err)}</p>` : ''}`;
}
function exportJSON() {
  const o = JSON.parse(JSON.stringify(S));
  delete o.meta;
  return JSON.stringify({ app: 'an-du', exportedAt: new Date().toISOString(), data: o });
}
function checkImport(text) {
  let o;
  try { o = JSON.parse(text); } catch (e) { return { err: 'Mã sao lưu không hợp lệ. Hãy dán đầy đủ nội dung tệp .json.' }; }
  const data = o && o.app === 'an-du' ? o.data : o;
  if (!data || !data.profile || !data.days) return { err: 'Đây không phải tệp sao lưu của Ăn Đủ.' };
  const nd = Object.keys(data.days).filter((k) => (data.days[k].items || []).length).length;
  return { data, summary: `Bản sao lưu có ${nd} ngày nhật ký, ${(data.custom || []).length} món tự tạo, ${(data.weights || []).length} lần cân.` };
}
