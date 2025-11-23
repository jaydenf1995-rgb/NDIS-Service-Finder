import app from '../server.js';

// Vercel serverless function handler - catch-all for all API routes
export default async (req, res) => {
  return app(req, res);
};

