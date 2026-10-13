export function errorHandler(error, request, response, _next) {
  if (error.type === "entity.parse.failed") return response.status(400).json({ message: "Request body must be valid JSON." });
  if (error.type === "entity.too.large") return response.status(413).json({ message: request.path.endsWith("/profile-photo") ? "Choose an image smaller than 10 MB." : "Message is too large." });
  if (error.name === "ValidationError" || error.name === "CastError") return response.status(400).json({ message: "Some fields are invalid. Please check your submission." });
  // Do not log request bodies, credentials, database URIs, or driver messages.
  console.error(`Portfolio API failed (${error.name}).`);
  response.status(500).json({ message: "Unable to complete your request. Please try again later." });
}
