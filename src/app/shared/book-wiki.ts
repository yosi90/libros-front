/**
 * La wiki de un libro: su dirección completa, o `null` si no tiene una propia. Las altas antiguas guardaban
 * `google.es` como valor por defecto, y eso no es una wiki.
 */
export function bookWikiUrl(wiki: string | null | undefined): string | null {
    const value = (wiki ?? '').trim();
    if (!value)
        return null;

    const url = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return isDefaultWiki(value, url) ? null : url;
}

function isDefaultWiki(value: string, url: string): boolean {
    try {
        return new URL(url).hostname.replace(/^www\./, '').toLocaleLowerCase() === 'google.es';
    } catch {
        return value.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '').toLocaleLowerCase() === 'google.es';
    }
}
