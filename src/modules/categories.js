App.register('categories', {
  render(root) {
    const groups = [['pagar', 'Categorias de contas a pagar'], ['receber', 'Categorias de contas a receber'], ['formas', 'Formas de pagamento / recebimento']];
    root.innerHTML = `<div class="head"><div><h1>Categorias</h1><p class="sub">Organize seus lançamentos. As listas aparecem nos formulários.</p></div></div>
    <div class="cols3">${groups.map(([k, t]) => `<div class="card"><h3>${t}</h3><div>${App.db.categories[k].map((n, i) => `<div class="tag"><span>${esc(n)}</span><button class="btn sm danger" data-k="${k}" data-i="${i}">✕</button></div>`).join('') || '<p class="sub">Nenhuma ainda.</p>'}</div>
      <form class="addrow" data-k="${k}"><input placeholder="Nova…" required><button class="btn pri">Adicionar</button></form></div>`).join('')}</div>`;
    root.onclick = async e => { const b = e.target.closest('button[data-i]'); if (!b) return; App.db.categories[b.dataset.k].splice(+b.dataset.i, 1); await App.save(); App.render(); };
    root.onsubmit = async e => { e.preventDefault(); const f = e.target, v = f.querySelector('input').value.trim(), l = App.db.categories[f.dataset.k]; if (v && !l.includes(v)) l.push(v); await App.save(); App.render(); };
  }
});
