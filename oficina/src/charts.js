// Gráficos simples (SVG/CSS) sem bibliotecas
const Ch = {
  hbars(items, colors) { // items: [{label, parts:[v1,v2], total}]
    const max = Math.max(1, ...items.map(i => i.parts.reduce((a, b) => a + b, 0)));
    return items.map(i => { const t = i.parts.reduce((a, b) => a + b, 0);
      return `<div class="hb"><span title="${esc(i.label)}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(i.label)}</span><div class="tr" style="width:${Math.max(4, t / max * 100)}%">${i.parts.map((p, k) => p ? `<i style="width:${p / t * 100}%;background:${colors[k]}" title="${p}"></i>` : '').join('')}</div><b>${t}</b></div>`; }).join('') || '<p class="sub">Sem dados no período.</p>';
  },
  donut(parts, size = 130) { // parts: [{v,color,label}]
    const tot = parts.reduce((a, p) => a + p.v, 0), r = 46, c = 2 * Math.PI * r; let off = 0;
    const segs = tot ? parts.map(p => { const l = p.v / tot * c, s = `<circle r="${r}" cx="60" cy="60" fill="none" stroke="${p.color}" stroke-width="18" stroke-dasharray="${l} ${c - l}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"><title>${p.label}: ${p.v}</title></circle>`; off += l; return s; }).join('') : `<circle r="${r}" cx="60" cy="60" fill="none" stroke="var(--soft)" stroke-width="18"/>`;
    return `<svg viewBox="0 0 120 120" width="${size}" height="${size}">${segs}<text x="60" y="66" text-anchor="middle" style="font-size:22px;font-weight:700;fill:var(--ink)">${tot}</text></svg>`;
  },
  line(labels, series, w = 520, h = 210) { // series: [{name,color,values:[n|null],dash}]
    const pad = { l: 36, r: 12, t: 12, b: 26 }, iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    const all = series.flatMap(s => s.values).filter(v => v != null), max = Math.max(1, ...all) * 1.15;
    const x = i => pad.l + (labels.length < 2 ? iw / 2 : i / (labels.length - 1) * iw), y = v => pad.t + ih - v / max * ih;
    let s = `<svg viewBox="0 0 ${w} ${h}" width="100%">`;
    for (let i = 0; i <= 4; i++) { const v = max * i / 4; s += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end">${v.toFixed(v < 10 ? 1 : 0)}</text>`; }
    labels.forEach((l, i) => s += `<text x="${x(i)}" y="${h - 8}" text-anchor="middle">${l}</text>`);
    series.forEach(se => { const pts = se.values.map((v, i) => v == null ? null : [x(i), y(v), v]).filter(Boolean);
      if (pts.length > 1) s += `<polyline fill="none" stroke="${se.color}" stroke-width="2.4" ${se.dash ? 'stroke-dasharray="6 5"' : ''} points="${pts.map(p => p[0] + ',' + p[1]).join(' ')}"/>`;
      if (!se.dash) s += pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="${se.color}"><title>${se.name}: ${p[2]}</title></circle>`).join(''); });
    return s + '</svg>' + `<div class="leg">${series.map(se => `<span style="--c:${se.color}">${se.name}</span>`).join('')}</div>`;
  }
};
