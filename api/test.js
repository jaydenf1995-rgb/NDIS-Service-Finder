export default function handler(request, response) {
  response.status(200).json({
    message: "API is working!",
    timestamp: new Date().toISOString(),
    method: request.method
  });
}
