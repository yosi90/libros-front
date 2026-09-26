/**
 * En compact, las pestañas Web (ajustes, Comunidad) son una fila desplazable:
 * centra la activa para que siempre quede a la vista.
 */
export function revealActiveTab(host: HTMLElement, navSelector = '.web-settings__nav'): void {
    const nav = host.querySelector<HTMLElement>(navSelector);
    const active = nav?.querySelector<HTMLElement>('.is-active');
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth)
        return;
    nav.scrollLeft = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
}
