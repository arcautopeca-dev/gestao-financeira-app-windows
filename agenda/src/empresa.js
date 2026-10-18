// Empresa (nome, logo, telefone, endereço) e Mensagens/Configurações
App.views.company = root => {
  const c = App.db.company;
  root.innerHTML = `<div class="head"><div><h1 class="t">Dados da empresa</h1><p class="sub">Aparecem na abertura, no topo do programa e nas mensagens enviadas.</p></div></div>
  <div class="card" style="max-width:720px"><form id="cf" class="f">
    <div class="logo-edit"><div id="lp">${App.logoHtml()}</div><div><button type="button" class="btn" id="pick">Escolher logotipo…</button> <button type="button" class="btn bad" id="rm">Remover</button><p class="hint">PNG ou JPG. Será ajustado automaticamente.</p><input type="file" id="file" accept="image/*" hidden></div></div>
    <label>Nome da empresa<input name="nome" value="${esc(c.nome)}" placeholder="Ex.: Studio Bela Forma"></label>
    <div class="r"><label>Telefone / WhatsApp<input name="telefone" value="${esc(c.telefone)}" placeholder="(11) 99999-9999"></label><label>E-mail<input type="email" name="email" value="${esc(c.email)}"></label></div>
    <label>Endereço<input name="endereco" value="${esc(c.endereco)}" placeholder="Rua, número, bairro, cidade"></label>
    <div class="mf"><button class="btn pri">Salvar dados</button></div></form></div>`;
  $('#pick').onclick = () => $('#file').click();
  $('#rm').onclick = async () => { Object.assign(c, Object.fromEntries(new FormData($('#cf')))); c.logo = ''; await App.save(); App.brand(); App.render(); };
  $('#file').onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader();
    r.onload = () => { const im = new Image(); im.onload = async () => { const k = Math.min(1, 256 / Math.max(im.width, im.height)), cv = document.createElement('canvas');
      cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
      Object.assign(c, Object.fromEntries(new FormData($('#cf')))); c.logo = cv.toDataURL('image/png'); await App.save(); App.brand(); App.render(); toast('Logotipo atualizado'); }; im.src = r.result; }; r.readAsDataURL(f); };
  $('#cf').onsubmit = async e => { e.preventDefault(); Object.assign(c, Object.fromEntries(new FormData(e.target))); await App.save(); App.brand(); toast('Dados salvos'); };
};

App.views.mensagens = root => {
  const S = App.db.settings;
  root.innerHTML = `<div class="head"><div><h1 class="t">Mensagens e ajustes</h1><p class="sub">Modelos de WhatsApp e e-mail, horário da agenda e backup.</p></div></div>
  <div class="cols"><div class="card"><form id="mf" class="f"><b>Modelos de mensagem</b>
    <div class="tags">${['cliente', 'empresa', 'servico', 'data', 'hora', 'dia', 'endereco', 'telefone'].map(t => `<code>{${t}}</code>`).join('')}</div>
    <label>WhatsApp<textarea name="msgWhats" rows="6">${esc(S.msgWhats)}</textarea></label>
    <label>Assunto do e-mail<input name="assuntoEmail" value="${esc(S.assuntoEmail)}"></label>
    <label>Texto do e-mail<textarea name="msgEmail" rows="7">${esc(S.msgEmail)}</textarea></label>
    <p class="hint">As variáveis entre chaves são trocadas pelos dados do agendamento. O envio abre o WhatsApp e o seu programa de e-mail com a mensagem pronta.</p>
    <div class="mf"><button class="btn pri">Salvar modelos</button></div></form></div>
  <div style="display:grid;gap:18px;align-content:start"><div class="card"><form id="hf" class="f"><b>Agenda</b><div class="r"><label>Início do dia (h)<input type="number" name="startHour" min="0" max="22" value="${S.startHour}"></label><label>Fim do dia (h)<input type="number" name="endHour" min="1" max="24" value="${S.endHour}"></label></div>
    <label>Código do país (DDI) para WhatsApp<input name="ddi" value="${esc(S.ddi)}"></label><div class="mf"><button class="btn pri">Salvar</button></div></form></div>
  <div class="card"><b>Backup</b><p class="hint">Uma cópia automática é feita por dia (últimos 15). Seus dados ficam só no seu computador.</p><div class="mf" style="justify-content:flex-start"><button class="btn" id="bk">Exportar backup</button><button class="btn" id="rs">Restaurar backup</button></div></div></div></div>`;
  root.querySelectorAll('.tags code').forEach(c => c.onclick = () => { const ta = document.activeElement.tagName === 'TEXTAREA' ? document.activeElement : $('[name=msgWhats]'); ta.setRangeText(c.textContent, ta.selectionStart, ta.selectionEnd, 'end'); ta.focus(); });
  $('#mf').onsubmit = async e => { e.preventDefault(); Object.assign(S, Object.fromEntries(new FormData(e.target))); await App.save(); toast('Modelos salvos'); };
  $('#hf').onsubmit = async e => { e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)); S.startHour = Math.min(+v.startHour || 7, 22); S.endHour = Math.max(+v.endHour || 20, S.startHour + 1); S.ddi = v.ddi.replace(/\D/g, '') || '55'; await App.save(); toast('Salvo'); };
  $('#bk').onclick = async () => { const r = await api.saveText({ text: JSON.stringify(App.db), name: `backup-agenda-${D.today()}.json` }); if (r) toast('Backup exportado'); };
  $('#rs').onclick = async () => { const t = await api.openText(); if (!t) return; try { const d = JSON.parse(t); if (!d.appts || !d.clients) throw 0;
    confirmBox('Substituir todos os dados atuais pelo backup?', async () => { App.db = { ...App.defaults(), ...d }; await App.save(); App.brand(); App.render(); toast('Backup restaurado'); }); } catch { toast('Arquivo inválido'); } };
};
