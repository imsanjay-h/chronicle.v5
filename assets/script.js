/* ═══════════════════════════════════════════════════════════
   SCRIPT — nav, reveal, modal, tabs, utilities
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // ─── CREATE ATMOSPHERE LAYERS ──────────────────
  if (!document.querySelector('.grain')) {
    const grain = document.createElement('div');
    grain.className = 'grain';
    document.body.appendChild(grain);
  }
  if (!document.querySelector('.scanlines')) {
    const scan = document.createElement('div');
    scan.className = 'scanlines';
    document.body.appendChild(scan);
  }
  if (!document.getElementById('dust')) {
    const dust = document.createElement('canvas');
    dust.id = 'dust';
    document.body.appendChild(dust);
  }

  // ─── NAV ACTIVE STATE ──────────────────────────
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav a.navlink').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });

  // ─── SCROLL REVEAL ─────────────────────────────
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        revealObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });

  function attachReveal() {
    document.querySelectorAll('.reveal:not(.observed)').forEach(r => {
      r.classList.add('observed');
      revealObserver.observe(r);
    });
  }
  attachReveal();
  window.attachReveal = attachReveal;

  // ─── MODAL ─────────────────────────────────────
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    const modal = overlay.querySelector('.modal');

    function openModal(data) {
      modal.querySelector('h3').textContent = data.title || '';
      modal.querySelector('.modal-meta').textContent = [data.year, data.director].filter(Boolean).join(' · ');
      const starsEl = modal.querySelector('.stars');
      if (data.stars) {
        starsEl.textContent = data.stars;
        starsEl.style.display = 'block';
      } else {
        starsEl.style.display = 'none';
      }
      const reviewEl = modal.querySelector('.review');
      if (data.note && data.note.trim()) {
        reviewEl.textContent = data.note;
        reviewEl.style.display = 'block';
      } else {
        reviewEl.style.display = 'none';
      }
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-modal]');
      if (trigger) {
        try {
          const data = JSON.parse(trigger.getAttribute('data-modal'));
          openModal(data);
        } catch(err) {}
      }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    modal.querySelector('.close').addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  // ─── TABS ──────────────────────────────────────
  document.querySelectorAll('[data-tabs]').forEach(container => {
    const tabs = container.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-tab');
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('[data-panel]').forEach(p => {
          p.style.display = p.getAttribute('data-panel') === target ? 'block' : 'none';
        });
      });
    });
  });

  // ─── STAR HELPER ───────────────────────────────
  window.starStr = function(rating) {
    if (!rating) return '';
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    return '★'.repeat(full) + (half ? '½' : '');
  };

  // ─── ARCHIVE SEARCH ────────────────────────────
  const archiveSearch = document.getElementById('archive-search');
  if (archiveSearch) {
    const clearButton = document.getElementById('archive-clear');
    const count = document.getElementById('archive-count');
    const posters = Array.from(document.querySelectorAll('.poster'));
    const tags = Array.from(document.querySelectorAll('#watchlist-container .tag, #ptw-container .tag'));
    const searchable = [...posters, ...tags];

    function filterArchive() {
      const query = archiveSearch.value.trim().toLocaleLowerCase();
      let visible = 0;
      searchable.forEach(item => {
        const matches = !query || item.textContent.toLocaleLowerCase().includes(query);
        item.hidden = !matches;
        if (matches) visible++;
      });
      document.querySelectorAll('#tiers-container .tier').forEach(tier => {
        const hasVisible = Array.from(tier.querySelectorAll('.poster')).some(card => !card.hidden);
        tier.hidden = !!query && !hasVisible;
      });
      document.querySelectorAll('.bordered').forEach(section => {
        const cards = Array.from(section.querySelectorAll('.poster, .tag'));
        if (cards.length) section.classList.toggle('archive-empty', !!query && !cards.some(card => !card.hidden));
      });
      if (count) count.textContent = query ? `${visible} result${visible === 1 ? '' : 's'} for “${archiveSearch.value.trim()}”` : 'Showing the whole collection';
      if (clearButton) clearButton.hidden = !query;
    }
    archiveSearch.addEventListener('input', filterArchive);
    clearButton?.addEventListener('click', () => {
      archiveSearch.value = '';
      filterArchive();
      archiveSearch.focus();
    });
    filterArchive();
  }

  // ─── PROJECTOR BEAM ON HERO ────────────────────
  const hero = document.querySelector('.hero');
  if (hero && !hero.querySelector('.beam')) {
    const beam = document.createElement('div');
    beam.className = 'beam';
    hero.appendChild(beam);
  }

});
