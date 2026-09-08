export function scrollMobileFormBlockIntoView(host: HTMLElement, selector: string): void {
    const view = host.ownerDocument.defaultView;
    if (!view)
        return;

    const scroll = (): void => {
        const target = host.querySelector<HTMLElement>(selector);
        if (!target)
            return;
        const reducedMotion = view.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        target.scrollIntoView({
            behavior: reducedMotion ? 'auto' : 'smooth',
            block: 'center',
            inline: 'nearest'
        });
    };

    view.requestAnimationFrame(() => view.requestAnimationFrame(scroll));
}
