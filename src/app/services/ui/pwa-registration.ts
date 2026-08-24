export function shouldEnableServiceWorker(devMode: boolean, environmentName: string, hostname: string): boolean {
    if (devMode)
        return false;
    return environmentName !== 'qa' || hostname === 'qa-libros.yosiftware.es';
}
