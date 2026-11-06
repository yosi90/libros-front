//#region src/version.ts
/** La versión del SDK (la de `package.json`, que lo comprueba `test/sdk.test.ts`). */
var VERSION = "1.32.0";
//#endregion
//#region src/doble/doble.ts
var IDIOMAS = [
	"es",
	"en",
	"pt",
	"de"
];
var MAXIMO_DE_CUENTAS = 5;
/** Como el del SDK: una respuesta que llega con otra cuenta activa no vale. */
var CambioDeIdentidad = class extends Error {
	constructor() {
		super("La cuenta ha cambiado. Vuelve a realizar la acción.");
		this.name = "CambioDeIdentidad";
	}
};
/** Como los errores de la plataforma en el SDK: `name`, `code`, `status`, `field` y `detalle`. */
var ErrorDePlataforma = class extends Error {
	code;
	status;
	estado;
	field;
	detalle;
	constructor(status, code, mensaje, field = null) {
		super(mensaje);
		this.name = "ErrorDePlataforma";
		this.code = code;
		this.status = status;
		this.estado = status;
		this.field = field;
		this.detalle = null;
	}
};
function completar(cuenta) {
	const alias = cuenta.alias ?? `cuenta-${cuenta.id}`;
	const correoVerificado = cuenta.correoVerificado ?? true;
	return {
		alias,
		correo: `${alias}@ejemplo.es`,
		estado: "activa",
		propietario: false,
		confirmarCorreoAntesDe: correoVerificado ? null : new Date(Date.now() + 6048e5).toISOString(),
		...cuenta,
		correoVerificado
	};
}
/** Un oyente que falla no impide que lleguen los demás (como en el SDK). */
function avisar(oyentes, valor) {
	for (const oyente of [...oyentes]) try {
		oyente(valor);
	} catch (error) {
		queueMicrotask(() => {
			throw error;
		});
	}
}
function crearDobleYosiftware(opciones = {}) {
	const ventana = opciones.ventana ?? globalThis;
	const fetchDeLaPagina = opciones.fetch ?? ((...argumentos) => globalThis.fetch(...argumentos));
	const llamadas = [];
	const apuntar = (metodo, argumentos) => llamadas.push({
		metodo,
		argumentos
	});
	const lanzar = (tipo, detail) => {
		const evento = typeof CustomEvent === "function" ? new CustomEvent(tipo, { detail }) : Object.assign(new Event(tipo), { detail });
		ventana.dispatchEvent(evento);
	};
	const guardadas = /* @__PURE__ */ new Map();
	const guardar = (cuenta) => {
		guardadas.set(cuenta.id, cuenta);
		if (guardadas.size > MAXIMO_DE_CUENTAS) guardadas.delete(guardadas.keys().next().value);
	};
	for (const cuenta of opciones.guardadas ?? []) guardar(completar(cuenta));
	const conSesion = (cuenta, extras = {}) => {
		guardar(cuenta);
		return {
			tipo: "con_sesion",
			cuenta,
			...extras.restricciones ? { restricciones: extras.restricciones } : {},
			...extras.normasPendientes ? { normasPendientes: extras.normasPendientes } : {}
		};
	};
	let estado = opciones.comprobando ? { tipo: "comprobando" } : opciones.cuenta ? conSesion(completar(opciones.cuenta), opciones) : { tipo: "sin_sesion" };
	let generacion = 0;
	const oyentesDeSesion = /* @__PURE__ */ new Set();
	let resolverListo = null;
	const listo = estado.tipo === "comprobando" ? new Promise((resolver) => resolverListo = resolver) : Promise.resolve(estado);
	const idActiva = () => estado.tipo === "con_sesion" ? estado.cuenta.id : null;
	const cuentaActiva = () => estado.tipo === "con_sesion" ? estado.cuenta : null;
	const cambiarEstado = (siguiente) => {
		const antes = idActiva();
		estado = siguiente;
		if (idActiva() !== antes) generacion += 1;
		if (estado.tipo !== "comprobando" && resolverListo) {
			resolverListo(estado);
			resolverListo = null;
		}
		actualizarTiempoReal();
		avisar(oyentesDeSesion, estado);
		lanzar("yosiftware:sesion", estado);
	};
	const avisarDeIdentidad = () => {
		generacion += 1;
		lanzar("yosiftware:identidad");
	};
	const iniciarSesion = (cuenta, extras) => {
		const nueva = completar(cuenta);
		const antes = idActiva();
		if (antes !== null && antes !== nueva.id) avisarDeIdentidad();
		cambiarEstado(conSesion(nueva, extras));
	};
	const cambiarDeCuenta = (cuenta, extras) => {
		avisarDeIdentidad();
		cambiarEstado(cuenta ? conSesion(cuenta, extras) : { tipo: "sin_sesion" });
	};
	let antesDeSalir = null;
	const conPregunta = async (motivo, hacer) => {
		const pregunta = antesDeSalir;
		const cuenta = idActiva();
		if (!pregunta || cuenta === null) return hacer();
		const generacionDeLaPregunta = generacion;
		const continuar = async () => {
			if (generacion !== generacionDeLaPregunta || idActiva() !== cuenta) throw new CambioDeIdentidad();
			await hacer();
		};
		let seguir = true;
		try {
			seguir = await pregunta({
				motivo,
				continuar
			}) !== false;
		} catch {
			seguir = true;
		}
		return seguir ? hacer() : false;
	};
	const cuentasGuardadas = () => [...guardadas.values()].map((cuenta) => ({
		sesion: `sesion-${cuenta.id}`,
		cuenta,
		activa: cuenta.id === idActiva(),
		nombre: null,
		avatar: null
	}));
	const tokens = /* @__PURE__ */ new Map();
	const ajustes = /* @__PURE__ */ new Map();
	const perfiles = /* @__PURE__ */ new Map();
	const ajustesDe = (id) => ajustes.get(id) ?? {
		version: 1,
		documento: {}
	};
	const aplicar = (actuales, cambios) => {
		const documento = { ...actuales.documento };
		for (const [clave, valor] of Object.entries(cambios)) if (valor === null) delete documento[clave];
		else documento[clave] = valor;
		return {
			version: actuales.version + 1,
			documento
		};
	};
	/** Lo que pide una cuenta: sin sesión, `null`; si la cuenta cambia antes de terminar, `CambioDeIdentidad`. */
	const deLaCuenta = async (hacer) => {
		const cuenta = cuentaActiva();
		if (!cuenta) return null;
		const empezada = generacion;
		const resultado = await hacer(cuenta);
		if (generacion !== empezada) throw new CambioDeIdentidad();
		return resultado;
	};
	const oyentesDeEventos = /* @__PURE__ */ new Set();
	const oyentesDeAvisos = /* @__PURE__ */ new Set();
	const oyentesDeConexion = /* @__PURE__ */ new Set();
	let estadoForzado = null;
	let estadoConexion = { tipo: "desconectado" };
	let secuencia = 0;
	const calcularConexion = () => {
		if (estadoForzado) return estadoForzado;
		if (oyentesDeEventos.size + oyentesDeAvisos.size === 0) return { tipo: "desconectado" };
		return estado.tipo === "con_sesion" ? { tipo: "conectado" } : { tipo: "sin_sesion" };
	};
	function actualizarTiempoReal() {
		const siguiente = calcularConexion();
		if (JSON.stringify(siguiente) === JSON.stringify(estadoConexion)) return;
		estadoConexion = siguiente;
		avisar(oyentesDeConexion, estadoConexion);
	}
	const escuchar = (oyentes, oyente) => {
		oyentes.add(oyente);
		actualizarTiempoReal();
		return () => {
			oyentes.delete(oyente);
			actualizarTiempoReal();
		};
	};
	let espacios = [];
	const miembros = /* @__PURE__ */ new Map();
	let invitaciones = [];
	const porCodigo = /* @__PURE__ */ new Map();
	const presentes = /* @__PURE__ */ new Map();
	const historial = /* @__PURE__ */ new Map();
	const canales = /* @__PURE__ */ new Map();
	const noEncontrado = (code, mensaje) => new ErrorDePlataforma(404, code, mensaje);
	const espacioDe = (invitacion) => espacios.find((e) => e.id === invitacion.espacio.id) ?? {
		id: invitacion.espacio.id,
		idExterno: invitacion.espacio.idExterno,
		web: invitacion.web,
		nombre: invitacion.espacio.nombre,
		entrada: "invitacion",
		dosPasos: invitacion.espacio.dosPasos,
		propietario: invitacion.de.cuenta,
		miembros: invitacion.miembros + 1,
		conversacion: null,
		creado: (/* @__PURE__ */ new Date()).toISOString(),
		yo: {
			rol: invitacion.rol,
			nombreRol: invitacion.nombreRol,
			propietario: false,
			estado: "activo",
			capacidades: {
				gestionar: false,
				invitar: false,
				chat: "escribir"
			}
		},
		traspaso: null
	};
	const aceptar = (invitacion, mensaje) => {
		if (!invitacion) throw noEncontrado("invitacion_no_encontrada", mensaje);
		invitaciones = invitaciones.filter((i) => i.id !== invitacion.id);
		const espacio = espacioDe(invitacion);
		if (!espacios.some((e) => e.id === espacio.id)) espacios = [...espacios, espacio];
		return espacio;
	};
	const alCanal = (idEspacio, mensaje) => {
		for (const oyente of canales.get(idEspacio) ?? []) try {
			oyente(mensaje);
		} catch (error) {
			queueMicrotask(() => {
				throw error;
			});
		}
	};
	let noLeidos = 0;
	const oyentesDeNoLeidos = /* @__PURE__ */ new Set();
	let conversaciones = [];
	const directas = /* @__PURE__ */ new Map();
	let contadores = {
		noVistas: 0,
		noLeidas: 0
	};
	const oyentesDeContadores = /* @__PURE__ */ new Set();
	const oyentesDeNotificaciones = /* @__PURE__ */ new Set();
	let pagina = null;
	let servicios = [];
	let encargos = [];
	const oyentesDeEncargos = /* @__PURE__ */ new Set();
	const encargo = (id) => {
		const encontrado = encargos.find((e) => e.id === id);
		if (!encontrado) throw noEncontrado("encargo_no_encontrado", "Ese encargo no existe o ya no está.");
		return encontrado;
	};
	const respuestas = {
		entrar: () => null,
		anadirCuenta: () => null,
		cambiarCuenta: (lista) => lista.find((c) => !c.activa)?.sesion ?? null,
		normasDeLaWeb: () => true,
		confirmarCorreo: () => false,
		reportar: () => false,
		denunciar: () => false,
		editarPerfil: () => false
	};
	let idiomaForzado = null;
	const idiomaDeLaWeb = () => {
		const lang = (globalThis.document?.documentElement?.lang ?? "").split("-")[0].toLowerCase();
		return IDIOMAS.includes(lang) ? lang : "es";
	};
	const yosiftware = {
		version: VERSION,
		get estado() {
			return estado;
		},
		listo: () => listo,
		alCambiar(oyente) {
			oyentesDeSesion.add(oyente);
			oyente(estado);
			return () => oyentesDeSesion.delete(oyente);
		},
		async entrar(opciones) {
			apuntar("entrar", [opciones]);
			const cuenta = await respuestas.entrar();
			if (cuenta) iniciarSesion(cuenta);
			return estado.tipo === "con_sesion";
		},
		async salir() {
			apuntar("salir", []);
			await conPregunta("salir", async () => {
				const id = idActiva();
				if (id === null) return false;
				guardadas.delete(id);
				cambiarDeCuenta(null);
				return true;
			});
		},
		async cambiarCuenta() {
			apuntar("cambiarCuenta", []);
			return conPregunta("cambiar_cuenta", async () => {
				const sesion = await respuestas.cambiarCuenta(cuentasGuardadas());
				return sesion ? yosiftware.elegirCuenta(sesion) : false;
			});
		},
		async cuentasGuardadas() {
			const lista = cuentasGuardadas();
			return lista.length ? {
				cuentas: lista,
				maximo: MAXIMO_DE_CUENTAS
			} : null;
		},
		async elegirCuenta(sesion) {
			apuntar("elegirCuenta", [sesion]);
			const elegida = cuentasGuardadas().find((c) => c.sesion === sesion);
			if (!elegida) return false;
			return conPregunta("cambiar_cuenta", async () => {
				cambiarDeCuenta(elegida.cuenta);
				return true;
			});
		},
		async anadirCuenta() {
			apuntar("anadirCuenta", []);
			return conPregunta("anadir_cuenta", async () => {
				const cuenta = await respuestas.anadirCuenta();
				if (!cuenta) return false;
				cambiarDeCuenta(completar(cuenta));
				return true;
			});
		},
		async salirDeTodas() {
			apuntar("salirDeTodas", []);
			await conPregunta("salir_de_todas", async () => {
				guardadas.clear();
				cambiarDeCuenta(null);
				return true;
			});
		},
		antesDeSalir(pregunta) {
			antesDeSalir = pregunta;
			return () => {
				if (antesDeSalir === pregunta) antesDeSalir = null;
			};
		},
		async normasDeLaWeb(opciones) {
			apuntar("normasDeLaWeb", [opciones]);
			if (estado.tipo !== "con_sesion") return false;
			if (!estado.normasPendientes) return true;
			if (!await respuestas.normasDeLaWeb()) return false;
			const { normasPendientes: _aceptadas, ...sinNormas } = estado;
			cambiarEstado(sinNormas);
			return true;
		},
		async confirmarCorreo() {
			apuntar("confirmarCorreo", []);
			if (estado.tipo !== "con_sesion" || estado.cuenta.correoVerificado) return false;
			if (!await respuestas.confirmarCorreo()) return false;
			cambiarEstado({
				...estado,
				cuenta: {
					...estado.cuenta,
					correoVerificado: true,
					confirmarCorreoAntesDe: null
				}
			});
			return true;
		},
		async reportar(opciones) {
			apuntar("reportar", [opciones]);
			return respuestas.reportar();
		},
		async denunciar(objeto) {
			apuntar("denunciar", [objeto]);
			return respuestas.denunciar();
		},
		async privacidad(opciones) {
			apuntar("privacidad", [opciones]);
		},
		idioma(valor) {
			if (valor !== void 0) {
				const antes = yosiftware.idioma();
				const pedido = (valor ?? "").split("-")[0].toLowerCase();
				idiomaForzado = valor === null ? null : IDIOMAS.includes(pedido) ? pedido : "es";
				const ahora = idiomaForzado ?? idiomaDeLaWeb();
				if (ahora !== antes) lanzar("yosiftware:idioma", { idioma: ahora });
			}
			return idiomaForzado ?? idiomaDeLaWeb();
		},
		async estilos(hoja) {
			apuntar("estilos", [hoja]);
		},
		async editarPerfil() {
			apuntar("editarPerfil", []);
			return respuestas.editarPerfil();
		},
		perfil: () => deLaCuenta((cuenta) => ({
			id: cuenta.id,
			alias: cuenta.alias,
			nombre: null,
			nombreCompleto: null,
			biografia: null,
			pronombres: null,
			identidadDeGenero: null,
			ubicacion: null,
			idioma: null,
			fechaNacimiento: null,
			web: null,
			enlaces: [],
			privado: false,
			avatar: null,
			creada: "2026-01-01T00:00:00Z",
			version: 1,
			actualizado: null,
			aliasCambiableDesde: null,
			...perfiles.get(cuenta.id)
		})),
		ajustes: {
			leer: () => deLaCuenta((cuenta) => structuredClone(ajustesDe(cuenta.id))),
			guardar: (cambios, version) => deLaCuenta((cuenta) => {
				apuntar("ajustes.guardar", [cambios, version]);
				const actuales = ajustesDe(cuenta.id);
				if (version !== void 0 && version !== actuales.version) throw new ErrorDePlataforma(409, "ajustes_desactualizados", "Los ajustes han cambiado desde otro dispositivo.", "version");
				const nuevos = aplicar(actuales, cambios);
				ajustes.set(cuenta.id, nuevos);
				return structuredClone(nuevos);
			})
		},
		token: () => deLaCuenta((cuenta) => opciones.sinApi ? null : tokens.get(cuenta.id)?.api ?? `doble-api.${cuenta.id}`),
		tokenPlataforma: () => deLaCuenta((cuenta) => tokens.get(cuenta.id)?.plataforma ?? `doble-plataforma.${cuenta.id}`),
		tiempoReal: {
			get estado() {
				return estadoConexion;
			},
			alEvento: (oyente) => escuchar(oyentesDeEventos, oyente),
			alAviso: (oyente) => escuchar(oyentesDeAvisos, oyente),
			alCambiar(oyente) {
				oyentesDeConexion.add(oyente);
				oyente(estadoConexion);
				return () => oyentesDeConexion.delete(oyente);
			},
			sincronizar() {
				apuntar("tiempoReal.sincronizar", []);
			}
		},
		chat: {
			get noLeidos() {
				return noLeidos;
			},
			alCambiarNoLeidos(oyente) {
				oyentesDeNoLeidos.add(oyente);
				oyente(noLeidos);
				return () => oyentesDeNoLeidos.delete(oyente);
			},
			conversaciones: () => deLaCuenta(() => structuredClone(conversaciones)),
			directa: (idCuenta) => deLaCuenta(() => {
				const id = directas.get(idCuenta);
				if (id === void 0) throw new ErrorDePlataforma(403, "solo_entre_amistades", "Solo puedes escribir a tus amistades.");
				return id;
			}),
			abrir(idConversacion) {
				apuntar("chat.abrir", [idConversacion]);
				return false;
			},
			escribiendo(idConversacion) {
				apuntar("chat.escribiendo", [idConversacion]);
			}
		},
		espacios: {
			mios: () => deLaCuenta(() => structuredClone(espacios)),
			espacio: (id) => deLaCuenta(() => {
				const espacio = espacios.find((e) => e.id === id);
				if (!espacio) throw noEncontrado("espacio_no_encontrado", "Ese espacio no existe o ya no está.");
				return structuredClone(espacio);
			}),
			miembros: (id) => deLaCuenta(() => structuredClone(miembros.get(id) ?? [])),
			invitaciones: () => deLaCuenta(() => structuredClone(invitaciones)),
			porCodigo: (codigo) => deLaCuenta(() => {
				const invitacion = porCodigo.get(codigo);
				if (!invitacion) throw noEncontrado("invitacion_no_encontrada", "Esa invitación no existe, ha caducado o ya se respondió.");
				return structuredClone(invitacion);
			}),
			invitar: (id, a, rol) => deLaCuenta(() => {
				apuntar("espacios.invitar", [
					id,
					a,
					rol
				]);
				return { id: llamadas.length };
			}),
			aceptar: (idInvitacion) => deLaCuenta(() => {
				apuntar("espacios.aceptar", [idInvitacion]);
				return structuredClone(aceptar(invitaciones.find((i) => i.id === idInvitacion), "Esa invitación no existe, ha caducado o ya se respondió."));
			}),
			aceptarPorCodigo: (codigo) => deLaCuenta(() => {
				apuntar("espacios.aceptarPorCodigo", [codigo]);
				const espacio = aceptar(porCodigo.get(codigo), "Esa invitación no existe, ha caducado o ya se respondió.");
				porCodigo.delete(codigo);
				return structuredClone(espacio);
			}),
			async rechazar(idInvitacion) {
				await deLaCuenta(() => {
					apuntar("espacios.rechazar", [idInvitacion]);
					invitaciones = invitaciones.filter((i) => i.id !== idInvitacion);
				});
			},
			canal(id, oyente, opcionesDelCanal) {
				const oyentes = canales.get(id) ?? /* @__PURE__ */ new Set();
				canales.set(id, oyentes);
				let abierto = true;
				const recibir = (mensaje) => {
					if (abierto) oyente(mensaje);
				};
				queueMicrotask(() => {
					if (!abierto) return;
					oyente({
						tipo: "abierto",
						espacio: id,
						presentes: [...presentes.get(id) ?? []]
					});
					const desde = opcionesDelCanal?.desde;
					if (desde !== void 0) {
						for (const mensaje of historial.get(id) ?? []) if (mensaje.secuencia > desde) oyente(mensaje);
					}
					oyentes.add(recibir);
				});
				return {
					espacio: id,
					get presentes() {
						return [...presentes.get(id) ?? []];
					},
					cerrar() {
						abierto = false;
						oyentes.delete(recibir);
					}
				};
			},
			async verInvitaciones(opcionesDeLaVentana) {
				apuntar("espacios.verInvitaciones", [opcionesDeLaVentana]);
			}
		},
		encargos: {
			servicios: (tipo) => deLaCuenta(() => structuredClone(servicios.filter((s) => tipo === void 0 || s.tipo === tipo))),
			encargar: (pedido) => deLaCuenta(() => {
				apuntar("encargos.encargar", [pedido]);
				const creado = {
					id: `encargo-${encargos.length + 1}`,
					papel: "origen",
					origen: "esta-web",
					nombreOrigen: "Esta web",
					destino: pedido.destino,
					nombreDestino: servicios.find((s) => s.web === pedido.destino)?.nombre ?? pedido.destino,
					tipo: pedido.tipo,
					titulo: pedido.titulo,
					indicaciones: pedido.indicaciones ?? null,
					maximo: pedido.maximo ?? 1,
					idExterno: pedido.idExterno ?? null,
					volver: pedido.volver ?? null,
					estado: "pendiente",
					creado: (/* @__PURE__ */ new Date()).toISOString(),
					caduca: new Date(Date.now() + 6048e5).toISOString(),
					entregado: null,
					cerrado: null,
					archivos: [],
					abrir: null
				};
				encargos = [...encargos, creado];
				return {
					encargo: structuredClone(creado),
					abierto: false
				};
			}),
			ver: (id) => deLaCuenta(() => structuredClone(encargo(id))),
			listar: (filtro) => deLaCuenta(() => structuredClone(encargos.filter((e) => (!filtro?.papel || e.papel === filtro.papel) && (!filtro?.estado || e.estado === filtro.estado)))),
			imagenes: (id) => deLaCuenta(() => {
				encargo(id);
				return [];
			}),
			archivo: (id, papel, numero) => deLaCuenta(() => {
				apuntar("encargos.archivo", [
					id,
					papel,
					numero
				]);
				encargo(id);
				return null;
			}),
			ponerReferencia: (id, imagen) => deLaCuenta(() => {
				apuntar("encargos.ponerReferencia", [id, imagen]);
				return structuredClone(encargo(id));
			}),
			entregar: (id, imagenes) => deLaCuenta(() => {
				apuntar("encargos.entregar", [id, imagenes]);
				return structuredClone(encargo(id));
			}),
			recoger: (id) => deLaCuenta(() => {
				apuntar("encargos.recoger", [id]);
				return structuredClone(encargo(id));
			}),
			cancelar: (id) => deLaCuenta(() => {
				apuntar("encargos.cancelar", [id]);
				return structuredClone(encargo(id));
			}),
			alCambiar(oyente) {
				oyentesDeEncargos.add(oyente);
				return () => oyentesDeEncargos.delete(oyente);
			},
			delEnlace() {
				const busqueda = globalThis.location?.search ?? "";
				return new URLSearchParams(busqueda).get("encargo");
			},
			olvidarEnlace() {
				apuntar("encargos.olvidarEnlace", []);
			}
		},
		notificaciones: {
			get contadores() {
				return contadores;
			},
			alCambiarContadores(oyente) {
				oyentesDeContadores.add(oyente);
				oyente(contadores);
				return () => oyentesDeContadores.delete(oyente);
			},
			alLlegar(oyente) {
				oyentesDeNotificaciones.add(oyente);
				return () => oyentesDeNotificaciones.delete(oyente);
			},
			listar: (opcionesDelListado) => deLaCuenta(() => {
				apuntar("notificaciones.listar", [opcionesDelListado]);
				return structuredClone(pagina ?? {
					...contadores,
					notificaciones: [],
					cursor: null
				});
			}),
			async marcarVistas() {
				await deLaCuenta(() => {
					apuntar("notificaciones.marcarVistas", []);
					control.ponerContadores({
						...contadores,
						noVistas: 0
					});
				});
			},
			async marcarLeida(id) {
				await deLaCuenta(() => apuntar("notificaciones.marcarLeida", [id]));
			},
			async marcarTodasLeidas() {
				await deLaCuenta(() => {
					apuntar("notificaciones.marcarTodasLeidas", []);
					control.ponerContadores({
						noVistas: 0,
						noLeidas: 0
					});
				});
			}
		},
		async fetch(entrada, opcionesDeLaPeticion) {
			const empezada = generacion;
			const conToken = async () => {
				const token = await yosiftware.token();
				const cabeceras = new Headers(opcionesDeLaPeticion?.headers ?? (entrada instanceof Request ? entrada.headers : void 0));
				if (token) cabeceras.set("Authorization", `Bearer ${token}`);
				return fetchDeLaPagina(entrada, {
					...opcionesDeLaPeticion,
					headers: cabeceras
				});
			};
			let respuesta = await conToken();
			if (respuesta.status === 401 && generacion === empezada) respuesta = await conToken();
			if (generacion !== empezada) throw new CambioDeIdentidad();
			return respuesta;
		}
	};
	const control = {
		get estado() {
			return estado;
		},
		respuestas,
		llamadas,
		llamadasA: (metodo) => llamadas.filter((l) => l.metodo === metodo).map((l) => l.argumentos),
		terminarComprobacion(cuenta, extras) {
			cambiarEstado(cuenta ? conSesion(completar(cuenta), extras) : { tipo: "sin_sesion" });
		},
		iniciarSesion,
		cambioDesdeOtraPestana(cuenta, extras) {
			cambiarDeCuenta(cuenta ? completar(cuenta) : null, extras);
		},
		sesionCaducada() {
			cambiarEstado({ tipo: "sin_sesion" });
		},
		cuentaBorrada() {
			const id = idActiva();
			if (id !== null) guardadas.delete(id);
			cambiarDeCuenta(null);
		},
		normasDeUsoPendientes() {
			cambiarEstado({
				tipo: "sin_sesion",
				motivo: "normas_pendientes"
			});
		},
		noDisponible() {
			cambiarEstado({ tipo: "no_disponible" });
		},
		cambiarExtras(extras) {
			const cuenta = cuentaActiva();
			if (cuenta) cambiarEstado(conSesion(cuenta, extras));
		},
		ponerTokens(idCuenta, nuevos) {
			tokens.set(idCuenta, {
				...tokens.get(idCuenta),
				...nuevos
			});
		},
		ponerAjustes(idCuenta, documento, version = 1) {
			ajustes.set(idCuenta, {
				version,
				documento: structuredClone(documento)
			});
		},
		guardarDesdeOtroDispositivo(cambios, idCuenta) {
			const id = idCuenta ?? idActiva();
			if (id === null) throw new Error("Sin cuenta: pasa idCuenta.");
			const nuevos = aplicar(ajustesDe(id), cambios);
			ajustes.set(id, nuevos);
			return structuredClone(nuevos);
		},
		ajustesDe(idCuenta) {
			const id = idCuenta ?? idActiva();
			return id === null ? null : structuredClone(ajustesDe(id));
		},
		ponerPerfil(idCuenta, perfil) {
			perfiles.set(idCuenta, {
				...perfiles.get(idCuenta),
				...perfil
			});
		},
		emitir(tipo, datos = null) {
			if (estado.tipo !== "con_sesion") return null;
			secuencia += 1;
			const evento = {
				secuencia,
				tipo,
				datos,
				fecha: (/* @__PURE__ */ new Date()).toISOString()
			};
			avisar(oyentesDeEventos, evento);
			return evento;
		},
		avisar(aviso) {
			if (estado.tipo === "con_sesion") avisar(oyentesDeAvisos, aviso);
		},
		estadoTiempoReal(forzado) {
			estadoForzado = forzado;
			actualizarTiempoReal();
		},
		ponerEspacios(lista) {
			espacios = structuredClone(lista);
		},
		ponerMiembros(idEspacio, lista) {
			miembros.set(idEspacio, structuredClone(lista));
		},
		ponerInvitaciones(lista) {
			invitaciones = structuredClone(lista);
		},
		ponerInvitacionPorCodigo(codigo, invitacion) {
			porCodigo.set(codigo, structuredClone(invitacion));
		},
		publicarEnCanal(idEspacio, idExterno, datos) {
			const lista = historial.get(idEspacio) ?? [];
			historial.set(idEspacio, lista);
			const mensaje = {
				tipo: "mensaje",
				espacio: idEspacio,
				secuencia: (lista.at(-1)?.secuencia ?? 0) + 1,
				idExterno,
				datos: structuredClone(datos),
				fecha: (/* @__PURE__ */ new Date()).toISOString()
			};
			lista.push(mensaje);
			alCanal(idEspacio, mensaje);
			return mensaje;
		},
		enviarAlCanal(idEspacio, mensaje) {
			if (mensaje.tipo === "presencia" || mensaje.tipo === "abierto") presentes.set(idEspacio, [...mensaje.presentes]);
			alCanal(idEspacio, mensaje);
		},
		ponerPresentes(idEspacio, cuentas) {
			presentes.set(idEspacio, [...cuentas]);
			alCanal(idEspacio, {
				tipo: "presencia",
				espacio: idEspacio,
				presentes: [...cuentas]
			});
		},
		canalesAbiertos: (idEspacio) => canales.get(idEspacio)?.size ?? 0,
		ponerNoLeidos(valor) {
			noLeidos = valor;
			avisar(oyentesDeNoLeidos, noLeidos);
		},
		ponerConversaciones(lista) {
			conversaciones = structuredClone(lista);
		},
		ponerDirecta(idCuenta, idConversacion) {
			directas.set(idCuenta, idConversacion);
		},
		ponerContadores(nuevos) {
			contadores = { ...nuevos };
			avisar(oyentesDeContadores, contadores);
		},
		ponerNotificaciones(nueva) {
			pagina = structuredClone(nueva);
		},
		notificar(notificacion) {
			if (estado.tipo !== "con_sesion") return;
			avisar(oyentesDeNotificaciones, notificacion);
		},
		ponerServicios(lista) {
			servicios = structuredClone(lista);
		},
		ponerEncargos(lista) {
			encargos = structuredClone(lista);
		},
		cambioDeEncargo(cambio) {
			encargos = encargos.map((e) => e.id === cambio.encargo ? {
				...e,
				estado: cambio.estado
			} : e);
			avisar(oyentesDeEncargos, cambio);
		}
	};
	return {
		yosiftware,
		control
	};
}
/**
* Pone el doble en `window.yosiftware` (y su control en `window.yosiftwareDoble`), como el SDK al cargarse: para una
* página entera, en Playwright o en una prueba con DOM. Si ya había uno, lo sustituye.
*/
function instalarDobleYosiftware(opciones = {}) {
	const doble = crearDobleYosiftware(opciones);
	const global = globalThis;
	global.yosiftware = doble.yosiftware;
	global.yosiftwareDoble = doble.control;
	return doble;
}
//#endregion
//#region src/doble/index.ts
/**
* La entrada del doble del SDK (`ecosistema-kit/pruebas/yosiftware-doble.js`): `crearDobleYosiftware()` para una prueba
* unitaria e `instalarDobleYosiftware()` para una página. Como guion, si la página ya tiene `__YOSIFTWARE_DOBLE__` (las
* opciones, aunque sea `{}`), se instala solo en `window.yosiftware`, como el SDK al cargarse: así lo usa Playwright.
*/
var opciones = globalThis.__YOSIFTWARE_DOBLE__;
if (opciones !== void 0) instalarDobleYosiftware(opciones);
//#endregion
export { VERSION, crearDobleYosiftware, instalarDobleYosiftware };
