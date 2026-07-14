# Autenticacion - Bugs y mejoras acotadas

## Pendiente

- Ninguno registrado.

## En curso

- Ninguno registrado.

## Finalizado

- [x] Invalidar de forma segura las sesiones persistidas cuyo token o usuario ya no existen en la API, evitando loaders bloqueados tras reinicios de la base de datos.
- [x] Evitar bucles al refrescar el estado de acceso y revertir por completo el inicio de sesión si la API impide cargar la biblioteca inicial.
- [x] Simplificar el alta publica derivando nombre, nombre visible y pais desde el alias y el perfil posterior.
- [x] Mostrar frases aleatorias especificas de login en el loader.
- [x] Mejorar la experiencia de inicio de sesion evitando que el formulario se limpie y muestre errores justo antes de entrar.
- [x] Iniciar sesion automaticamente tras confirmar recuperacion de contrasena con tokens devueltos por la API.
- [x] Permitir abrir el formulario publico de reset aunque exista una sesion local.
- [x] Mostrar que requisitos de contrasena faltan cuando el registro marca la contrasena como invalida.
