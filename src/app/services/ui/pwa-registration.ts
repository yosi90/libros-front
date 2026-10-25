export function shouldEnableServiceWorker(
    devMode: boolean,
    environmentName: string,
    hostname: string
): boolean {
    // QA conserva `environment.production = false` para sus diagnósticos; el
    // worker solo se registra en el Hosting canónico de QA.
    if (devMode)
        return false;
    return environmentName !== 'qa' || hostname === 'qa-libros.yosiftware.es';
}
