import { createApp } from "./app.js";
import { createStore } from "./store.js";
import { validateEnvironment } from "../config/environment.js";

const { port } = validateEnvironment();

let store;
try {
  store = createStore();
  await store.read();
} catch (error) {
  console.error(`Portfolio storage could not be initialized (${error.name}). Check database credentials and network access.`);
  await store?.close();
  process.exit(1);
}

const server = createApp({ store }).listen(port, () => {
  console.log(`Portfolio backend running at http://localhost:${port}`);
});

server.on("error", (error) => {
  console.error(`Backend failed to start: ${error.message}`);
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(async () => { await store.close(); process.exit(0); }));
}
