import { createApp } from "./app.js";

const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

const server = createApp().listen(port, () => {
  console.log(`Portfolio backend running at http://localhost:${port}`);
});

server.on("error", (error) => {
  console.error(`Backend failed to start: ${error.message}`);
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
