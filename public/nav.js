/**
 * HYDRA - Componente de Barra de Navegación Móvil Inferior (Bottom Nav)
 * Inyecta dinámicamente la barra inferior en las páginas principales de la app.
 */

(function () {
  const NAV_ITEMS = [
    {
      id: 'dashboard',
      label: 'Inicio',
      page: 'dashboard.html',
      icon: '<svg viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>'
    },
    {
      id: 'live',
      label: 'Ducha',
      page: 'live.html',
      icon: '<svg viewBox="0 0 24 24"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>'
    },
    {
      id: 'ranking',
      label: 'Ranking',
      page: 'ranking.html',
      icon: '<svg viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>'
    },
    {
      id: 'group',
      label: 'Grupo',
      page: 'group.html',
      icon: '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>'
    },
    {
      id: 'profile',
      label: 'Perfil',
      page: 'profile.html',
      icon: '<svg viewBox="0 0 24 24"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
    }
  ];

  function injectBottomNav() {
    const currentPage = document.body.dataset.page;
    // Páginas donde NO debe aparecer la barra inferior
    const excludedPages = ['index', 'pairing', 'summary'];

    if (!currentPage || excludedPages.includes(currentPage)) {
      return;
    }

    document.body.classList.add('has-bottom-nav');

    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';

    NAV_ITEMS.forEach(item => {
      const btn = document.createElement('a');
      btn.href = item.page;
      btn.className = `bottom-nav-item ${currentPage === item.id ? 'active' : ''}`;
      btn.innerHTML = `${item.icon}<span>${item.label}</span>`;

      btn.addEventListener('click', (e) => {
        if (currentPage === item.id) {
          e.preventDefault();
          return;
        }
      });

      nav.appendChild(btn);
    });

    document.body.appendChild(nav);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectBottomNav);
  } else {
    injectBottomNav();
  }
})();

