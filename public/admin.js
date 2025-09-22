(() => {
  // Resolve backend base URL: when opened via Live Server (e.g., :5500) or file://, use :3000
  const isLiveOrFile = location.protocol === 'file:' || ['5500','5173','8080'].includes(location.port || '');
  const resolvedBackend = (location.port === '3000' && location.hostname)
    ? window.location.origin
    : `${location.protocol === 'https:' ? 'https:' : 'http:'}//${location.hostname || 'localhost'}:3000`;
  const storedBackend = sessionStorage.getItem('backendUrl');
  const backendUrl = storedBackend || (isLiveOrFile ? resolvedBackend : window.location.origin);
  const adminPassInput = document.getElementById('adminPass');
  const enterBtn = document.getElementById('enterBtn');
  const panel = document.getElementById('panel');
  const loginBox = document.getElementById('loginBox');
  const loginStatus = document.getElementById('loginStatus');
  const cardTotalConversas = document.getElementById('cardTotalConversas');
  const cardTotalMensagens = document.getElementById('cardTotalMensagens');
  const listaUltimas = document.getElementById('listaUltimas');
  const textarea = document.getElementById('systemInstruction');
  const salvarBtn = document.getElementById('salvarBtn');
  const statusMsg = document.getElementById('statusMsg');
  const refreshBtn = document.getElementById('refreshBtn');
  const lastUpdated = document.getElementById('lastUpdated');

  let secret = '';

  function setStatus(msg, ok = true) {
    statusMsg.textContent = msg;
    statusMsg.classList.remove('error', 'ok');
    statusMsg.classList.add(ok ? 'ok' : 'error');
  }

  function setLoginStatus(msg, ok) {
    if (!loginStatus) return;
    loginStatus.textContent = msg || '';
    loginStatus.classList.remove('error', 'ok');
    if (ok === true) loginStatus.classList.add('ok');
    if (ok === false) loginStatus.classList.add('error');
  }

  async function fetchStats() {
    // skeleton state
    cardTotalConversas.classList.add('skeleton');
    cardTotalMensagens.classList.add('skeleton');
    listaUltimas.classList.add('skeleton');
    const resp = await fetch(`${backendUrl}/api/admin/stats`, {
      headers: { 'x-admin-secret': secret, 'Authorization': `Bearer ${secret}` },
      cache: 'no-store'
    });
    if (!resp.ok) throw new Error('Falha ao obter stats');
    const data = await resp.json();
    cardTotalConversas.textContent = data.totalConversas ?? '-';
    cardTotalMensagens.textContent = data.totalMensagens ?? '-';
    listaUltimas.innerHTML = '';
    (data.ultimas5 || []).forEach((c) => {
      const li = document.createElement('li');
      const d = c.createdAt ? new Date(c.createdAt) : null;
      li.textContent = `${c.titulo || 'Sem título'}${d ? ' — ' + d.toLocaleString('pt-BR') : ''}`;
      listaUltimas.appendChild(li);
    });
    const now = new Date();
    if (lastUpdated) lastUpdated.textContent = `Atualizado às ${now.toLocaleTimeString('pt-BR')}`;
    cardTotalConversas.classList.remove('skeleton');
    cardTotalMensagens.classList.remove('skeleton');
    listaUltimas.classList.remove('skeleton');
  }

  async function fetchInstruction() {
    const resp = await fetch(`${backendUrl}/api/admin/system-instruction`, {
      headers: { 'x-admin-secret': secret, 'Authorization': `Bearer ${secret}` },
      cache: 'no-store'
    });
    if (!resp.ok) throw new Error('Falha ao obter system instruction');
    const data = await resp.json();
    textarea.value = data.systemInstruction || '';
  }

  async function saveInstruction() {
    const body = { systemInstruction: textarea.value };
    const resp = await fetch(`${backendUrl}/api/admin/system-instruction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret, 'Authorization': `Bearer ${secret}` },
      body: JSON.stringify(body)
    });
    if (!resp.ok) throw new Error('Falha ao salvar system instruction');
    setStatus('Instrução salva com sucesso.');
  }

  async function tryLogin(pass) {
    secret = (pass || '').trim();
    if (!secret) {
      setLoginStatus('Informe a senha.', false);
      return false;
    }
    enterBtn.disabled = true;
    const prevText = enterBtn.textContent;
    enterBtn.textContent = 'Entrando...';
    setLoginStatus('Verificando...', true);
    try {
      await fetchStats();
      await fetchInstruction();
      sessionStorage.setItem('adminSecret', secret);
      // animate out login, animate in panel
      loginBox.classList.add('fade-out');
      setTimeout(() => { loginBox.classList.add('hidden'); }, 250);
      panel.classList.remove('hidden');
      requestAnimationFrame(() => panel.classList.add('show'));
      setLoginStatus('');
      setStatus('');
      return true;
    } catch (e) {
      setLoginStatus('Senha inválida ou erro ao acessar.', false);
      return false;
    } finally {
      enterBtn.disabled = false;
      enterBtn.textContent = prevText;
    }
  }

  enterBtn.addEventListener('click', async () => {
    await tryLogin(adminPassInput.value);
  });

  adminPassInput.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      enterBtn.click();
    }
  });

  salvarBtn.addEventListener('click', async () => {
    try {
      await saveInstruction();
      await fetchStats();
    } catch (e) {
      setStatus('Erro ao salvar.', false);
    }
  });

  // Auto login se a senha estiver em sessionStorage
  const stored = sessionStorage.getItem('adminSecret');
  if (stored) {
    adminPassInput.value = stored;
    tryLogin(stored);
  }

  // Manual refresh
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      try {
        await fetchStats();
      } catch (e) {
        setStatus('Falha ao atualizar métricas.', false);
      }
    });
  }

  // Auto refresh a cada 30s quando painel visível
  setInterval(() => {
    if (!panel.classList.contains('hidden') && secret) {
      fetchStats().catch(() => {});
    }
  }, 30000);
})();


