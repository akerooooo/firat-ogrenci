window.siteIcon = name => `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-${/^[a-z]+$/.test(name) ? name : 'info'}"></use></svg>`;
// A home-screen launch starts at the top, even if an old shortcut saved a section hash.
(() => {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const navigation = performance.getEntriesByType('navigation')[0];
  if (navigation?.type === 'back_forward') return;
  if (standalone && location.hash) history.replaceState(null, '', location.pathname + location.search);
  if (location.hash) return; // Keep deliberate shared section links working in Safari.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  let interacted = false;
  for (const event of ['touchstart', 'wheel', 'keydown', 'pointerdown']) addEventListener(event, () => { interacted = true; }, { once: true, passive: true });
  addEventListener('pageshow', event => {
    if (!event.persisted && !interacted) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      requestAnimationFrame(() => { if (!interacted) window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); });
    }
  });
  addEventListener('pagehide', () => { if ('scrollRestoration' in history) history.scrollRestoration = 'auto'; });
})();
// Runs before styles load so a saved preference does not flash the wrong theme.
(() => {
  const root = document.documentElement;
  let theme = 'dark';
  try { if (JSON.parse(localStorage.getItem('firat:tema')) === 'light') theme = 'light'; } catch { /* Dark remains the default. */ }
  function apply() {
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#191918' : '#f8f7f4');
    const button = document.getElementById('temaDegistir');
    if (button) {
      button.innerHTML = window.siteIcon(theme === 'dark' ? 'sun' : 'moon') + (theme === 'dark' ? '<span>Açık tema</span>' : '<span>Koyu tema</span>');
      button.setAttribute('aria-label', theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç');
      button.title = theme === 'dark' ? 'Şu an koyu tema açık' : 'Şu an açık tema açık';
    }
  }
  apply();
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.getElementById('temaDegistir').addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('firat:tema', JSON.stringify(theme)); } catch { /* Toggle still works without storage. */ }
      apply();
    });
  });
})();
