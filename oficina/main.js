const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const dataFile = () => path.join(app.getPath('userData'), 'oficina.json');
const backupDir = () => path.join(app.getPath('userData'), 'backups');
function atomicWrite(f, t) { fs.writeFileSync(f + '.tmp', t, 'utf8'); fs.renameSync(f + '.tmp', f); }
function dailyBackup() {
  try {
    if (!fs.existsSync(dataFile())) return;
    fs.mkdirSync(backupDir(), { recursive: true });
    const dest = path.join(backupDir(), `oficina-${new Date().toISOString().slice(0, 10)}.json`);
    if (!fs.existsSync(dest)) fs.copyFileSync(dataFile(), dest);
    const fl = fs.readdirSync(backupDir()).filter(f => f.startsWith('oficina-')).sort();
    while (fl.length > 15) fs.unlinkSync(path.join(backupDir(), fl.shift()));
  } catch (e) { console.error(e); }
}
let win;
function createWindow() {
  win = new BrowserWindow({ width: 1360, height: 860, minWidth: 1100, minHeight: 680, title: 'Agenda Oficina', backgroundColor: '#f6f5fb',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false } });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}
app.whenReady().then(() => { dailyBackup(); createWindow(); });
app.on('window-all-closed', () => app.quit());
ipcMain.handle('db:load', () => { try { return JSON.parse(fs.readFileSync(dataFile(), 'utf8')); } catch { return null; } });
ipcMain.handle('db:save', (_e, d) => { atomicWrite(dataFile(), JSON.stringify(d)); return true; });
ipcMain.handle('file:saveText', async (_e, { text, name }) => {
  const r = await dialog.showSaveDialog(win, { defaultPath: name }); if (r.canceled) return false;
  fs.writeFileSync(r.filePath, text, 'utf8'); return r.filePath;
});
ipcMain.handle('file:openText', async () => {
  const r = await dialog.showOpenDialog(win, { filters: [{ name: 'Backup JSON', extensions: ['json'] }], properties: ['openFile'] });
  return r.canceled ? null : fs.readFileSync(r.filePaths[0], 'utf8');
});
// abre apenas WhatsApp (wa.me) e e-mail (mailto) no programa padrão do usuário
ipcMain.handle('open:external', (_e, url) => {
  if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(url) || /^mailto:/.test(url)) { shell.openExternal(url); return true; }
  return false;
});
