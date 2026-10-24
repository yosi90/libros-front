import { CanalDeEspacio, MensajeDelCanal } from '../../interfaces/platform-spaces';
import { AjustesPlataforma, AvisoTiempoReal, EstadoPlataforma, EstadoTiempoReal, EventoTiempoReal, YosiftwareSdk } from './yosiftware-sdk';

/**
 * Doble del SDK de la plataforma para las pruebas de Karma (solo lo importan los `.spec.ts`). El estado de la sesión,
 * los tokens, el bloque de ajustes, el tiempo real y el contador del chat los decide la prueba.
 */
export class YosiftwareSdkDouble implements YosiftwareSdk {
    estado: EstadoPlataforma = { tipo: 'comprobando' };
    tokens: Array<string | null> = ['token-1'];
    tokensPlataforma: Array<string | null> = ['token-plataforma-1'];
    ajustesGuardados: AjustesPlataforma = { version: 0, documento: {} };
    /** Simula que otro dispositivo guarda justo antes del siguiente `guardar` (con estos cambios). */
    otroDispositivoGuarda: Record<string, unknown> | null = null;
    private oyentes: Array<(estado: EstadoPlataforma) => void> = [];
    private oyentesEvento: Array<(evento: EventoTiempoReal) => void> = [];
    private oyentesAviso: Array<(aviso: AvisoTiempoReal) => void> = [];
    private oyentesConexion: Array<(estado: EstadoTiempoReal) => void> = [];
    private oyentesNoLeidos: Array<(noLeidos: number) => void> = [];
    private secuencia = 0;
    /** Los canales de espacio abiertos, por espacio (`yosiftware.espacios.canal`). */
    private canales = new Map<number, Set<(mensaje: MensajeDelCanal) => void>>();

    readonly salir = jasmine.createSpy('salir').and.resolveTo();
    readonly entrar = jasmine.createSpy('entrar').and.resolveTo(true);
    readonly cambiarCuenta = jasmine.createSpy('cambiarCuenta').and.resolveTo(true);
    readonly editarPerfil = jasmine.createSpy('editarPerfil').and.resolveTo(false);
    readonly perfil = jasmine.createSpy('perfil').and.resolveTo(null);
    readonly reportar = jasmine.createSpy('reportar').and.resolveTo(false);
    readonly denunciar = jasmine.createSpy('denunciar').and.resolveTo(true);
    readonly privacidad = jasmine.createSpy('privacidad').and.resolveTo();
    readonly fetch = jasmine.createSpy('fetch').and.callFake(async () => { this.tokens.shift(); return new Response(null, { status: 200 }); });
    readonly token = jasmine.createSpy('token').and.callFake(async () => this.tokens[0] ?? null);
    readonly tokenPlataforma = jasmine.createSpy('tokenPlataforma').and.callFake(async () => this.tokensPlataforma.length > 1 ? this.tokensPlataforma.shift() ?? null : this.tokensPlataforma[0] ?? null);

    readonly ajustes = {
        leer: jasmine.createSpy('ajustes.leer').and.callFake(async () => this.estado.tipo === 'con_sesion' ? structuredClone(this.ajustesGuardados) : null),
        guardar: jasmine.createSpy('ajustes.guardar').and.callFake(async (cambios: Record<string, unknown>, version?: number) => {
            if (this.estado.tipo !== 'con_sesion') return null;
            if (this.otroDispositivoGuarda) {
                this.ajustesGuardados = { version: this.ajustesGuardados.version + 1, documento: { ...this.ajustesGuardados.documento, ...this.otroDispositivoGuarda } };
                this.otroDispositivoGuarda = null;
            }
            if (version !== undefined && version !== this.ajustesGuardados.version) throw { code: 'ajustes_desactualizados' };
            const documento = { ...this.ajustesGuardados.documento };
            for (const [clave, valor] of Object.entries(cambios)) {
                if (valor === null) delete documento[clave];
                else documento[clave] = valor;
            }
            this.ajustesGuardados = { version: this.ajustesGuardados.version + 1, documento };
            return structuredClone(this.ajustesGuardados);
        })
    };

    readonly tiempoReal = {
        estado: { tipo: 'desconectado' } as EstadoTiempoReal,
        alEvento: jasmine.createSpy('tiempoReal.alEvento').and.callFake((oyente: (evento: EventoTiempoReal) => void) => {
            this.oyentesEvento.push(oyente);
            return () => this.oyentesEvento = this.oyentesEvento.filter(item => item !== oyente);
        }),
        alAviso: jasmine.createSpy('tiempoReal.alAviso').and.callFake((oyente: (aviso: AvisoTiempoReal) => void) => {
            this.oyentesAviso.push(oyente);
            return () => this.oyentesAviso = this.oyentesAviso.filter(item => item !== oyente);
        }),
        alCambiar: jasmine.createSpy('tiempoReal.alCambiar').and.callFake((oyente: (estado: EstadoTiempoReal) => void) => {
            this.oyentesConexion.push(oyente);
            oyente(this.tiempoReal.estado);
            return () => this.oyentesConexion = this.oyentesConexion.filter(item => item !== oyente);
        }),
        sincronizar: jasmine.createSpy('tiempoReal.sincronizar')
    };

    readonly chat = {
        noLeidos: 0,
        alCambiarNoLeidos: jasmine.createSpy('chat.alCambiarNoLeidos').and.callFake((oyente: (noLeidos: number) => void) => {
            this.oyentesNoLeidos.push(oyente);
            oyente(this.chat.noLeidos);
            return () => this.oyentesNoLeidos = this.oyentesNoLeidos.filter(item => item !== oyente);
        }),
        escribiendo: jasmine.createSpy('chat.escribiendo')
    };

    readonly espacios = {
        canal: jasmine.createSpy('espacios.canal').and.callFake((id: number, oyente: (mensaje: MensajeDelCanal) => void): CanalDeEspacio => {
            const oyentes = this.canales.get(id) ?? new Set();
            oyentes.add(oyente);
            this.canales.set(id, oyentes);
            return { espacio: id, presentes: [], cerrar: () => { oyentes.delete(oyente); if (!oyentes.size) this.canales.delete(id); } };
        })
    };

    listo(): Promise<EstadoPlataforma> { return Promise.resolve(this.estado); }
    alCambiar(oyente: (estado: EstadoPlataforma) => void): () => void {
        this.oyentes.push(oyente);
        oyente(this.estado);
        return () => this.oyentes = this.oyentes.filter(item => item !== oyente);
    }
    emitir(estado: EstadoPlataforma): void {
        this.estado = estado;
        this.oyentes.forEach(oyente => oyente(estado));
    }

    /** Un evento del tiempo real (`chat.mensaje`…), como lo entrega el SDK. */
    evento(tipo: string, datos: Record<string, unknown> | null = null): void {
        const evento: EventoTiempoReal = { secuencia: ++this.secuencia, tipo, datos, fecha: new Date().toISOString() };
        this.oyentesEvento.forEach(oyente => oyente(evento));
    }
    aviso(aviso: AvisoTiempoReal): void { this.oyentesAviso.forEach(oyente => oyente(aviso)); }
    conexion(estado: EstadoTiempoReal): void {
        this.tiempoReal.estado = estado;
        this.oyentesConexion.forEach(oyente => oyente(estado));
    }
    noLeidos(total: number): void {
        this.chat.noLeidos = total;
        this.oyentesNoLeidos.forEach(oyente => oyente(total));
    }
    /** Lo que entrega el canal de un espacio a quien lo tiene abierto. */
    canal(espacio: number, mensaje: MensajeDelCanal): void { this.canales.get(espacio)?.forEach(oyente => oyente(mensaje)); }
    /** Cuántos canales de espacio siguen abiertos. */
    get canalesAbiertos(): number { return [...this.canales.values()].reduce((total, oyentes) => total + oyentes.size, 0); }
    /** Cuántos oyentes tiene el tiempo real: sin ninguno, el SDK cierra el socket. */
    get oyentesDelTiempoReal(): number { return this.oyentesEvento.length + this.oyentesAviso.length + this.oyentesConexion.length; }
}
