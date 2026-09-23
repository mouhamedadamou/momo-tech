(function () {
  'use strict';

  const fmt = (n) => n.toLocaleString('fr-FR') + ' FCFA';

  const diamondIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 12L2 9Z"/><path d="M2 9h20M8 3l4 6 4-6M12 9l-2 12M12 9l2 12"/></svg>`;

  let contactData = null;

  // ---------- Load data ----------
  function loadOffers() {
    fetch('/api/offers')
      .then((r) => r.json())
      .then((data) => {
        renderDiamonds(data.diamonds || []);
        renderSubs(data.subscriptions || []);
      })
      .catch(() => {
        document.getElementById('diamondGrid').innerHTML = '<p style="color:#b3aad1">Impossible de charger les offres pour le moment.</p>';
      });
  }

  function loadContact() {
    fetch('/api/contact')
      .then((r) => r.json())
      .then((data) => {
        contactData = data;
        document.getElementById('mtnNumber').textContent = data.mtnNumberDisplay;
        document.getElementById('contactWhatsappText').textContent = data.whatsappDisplay;
        document.getElementById('contactEmailText').textContent = data.email;
        document.getElementById('contactEmail').href = `mailto:${data.email}`;

        const waLink = (text) => `https://wa.me/${data.whatsappIntl}?text=${encodeURIComponent(text)}`;
        document.getElementById('headerWhatsapp').href = waLink('Bonjour Momo Tech, je souhaite passer une commande.');
        document.getElementById('contactWhatsapp').href = waLink('Bonjour Momo Tech, je souhaite passer une commande.');
      })
      .catch(() => {});
  }

  function renderDiamonds(items) {
    const grid = document.getElementById('diamondGrid');
    grid.innerHTML = items
      .map(
        (o) => `
      <div class="offer-card ${o.badge ? 'is-popular' : ''}">
        ${o.badge ? `<span class="offer-badge">${o.badge}</span>` : ''}
        <div class="offer-amount">${diamondIcon} ${o.diamonds.toLocaleString('fr-FR')}</div>
        <div class="offer-price">${fmt(o.price)}</div>
        <button class="btn btn-primary btn-block btn-sm order-btn" data-id="${o.id}" data-label="${o.diamonds.toLocaleString('fr-FR')} Diamants" data-price="${o.price}">Commander</button>
      </div>`
      )
      .join('');
  }

  function renderSubs(items) {
    const grid = document.getElementById('subsGrid');
    grid.innerHTML = items
      .map(
        (o) => `
      <div class="sub-card">
        <h3>${o.label}</h3>
        <p>${o.description || ''}</p>
        <div class="offer-price">${fmt(o.price)}</div>
        <button class="btn btn-primary btn-block btn-sm order-btn" data-id="${o.id}" data-label="${o.label}" data-price="${o.price}">Commander</button>
      </div>`
      )
      .join('');
  }

  // ---------- Modal ----------
  const overlay = document.getElementById('orderModal');
  const formView = document.getElementById('orderFormView');
  const confirmView = document.getElementById('orderConfirmView');
  const form = document.getElementById('orderForm');
  const formError = document.getElementById('formError');

  function openModal(id, label, price) {
    formView.style.display = 'block';
    confirmView.style.display = 'none';
    formError.style.display = 'none';
    form.reset();

    document.getElementById('offerIdInput').value = id;
    document.getElementById('offerLabelInput').value = label;
    document.getElementById('offerPriceInput').value = fmt(Number(price));
    document.getElementById('modalOfferLabel').textContent = label;
    document.getElementById('modalOfferPrice').textContent = fmt(Number(price));

    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.order-btn');
    if (btn) openModal(btn.dataset.id, btn.dataset.label, btn.dataset.price);
  });

  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('closeConfirm').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeModal(); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    formError.style.display = 'none';

    const submitBtn = document.getElementById('submitOrder');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours…';

    const fd = new FormData(form);

    fetch('/api/orders', { method: 'POST', body: fd })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Une erreur est survenue.');
        formView.style.display = 'none';
        confirmView.style.display = 'block';
      })
      .catch((err) => {
        formError.textContent = err.message;
        formError.style.display = 'block';
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirmer ma commande';
      });
  });

  // ---------- Copy MTN number ----------
  document.getElementById('copyMtn').addEventListener('click', function () {
    const raw = (contactData && contactData.mtnNumberRaw) || document.getElementById('mtnNumber').textContent;
    navigator.clipboard.writeText(raw).then(() => {
      this.textContent = 'Numéro copié !';
      setTimeout(() => { this.textContent = 'Copier le numéro'; }, 2000);
    });
  });

  // ---------- FAQ ----------
  document.querySelectorAll('.faq-q').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const answer = item.querySelector('.faq-a');
      const isOpen = item.classList.contains('open');

      document.querySelectorAll('.faq-item.open').forEach((el) => {
        el.classList.remove('open');
        el.querySelector('.faq-a').style.maxHeight = null;
        el.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // ---------- Mobile nav ----------
  const navToggle = document.getElementById('navToggle');
  const header = document.getElementById('siteHeader');
  navToggle.addEventListener('click', () => {
    const open = header.classList.toggle('nav-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  document.querySelectorAll('.mobile-menu a').forEach((a) =>
    a.addEventListener('click', () => header.classList.remove('nav-open'))
  );

  document.getElementById('year').textContent = new Date().getFullYear();

  loadOffers();
  loadContact();
})();
