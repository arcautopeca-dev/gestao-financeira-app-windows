// Empresa (nome, logo, telefone, endereço) e Mensagens/Configurações
App.views.company = root => {
  const c = App.db.company;
  root.innerHTML = `<div class="head"><div><h1 class="t">Dados da oficina</h1><p class="sub">Aparecem na abertura, no topo do programa e nas mensagens enviadas.</p></div></div>
  <div class="card" style="max-width:720px"><form id="cf" class="f">
    <div class="logo-edit"><div id="lp">${App.logoHtml()}</div><div><button type="button" class="btn" id="pick">Escolher logotipo…</button> <button type="button" class="btn bad" id="rm">Remover</button><p class="hint">PNG ou JPG. Será ajustado automaticamente.</p><input type="file" id="file" accept="image/*" hidden></div></div>
    <label>Nome da oficina<input name="nome" value="${esc(c.nome)}" placeholder="Ex.: Auto Center Silva"></label>
    <div class="r"><label>Telefone / WhatsApp<input name="telefone" value="${esc(c.telefone)}"></label><label>E-mail<input type="email" name="email" value="${esc(c.email)}"></label></div>
    <label>Endereço<input name="endereco" value="${esc(c.endereco)}" placeholder="Rua, número, bairro, cidade"></label>
    <div class="mf"><button class="btn pri">Salvar dados</button></div></form></div>`;
  const grab = () => Object.assign(c, Object.fromEntries(new FormData($('#cf'))));
  $('#pick').onclick = () => $('#file').click();
  $('#rm').onclick = async () => { grab(); c.logo = ''; await App.save(); App.brand(); App.render(); };
  $('#file').onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader();
    r.onload = () => { const im = new Image(); im.onload = async () => { const k = Math.min(1, 256 / Math.max(im.width, im.height)), cv = document.createElement('canvas');
      cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
      grab(); c.logo = cv.toDataURL('image/png'); await App.save(); App.brand(); App.render(); toast('Logotipo atualizado'); }; im.src = r.result; }; r.readAsDataURL(f); };
  $('#cf').onsubmit = async e => { e.preventDefault(); grab(); await App.save(); App.brand(); toast('Dados salvos'); };
};

App.views.mensagens = root => {
  const S = App.db.settings;
  root.innerHTML = `<div class="head"><div><h1 class="t">Mensagens e ajustes</h1><p class="sub">Modelos de WhatsApp, prazos padrão, horário da agenda e backup.</p></div></div>
  <div class="cols"><div class="card"><form id="mf" class="f"><b>Modelos de mensagem (WhatsApp)</b>
    <div class="tags">${['cliente', 'empresa', 'os', 'placa', 'modelo', 'veiculo', 'mecanico', 'previsao', 'prazo', 'entrada', 'defeito', 'motivo', 'endereco', 'telefone'].map(t => `<code>{${t}}</code>`).join('')}</div>
    <label>Confirmação de entrada do veículo<textarea name="msgAgendado" rows="5">${esc(S.msgAgendado)}</textarea></label>
    <label>Veículo pronto para retirada<textarea name="msgPronto" rows="5">${esc(S.msgPronto)}</textarea></label>
    <label>Aviso de atraso<textarea name="msgAtraso" rows="5">${esc(S.msgAtraso)}</textarea></label>
    <p class="hint">Clique numa variável para inseri-la. Ao enviar, abrimos o WhatsApp no telefone do cliente com o texto pronto e guardamos a mensagem na OS.</p>
    <div class="mf"><button class="btn pri">Salvar modelos</button></div></form></div>
  <div style="display:grid;gap:18px;align-content:start"><div class="card"><form id="hf" class="f"><b>Prazos padrão e agenda</b><div class="r"><label>Prazo serviço pequeno (dias)<input type="number" name="prazoPequeno" min="1" value="${S.prazoPequeno}"></label><label>Prazo serviço grande (dias)<input type="number" name="prazoGrande" min="1" value="${S.prazoGrande}"></label></div>
    <div class="r"><label>Início do dia (h)<input type="number" name="startHour" min="0" max="22" value="${S.startHour}"></label><label>Fim do dia (h)<input type="number" name="endHour" min="1" max="24" value="${S.endHour}"></label></div>
    <label>Código do país (DDI) para WhatsApp<input name="ddi" value="${esc(S.ddi)}"></label><div class="mf"><button class="btn pri">Salvar</button></div></form></div>
  <div class="card"><b>Backup</b><p class="hint">Uma cópia automática é feita por dia (últimos 15). Seus dados ficam só no seu computador.</p><div class="mf" style="justify-content:flex-start"><button class="btn" id="bk">Exportar backup</button><button class="btn" id="rs">Restaurar backup</button></div></div></div></div>`;
  root.querySelectorAll('.tags code').forEach(c => c.onclick = () => { const ta = document.activeElement.tagName === 'TEXTAREA' ? document.activeElement : $('[name=msgAgendado]'); ta.setRangeText(c.textContent, ta.selectionStart, ta.selectionEnd, 'end'); ta.focus(); });
  $('#mf').onsubmit = async e => { e.preventDefault(); Object.assign(S, Object.fromEntries(new FormData(e.target))); await App.save(); toast('Modelos salvos'); };
  $('#hf').onsubmit = async e => { e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)); S.prazoPequeno = Math.max(1, +v.prazoPequeno || 2); S.prazoGrande = Math.max(1, +v.prazoGrande || 7);
    S.startHour = Math.min(+v.startHour || 7, 22); S.endHour = Math.max(+v.endHour || 18, S.startHour + 1); S.ddi = v.ddi.replace(/\D/g, '') || '55'; await App.save(); toast('Salvo'); };
  $('#bk').onclick = async () => { if (await api.saveText({ text: JSON.stringify(App.db), name: `backup-oficina-${D.today()}.json` })) toast('Backup exportado'); };
  $('#rs').onclick = async () => { const t = await api.openText(); if (!t) return; try { const d = JSON.parse(t); if (!d.orders || !d.clients) throw 0;
    confirmBox('Substituir todos os dados atuais pelo backup?', async () => { App.db = { ...App.defaults(), ...d }; await App.save(); App.brand(); App.render(); toast('Backup restaurado'); }); } catch { toast('Arquivo inválido'); } };
};
