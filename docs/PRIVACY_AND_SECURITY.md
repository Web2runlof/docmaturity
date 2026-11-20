# Privacidad y seguridad

> Los datos de los diagnósticos se almacenan localmente en este navegador. No existe sincronización automática entre dispositivos. La protección de la información depende también de las condiciones de seguridad del dispositivo y de los canales utilizados para compartir archivos.

## 1. Principios

- **Minimización**: participantes identificados por código o seudónimo; el nombre es opcional y solo con autorización. No se piden correos, documentos de identidad ni datos de contacto.
- **Localidad**: sin servidor, sin cuentas, sin base de datos remota, sin sincronización, sin telemetría ni rastreadores.
- **Control del usuario**: la información solo sale del dispositivo cuando el evaluador o el entrevistado exportan un archivo.
- **Transparencia**: los límites de cada mecanismo se informan en la interfaz.
- **Origen compartido**: el navegador aísla IndexedDB y el almacenamiento local por origen (protocolo, dominio y puerto), no por ruta. En la publicación de demostración el origen es `web2runlof.github.io`, compartido con cualquier otra página publicada bajo ese dominio, que podría leer esos datos. Para información real se recomienda publicar en un dominio propio (variable `CUSTOM_DOMAIN`, ver [DEPLOYMENT.md](DEPLOYMENT.md)) o usar un perfil de navegador dedicado. La página Privacidad de la aplicación lo explica.

## 2. Controles implementados

| Riesgo | Control |
|---|---|
| Envío no autorizado de datos | CSP `connect-src 'self'`; sin analítica, fuentes ni scripts remotos. Prueba e2e que verifica que no hay peticiones externas. |
| XSS | React sin HTML arbitrario; regla ESLint que prohíbe `dangerouslySetInnerHTML`; `script-src 'self'`; textos libres saneados de caracteres de control. |
| Archivos manipulados | Validación Zod de cada paquete; rechazo de claves `__proto__`, `constructor` y `prototype`; verificación de versión, identificadores, preguntas autorizadas, valores 0–5 y hash SHA-256. |
| Archivos excesivos | Límites por tipo de paquete y de 5 MB por adjunto; logos de hasta 300 KB. |
| Inyección de fórmulas | Celdas que empiezan por `=`, `+`, `-`, `@`, tabulación o retorno se prefijan con apóstrofo en XLSX y CSV. |
| Pérdida de datos | Copias de seguridad completas, aviso de respaldo desactualizado, solicitud de almacenamiento persistente, mensajes de cuota, confirmación para restaurar y borrar. |
| Exposición en URLs | Las rutas usan identificadores aleatorios (UUID); no contienen nombres ni datos. `referrer` en `no-referrer`. |
| Registros | La auditoría local registra acciones y entidades, no contraseñas ni contenido de evidencias. |

## 3. Cifrado de archivos exportados

- Web Crypto API; no se implementan algoritmos propios.
- AES-GCM con clave de 256 bits y etiqueta de 128 bits.
- Clave derivada con PBKDF2-SHA-256, **310.000 iteraciones** y salt aleatorio de 16 bytes.
- IV aleatorio de 12 bytes, nuevo en cada cifrado.
- Formato versionado (`docmaturity.encrypted`, versión 1).
- Contraseña mínima de 10 caracteres; nunca se guarda.
- Una contraseña incorrecta produce un error explícito sin revelar contenido.

**Advertencias que muestra la aplicación:** si se pierde la contraseña, el archivo no puede recuperarse; proteger un archivo exportado **no** cifra los datos guardados en el navegador.

## 4. Hash y autenticidad

El hash SHA-256 de los paquetes permite detectar alteraciones accidentales o corrupción. **No es una firma digital**: no acredita la identidad ni la autoría de quien generó el archivo. DOCMATURITY no afirma que los archivos estén firmados.

## 5. Evidencias

Se recomienda registrar la **referencia** a la evidencia (código, ubicación, sistema) en lugar de adjuntarla. No adjunte historias clínicas, expedientes reservados, credenciales ni información personal innecesaria. Los adjuntos permanecen en el navegador, se incluyen en el respaldo completo y se excluyen de los paquetes de evaluación.

## 6. Asistente de IA opcional

- No hay proveedor conectado, claves ni proxies.
- El prompt se anonimiza por defecto (sin nombre de la organización, NIT, sedes ni participantes) y no incluye justificaciones a menos que el evaluador lo active.
- El evaluador decide en qué herramienta autorizada usarlo; el texto que pegue de vuelta se revisa, se aprueba explícitamente y se marca como «generado externamente mediante IA».

## 7. Modos de trabajo

El modo evaluador y el modo entrevistado son modos de interfaz, no roles autenticados. Cualquier persona con acceso al navegador puede ver sus datos. Use perfiles de navegador separados, bloqueo del dispositivo y cifrado de disco según las políticas de su organización.

## 8. Responsabilidad

La aplicación no sustituye el análisis institucional de protección de datos personales (en Colombia, Ley 1581 de 2012 y sus normas reglamentarias, entre otras). Para información especialmente sensible, use un entorno institucional autorizado, controles del dispositivo y procedimientos de tratamiento aprobados.

## 9. Reporte de vulnerabilidades

Abra un *issue* privado o contacte al mantenedor del repositorio sin publicar detalles explotables.
