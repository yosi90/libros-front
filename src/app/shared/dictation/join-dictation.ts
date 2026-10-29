/**
 * Lo dictado que se inserta tras `before`: con un espacio delante si hace falta y con mayúscula al empezar una frase (al
 * principio, tras un salto de línea o tras «.», «?», «!» o «…»). Sin espacio delante de un signo de puntuación. Es la
 * misma regla que la APK (`UnirDictado`).
 */
export function joinDictation(before: string, dictated: string): string {
    const clean = dictated.trim();
    if (!clean) return '';
    const previous = before.replace(/[  ​]+$/u, '');
    const startsSentence = !previous || /[\n.?!…]$/u.test(previous);
    const body = startsSentence ? clean.charAt(0).toLocaleUpperCase('es') + clean.slice(1) : clean;
    const last = before.replace(/​/gu, '').slice(-1);
    const needsSpace = !!last && !/\s/u.test(last) && !/^[.,;:?!…)»”]/u.test(body);
    return (needsSpace ? ' ' : '') + body;
}
