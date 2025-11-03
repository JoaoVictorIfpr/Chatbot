(() => {
  const textarea = document.getElementById('customInstruction');
  const saveBtn = document.getElementById('saveBtn');
  const statusEl = document.getElementById('status');

  // Resolve backend URL similar to admin
  const isLiveOrFile = location.protocol === 'file:' || ['5500','5173','8080'].includes(location.port || '');
  const resolvedBackend = (location.port === '3000' && location.hostname)
    ? window.location.origin
    : `${location.protocol === 'https:' ? 'https:' : 'http:'}//${location.hostname || 'localhost'}:3000`;
  const backendUrl = isLiveOrFile ? resolvedBackend : window.location.origin;

  function getOrCreateUserId() {
    let id = localStorage.getItem('userId');
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(16).slice(2);
      localStorage.setItem('userId', id);
    }
    return id;
  }

  const userId = getOrCreateUserId();

  function setStatus(msg, ok = true) {
    statusEl.textContent = msg || '';
    statusEl.classList.remove('ok', 'error');
    statusEl.classList.add(ok ? 'ok' : 'error');
  }

  async function loadPreferences() {
    try {
      const resp = await fetch(`${backendUrl}/api/user/preferences`, {
        headers: { 'x-user-id': userId },
        cache: 'no-store'
      });
      if (!resp.ok) throw new Error('Falha ao buscar preferências.');
      const data = await resp.json();
      textarea.value = data.customSystemInstruction || '';
      setStatus('Preferências carregadas.', true);
      setTimeout(() => setStatus(''), 1200);
    } catch (e) {
      setStatus(e.message || 'Erro ao carregar preferências.', false);
    }
  }

  async function savePreferences() {
    try {
      saveBtn.disabled = true;
      const resp = await fetch(`${backendUrl}/api/user/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ customSystemInstruction: textarea.value || '' })
      });
      if (!resp.ok) throw new Error('Falha ao salvar preferências.');
      setStatus('Personalidade salva com sucesso!', true);
      setTimeout(() => setStatus(''), 1500);
    } catch (e) {
      setStatus(e.message || 'Erro ao salvar preferências.', false);
    } finally {
      saveBtn.disabled = false;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadPreferences();
    saveBtn.addEventListener('click', savePreferences);
  });
})();


