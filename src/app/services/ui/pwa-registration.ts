export function shouldEnableServiceWorker(
    devMode: boolean,
    environmentName: string,
    hostname: string,
    nativeMobile = false
): boolean {
    // QA conserva `environment.production = false` para sus diagnósticos, de
    // modo que `isDevMode()` sigue activo incluso en el bundle optimizado que
    // se empaqueta en la APK. El runtime nativo es la única excepción: necesita
    // registrar el worker para reproducir el ciclo real de actualización.
    if (nativeMobile && environmentName === 'qa')
        return true;
    if (devMode)
        return false;
    return nativeMobile || environmentName !== 'qa' || hostname === 'qa-libros.yosiftware.es';
}
