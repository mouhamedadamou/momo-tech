(function () {
  'use strict';

  const fmt = (n) => Number(n).toLocaleString('fr-FR') + ' FCFA';
  const slug = (s) => s.replace(/\s+/g, '_');
  const STATUSES = ['En attente', 'Payée', 'Traitée', 'Annulée'];

  // Best-effort local (Bénin) -> international number for wa.me links.
  // Numbers are stored as customers typed them, so this is a heuristic —
  // always double-check the chat opened is the right one.
  function toWaNumber(raw) {
    const digits = String(raw || '').replace(/\D/g, '');
    if (digits.startsWith('229')) return digits;
    if (digits.startsWith('0')) return '229' + digits.slice(1);
    return '229' + digits;
  }

  const loginScreen = document.getElementById('loginScreen');
  const dashboard = document.getElementById('dashboard');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const ordersBody = document.getElementById('ordersBody');
  const searchInput = document.getElementById('searchInput');
  const statusFilters = document.getElementById('statusFilters');
  const detailOverlay = document.getElementById('detailOverlay');
  const detailBody = document.getElementById('detailBody');
  const detailId = document.getElementById('detailId');

  let currentStatus = 'all';
  let currentQuery = '';
  let searchDebounce = null;
  let ordersCache = [];

  // ---------- Auth ----------
  function showDashboard(username) {
    loginScreen.style.display = 'none';
    dashboard.style.display = 'block';
    document.getElementById('whoami').textContent = username ? `Connecté : ${username}` : '';
    loadOrders();
  }

  function showLogin() {
    dashboard.style.display = 'none';
    loginScreen.style.display = 'flex';
  }

  fetch('/api/admin/session', { credentials: 'include' })
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((data) => showDashboard(data.username))
    .catch(() => showLogin());

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    loginError.style.display = 'none';
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Connexion impossible.');
        showDashboard(username);
      })
      .catch((err) => {
        loginError.textContent = err.message;
        loginError.style.display = 'block';
      });
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    fetch('/api/admin/logout', { method: 'POST', credentials: 'include' }).then(showLogin);
  });

  // ---------- Orders list ----------
  function loadOrders() {
    const params = new URLSearchParams();
    if (currentStatus !== 'all') params.set('status', currentStatus);
    if (currentQuery) params.set('q', currentQuery);

    fetch(`/api/admin/orders?${params.toString()}`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 401) { showLogin(); throw new Error('unauth'); }
        return r.json();
      })
      .then((rows) => {
        ordersCache = rows;
        renderOrders(rows);
      })
      .catch(() => {});
  }

  function renderOrders(rows) {
    if (!rows.length) {
      ordersBody.innerHTML = '<tr><td colspan="7" class="admin-empty">Aucune commande trouvée.</td></tr>';
      return;
    }
    ordersBody.innerHTML = rows
      .map(
        (o) => `
      <tr data-id="${o.id}">
        <td>${new Date(o.created_at).toLocaleString('fr-FR')}</td>
        <td>${o.offer_label}</td>
        <td>${fmt(o.price)}</td>
        <td>${o.uid}</td>
        <td>${o.whatsapp}</td>
        <td><span class="status-badge status-${slug(o.status)}">${o.status}</span></td>
        <td>›</td>
      </tr>`
      )
      .join('');
  }

  ordersBody.addEventListener('click', (e) => {
    const row = e.target.closest('tr[data-id]');
    if (row) openDetail(Number(row.dataset.id));
  });

  statusFilters.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    statusFilters.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    currentStatus = chip.dataset.status;
    loadOrders();
  });

  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      currentQuery = searchInput.value.trim();
      loadOrders();
    }, 300);
  });

  // ---------- Detail drawer ----------
  function openDetail(id) {
    const o = ordersCache.find((x) => x.id === id);
    if (!o) return;
    detailId.textContent = `#${o.id}`;

    detailBody.innerHTML = `
      <dl>
        <dt>Offre</dt><dd>${o.offer_label}</dd>
        <dt>Montant</dt><dd>${fmt(o.price)}</dd>
        <dt>UID Free Fire</dt><dd>${o.uid}</dd>
        <dt>Nom du joueur</dt><dd>${o.player_name || '—'}</dd>
        <dt>WhatsApp</dt><dd>${o.whatsapp}</dd>
        <dt>E-mail</dt><dd>${o.email || '—'}</dd>
        <dt>Paiement</dt><dd>${o.payment_method}</dd>
        <dt>Référence</dt><dd>${o.transaction_ref}</dd>
        <dt>Date</dt><dd>${new Date(o.created_at).toLocaleString('fr-FR')}</dd>
      </dl>

      <div class="field">
        <label>Preuve de paiement</label>
        <a class="btn btn-secondary btn-sm" href="/api/admin/orders/${o.id}/proof" target="_blank" rel="noopener">Voir / télécharger la preuve</a>
      </div>

      <div class="field">
        <label for="statusSelect">Statut</label>
        <select id="statusSelect">
          ${STATUSES.map((s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>

      <div class="field">
        <label for="noteInput">Note interne</label>
        <textarea id="noteInput" rows="3">${o.internal_note || ''}</textarea>
      </div>

      <div class="detail-actions">
        <button class="btn btn-primary" id="saveDetail">Enregistrer</button>
        <button class="btn btn-danger" id="deleteDetail" style="display:none">🗑️ Supprimer la commande</button>
        <a class="btn btn-secondary" href="https://wa.me/${toWaNumber(o.whatsapp)}?text=${encodeURIComponent('Bonjour ' + (o.player_name || '') + ', au sujet de votre commande ' + o.offer_label)}" target="_blank" rel="noopener">Contacter sur WhatsApp</a>
      </div>
    `;

    document.getElementById('saveDetail').addEventListener('click', () => saveDetail(o.id));
    const deleteBtn = document.getElementById('deleteDetail');
    
    deleteBtn.addEventListener('click', async () => {
  if (!confirm('Supprimer définitivement cette commande ?')) return;

  const res = await fetch(`/api/admin/orders/${o.id}`, {
    method: 'DELETE'
  });

  if (res.ok) {
    alert('Commande supprimée.');
    location.reload();
  } else {
    alert('Impossible de supprimer la commande.');
  }
});
    detailOverlay.classList.add('is-open');
  }

  function saveDetail(id) {
    const status = document.getElementById('statusSelect').value;
    const internal_note = document.getElementById('noteInput').value;

    fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status, internal_note }),
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        detailOverlay.classList.remove('is-open');
        loadOrders();
      })
      .catch(() => alert("Impossible d'enregistrer les modifications."));
  }

  document.getElementById('closeDetail').addEventListener('click', () => detailOverlay.classList.remove('is-open'));
  detailOverlay.addEventListener('click', (e) => { if (e.target === detailOverlay) detailOverlay.classList.remove('is-open'); });
})();
