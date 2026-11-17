// Mundoria offline: guarda o que já foi carregado para o jogo abrir sem internet.
// Código (assets/, com hash no nome): cache primeiro. Artes e sons: mostra o guardado
// e atualiza por trás. Página e listas: rede primeiro, cache se estiver sem internet.
const CACHE = "mundoria-v2";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./", "./index.html", "./manifest.webmanifest", "./sons/lista.json"]).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith("mundoria-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const p = url.pathname;
  if (/\/assets\//.test(p)) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((r) => {
            if (r.ok) {
              const copy = r.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return r;
          }),
      ),
    );
    return;
  }
  if (/\/(art|sons|icons)\//.test(p) && !p.endsWith("lista.json")) {
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(req).then((hit) => {
          const net = fetch(req)
            .then((r) => {
              if (r.ok && r.status === 200) c.put(req, r.clone());
              return r;
            })
            .catch(() => hit);
          return hit || net;
        }),
      ),
    );
    return;
  }
  e.respondWith(
    fetch(req)
      .then((r) => {
        if (r.ok) {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return r;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html"))),
  );
});
