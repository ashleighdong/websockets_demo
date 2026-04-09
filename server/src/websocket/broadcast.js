/** @param {import("ws").WebSocketServer} wss */
export function broadcastJson(wss, payload) {
  const data = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === 1 /* OPEN */) {
      client.send(data);
    }
  }
}
