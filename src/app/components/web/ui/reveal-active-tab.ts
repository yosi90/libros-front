/**
 * En compact, la subnavegación de las páginas de ajustes Web es una fila
 * desplazable: centra el apartado activo para que siempre quede a la vista.
 */
export function revealActiveTab(host: HTMLElement): void {
    const nav = host.querySelector<HTMLElement>('.web-settings__nav');
    const active = nav?.querySelector<HTMLElement>('.is-active');
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth)
        return;
    nav.scrollLeft = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
}
