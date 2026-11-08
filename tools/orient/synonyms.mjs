// Puente entre como se pide una tarea (casi siempre en espanol) y como se nombra el codigo
// (casi siempre en ingles). Son equivalencias generales de programacion e interfaz, no de
// ninguna tarea: cada grupo junta palabras que significan lo mismo en el repositorio. Solo se
// aplican a la consulta; el codigo y el catalogo no se tocan.
import { tokens } from "./text.mjs";

// Cada linea es un grupo: sus palabras se consideran equivalentes entre si.
const GROUPS = `
desplazar desplazamiento scroll
seleccionar seleccion select selection
consola console
pestana tab tabs
ventana window
boton button
tabla table
columna column
fila registro row
celda cell
grilla rejilla grid
resultado result
consulta query
sentencia statement
ejecutar ejecucion run execute execution
cancelar cancel
conexion conectar connection connect
servidor server
contrasena password
archivo file
carpeta folder directory
guardar save
abrir open
cerrar close
copiar copy
pegar paste
buscar busqueda search find
reemplazar replace
filtrar filtro filter
ordenar orden sort order
paginar paginacion page pagination
exportar export
actualizar actualizacion update
motor engine
prueba test
aviso advertencia warning
mensaje message
idioma language locale
traducir traduccion translate translation
tema theme
atajo shortcut
teclado keyboard
arrastrar drag
soltar drop
mosaico tile
grupo group
barra bar
dialogo dialog modal
confirmar confirmacion confirm confirmation
borrar eliminar delete remove
insertar insert
editar edicion edit
vista view preview
esquema schema
historial history
sesion session
fuga leak
rendimiento performance
arranque startup boot
iniciar start
detener stop
resaltado resaltar highlight
sangria indent indentation
comentario comment
formato formatear format
completar autocompletar completion autocomplete
sugerencia suggestion
diagnostico diagnostic
analisis analizar analysis analyze
citar cita quote quoting
identificador identifier
cifrar encrypt
descargar download
publicar publish
lanzamiento release
compilar build
paralelo parallel
imagen image
recurso resource
firma firmar signature sign
paquete package
soporte support
linea line
nulo null
barra invertida backslash
cabecera header
terminal shell
panel pane panel
pantalla screen
mover move
borde edge
franja strip stripe
esquina corner
aplicar apply
cambios changes
cargar loading load
vacio empty
punto point
contexto context
menu menu
nombre name
tamano size
ancho width
alto height
`
  .trim()
  .split("\n");

// raiz -> raices equivalentes (sin incluirse a si misma)
export const SYNONYMS = new Map();
for (const line of GROUPS) {
  const words = [...new Set(line.split(/\s+/).flatMap((word) => tokens(word)))];
  for (const word of words) SYNONYMS.set(word, [...new Set([...(SYNONYMS.get(word) ?? []), ...words.filter((other) => other !== word)])]);
}

// La consulta ampliada: lo que dijo mas sus equivalentes. Sirve para buscar; la cobertura se
// sigue midiendo contra lo que realmente dijo.
export function expand(terms) {
  return [...terms, ...terms.flatMap((term) => SYNONYMS.get(term) ?? [])];
}
