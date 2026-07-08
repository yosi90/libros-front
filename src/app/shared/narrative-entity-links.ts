import { Book } from '../interfaces/book';

export type NarrativeEntityLinkKind = 'characters' | 'locations' | 'organizations' | 'concepts' | 'events' | 'quotes';

export interface NarrativeEntityLink {
    id: number;
    kind: NarrativeEntityLinkKind;
    text: string;
    targetUrl: string;
    title: string;
    priority: number;
}

interface MatchCandidate {
    start: number;
    end: number;
    link: NarrativeEntityLink;
}

const ENTITY_PRIORITIES: Record<NarrativeEntityLinkKind, number> = {
    characters: 0,
    locations: 1,
    organizations: 2,
    concepts: 3,
    events: 4,
    quotes: 5
};

export function buildNarrativeEntityLinks(book: Book): NarrativeEntityLink[] {
    if (!book?.Id)
        return [];

    const links: NarrativeEntityLink[] = [];
    const addLink = (kind: NarrativeEntityLinkKind, id: number, text: string, titleName: string): void => {
        const cleanText = String(text ?? '').trim();
        if (!id || cleanText.length < 2)
            return;

        links.push({
            id,
            kind,
            text: cleanText,
            targetUrl: `/book/${book.Id}/${kind}?selected=${id}`,
            title: `Abrir ${titleName}`,
            priority: ENTITY_PRIORITIES[kind]
        });
    };

    (book.Personajes ?? []).forEach(character => {
        addLink('characters', character.Id, character.Nombre, character.Nombre);
        (character.Apodos ?? []).forEach(alias => addLink('characters', character.Id, alias.Apodo, character.Nombre));
    });
    (book.Localizaciones ?? []).forEach(location => addLink('locations', location.Id, location.Nombre, location.Nombre));
    (book.Organizaciones ?? []).forEach(organization => addLink('organizations', organization.Id, organization.Nombre, organization.Nombre));
    (book.Conceptos ?? []).forEach(concept => addLink('concepts', concept.Id, concept.Nombre, concept.Nombre));
    (book.Eventos ?? []).forEach(event => addLink('events', event.Id, event.Nombre, event.Nombre));
    (book.Citas ?? []).forEach(quote => addLink('quotes', quote.Id, quote.Nombre, quote.Nombre));

    return deduplicateLinks(links).sort((a, b) => {
        if (b.text.length !== a.text.length)
            return b.text.length - a.text.length;
        if (a.priority !== b.priority)
            return a.priority - b.priority;
        return a.text.localeCompare(b.text);
    });
}

export function applyNarrativeEntityLinks(html: string, links: NarrativeEntityLink[]): string {
    if (!html || links.length === 0)
        return html;

    const container = document.createElement('div');
    container.innerHTML = html;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode())
        textNodes.push(walker.currentNode as Text);

    textNodes.forEach(textNode => replaceTextNodeWithLinks(textNode, links));
    return container.innerHTML;
}

function deduplicateLinks(links: NarrativeEntityLink[]): NarrativeEntityLink[] {
    const byKey = new Map<string, NarrativeEntityLink>();
    links.forEach(link => {
        const key = `${link.kind}:${link.id}:${link.text.toLocaleLowerCase()}`;
        const existing = byKey.get(key);
        if (!existing || link.text.length > existing.text.length)
            byKey.set(key, link);
    });
    return [...byKey.values()];
}

function replaceTextNodeWithLinks(textNode: Text, links: NarrativeEntityLink[]): void {
    const text = textNode.textContent ?? '';
    const matches = findMatches(text, links);
    if (matches.length === 0)
        return;

    const fragment = document.createDocumentFragment();
    let cursor = 0;
    matches.forEach(match => {
        if (match.start > cursor)
            fragment.appendChild(document.createTextNode(text.slice(cursor, match.start)));

        const element = document.createElement('span');
        element.className = 'rtf-narrative-link';
        element.dataset['entityId'] = String(match.link.id);
        element.dataset['entityKind'] = match.link.kind;
        element.dataset['targetUrl'] = match.link.targetUrl;
        element.title = match.link.title;
        element.textContent = text.slice(match.start, match.end);
        fragment.appendChild(element);
        cursor = match.end;
    });

    if (cursor < text.length)
        fragment.appendChild(document.createTextNode(text.slice(cursor)));

    textNode.replaceWith(fragment);
}

function findMatches(text: string, links: NarrativeEntityLink[]): MatchCandidate[] {
    const candidates: MatchCandidate[] = [];
    const lowerText = text.toLocaleLowerCase();

    links.forEach(link => {
        const search = link.text.toLocaleLowerCase();
        let start = lowerText.indexOf(search);
        while (start !== -1) {
            const end = start + search.length;
            const mention = text.slice(start, end);
            if (hasValidBoundaries(text, start, end) && isCapitalizedMention(mention))
                candidates.push({ start, end, link });
            start = lowerText.indexOf(search, start + 1);
        }
    });

    return selectNonOverlappingMatches(candidates);
}

function selectNonOverlappingMatches(candidates: MatchCandidate[]): MatchCandidate[] {
    const selected: MatchCandidate[] = [];
    candidates
        .sort((a, b) => {
            const lengthDelta = (b.end - b.start) - (a.end - a.start);
            if (lengthDelta !== 0)
                return lengthDelta;
            if (a.link.priority !== b.link.priority)
                return a.link.priority - b.link.priority;
            return a.start - b.start;
        })
        .forEach(candidate => {
            if (!selected.some(match => rangesOverlap(candidate, match)))
                selected.push(candidate);
        });

    return selected.sort((a, b) => a.start - b.start);
}

function rangesOverlap(a: MatchCandidate, b: MatchCandidate): boolean {
    return a.start < b.end && b.start < a.end;
}

function hasValidBoundaries(text: string, start: number, end: number): boolean {
    const before = start > 0 ? text[start - 1] : '';
    const after = end < text.length ? text[end] : '';
    return !isWordCharacter(before) && !isWordCharacter(after);
}

function isCapitalizedMention(value: string): boolean {
    const firstLetter = value.match(/\p{L}/u)?.[0] ?? '';
    return !!firstLetter && firstLetter === firstLetter.toLocaleUpperCase() && firstLetter !== firstLetter.toLocaleLowerCase();
}

function isWordCharacter(value: string): boolean {
    return !!value && /[\p{L}\p{N}_]/u.test(value);
}
