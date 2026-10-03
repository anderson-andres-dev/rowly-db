// El inspector remoto de WebKitGTK (WEBKIT_INSPECTOR_HTTP_SERVER), para lo
// que WebDriver no da: forzar el recolector y medir el heap de JavaScript que
// sigue vivo. El PSS del WebKitWebProcess no sirve para eso: incluye memoria
// que el recolector ya libero y WebKit todavia no devolvio al sistema.
//
// No convive con WebDriver, que maneja la app por el mismo inspector: lo usa
// resources.mjs, que abre la app por su cuenta.
//
// El protocolo es el de Web Inspector: cada mensaje para la pagina va dentro
// de Target.sendMessageToTarget, y su respuesta vuelve en
// Target.dispatchMessageFromTarget.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// La pagina inspeccionable: el servidor HTTP lista cada una con el socket
// que la abre ("/socket/1/1/WebPage").
async function pageSocket(address) {
  // Una build debug recien compilada tarda en abrir la ventana.
  let html = null;
  for (let attempt = 0; attempt < 300; attempt += 1) {
    html = await fetch(`http://${address}/`).then(
      (response) => response.text(),
      () => null,
    );
    const path = html?.match(/\/socket\/\d+\/\d+\/WebPage/)?.[0];
    if (path) return `ws://${address}${path}`;
    await sleep(100);
  }
  const answer = html === null ? "no respondio" : `respondio sin paginas: ${html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200)}`;
  throw new Error(`el inspector de ${address} no listo ninguna pagina en 30 s (${answer})`);
}

// Una conexion a la pagina: `send` para cualquier metodo del protocolo y
// `evaluate` para correr JavaScript en ella y traer el resultado.
export async function connectInspector(address) {
  const ws = new WebSocket(await pageSocket(address));
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error(`no se pudo abrir el inspector de ${address}`));
  });
  const pending = new Map();
  let target = null;
  let targetReady;
  const ready = new Promise((resolve) => (targetReady = resolve));
  ws.onmessage = (raw) => {
    const message = JSON.parse(raw.data);
    if (message.method === "Target.targetCreated") {
      target = message.params.targetInfo.targetId;
      targetReady();
    } else if (message.method === "Target.dispatchMessageFromTarget") {
      const inner = JSON.parse(message.params.message);
      const waiting = inner.id && pending.get(inner.id);
      if (!waiting) return;
      pending.delete(inner.id);
      if (inner.error) waiting.reject(new Error(`${inner.error.message ?? JSON.stringify(inner.error)}`));
      else waiting.resolve(inner.result);
    }
  };
  await ready;
  let id = 0;
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      id += 1;
      pending.set(id, { resolve, reject });
      ws.send(
        JSON.stringify({
          id,
          method: "Target.sendMessageToTarget",
          params: { targetId: target, message: JSON.stringify({ id, method, params }) },
        }),
      );
    });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.wasThrown) throw new Error(`${expression.slice(0, 80)}: ${JSON.stringify(result.result)}`);
    return result.result.value;
  };
  return { send, evaluate, close: () => ws.close() };
}

// El heap de JavaScript que queda vivo tras recolectar dos veces: MB,
// objetos y cuantos de cada clase (snapshot de Heap: [id, tamaño, clase,
// flags] por nodo).
export async function liveHeap(inspector) {
  await inspector.send("Heap.gc");
  await sleep(300);
  await inspector.send("Heap.gc");
  const { snapshotData } = await inspector.send("Heap.snapshot");
  const { nodes, nodeClassNames } = JSON.parse(snapshotData);
  let bytes = 0;
  // Por clase, para decir que crecio si algo crece.
  const classes = {};
  for (let index = 0; index < nodes.length; index += 4) {
    bytes += nodes[index + 1];
    const name = nodeClassNames[nodes[index + 2]];
    const entry = (classes[name] ??= { count: 0, bytes: 0 });
    entry.count += 1;
    entry.bytes += nodes[index + 1];
  }
  return { mb: bytes / 1048576, objects: nodes.length / 4, classes };
}
