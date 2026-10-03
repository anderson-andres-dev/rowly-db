// El inspector remoto de WebKitGTK (WEBKIT_INSPECTOR_HTTP_SERVER), para lo
// que WebDriver no da: forzar el recolector y medir el heap de JavaScript que
// sigue vivo. El PSS del WebKitWebProcess no sirve para eso: incluye memoria
// que el recolector ya libero y WebKit todavia no devolvio al sistema.
//
// El protocolo es el de Web Inspector: cada mensaje para la pagina va dentro
// de Target.sendMessageToTarget, y su respuesta vuelve en
// Target.dispatchMessageFromTarget.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// La pagina inspeccionable: el servidor HTTP lista cada una con el socket
// que la abre ("/socket/1/1/WebPage").
async function pageSocket(address) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const html = await fetch(`http://${address}/`).then(
      (response) => response.text(),
      () => "",
    );
    const path = html.match(/\/socket\/\d+\/\d+\/WebPage/)?.[0];
    if (path) return `ws://${address}${path}`;
    await sleep(100);
  }
  throw new Error(`el inspector de ${address} no lista ninguna pagina`);
}

async function open(address) {
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
  return { send, close: () => ws.close() };
}

// El heap de JavaScript que queda vivo tras recolectar dos veces: MB y
// objetos (snapshot de Heap: [id, tamaño, clase, flags] por nodo).
export async function liveHeap(address) {
  const inspector = await open(address);
  try {
    await inspector.send("Heap.gc");
    await sleep(300);
    await inspector.send("Heap.gc");
    const { snapshotData } = await inspector.send("Heap.snapshot");
    const nodes = JSON.parse(snapshotData).nodes;
    let bytes = 0;
    for (let index = 1; index < nodes.length; index += 4) bytes += nodes[index];
    return { mb: bytes / 1048576, objects: nodes.length / 4 };
  } finally {
    inspector.close();
  }
}
