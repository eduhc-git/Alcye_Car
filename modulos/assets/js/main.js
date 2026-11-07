(() => {
    const root = document.documentElement;
    if (root.dataset.pageTransitions !== 'true') return;

    try {
        if (sessionStorage.getItem('tuning-page-transition') === '1') {
            root.classList.add('page-entering');
            sessionStorage.removeItem('tuning-page-transition');
            document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('page-entering'))), { once: true });
        }
    } catch (_) {}

    document.addEventListener('click', (event) => {
        const link = event.target.closest('a[href]');
        if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return;
        const target = new URL(link.href, location.href);
        if (target.origin !== location.origin || !/\.html$/i.test(target.pathname) || target.href === location.href) return;
        event.preventDefault();
        root.classList.add('page-leaving');
        try {
            sessionStorage.setItem('tuning-page-transition', '1');
        } catch (_) {}
        setTimeout(() => location.assign(target.href), 240);
    });
})();
