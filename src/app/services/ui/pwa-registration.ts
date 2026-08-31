export function shouldEnableServiceWorker(
    devMode: boolean,
    environmentName: string,
    hostname: string,
    nativeMobile = false
): boolean {
    if (devMode)
        return false;
    return nativeMobile || environmentName !== 'qa' || hostname === 'qa-libros.yosiftware.es';
}
