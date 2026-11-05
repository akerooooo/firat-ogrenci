window.siteIcon = name => `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#icon-${name}"></use></svg>`;
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
