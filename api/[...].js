import app from '../server.js';

// Vercel serverless function handler - catch-all for all API routes
// The [...] pattern matches all paths under /api/
export default function handler(req, res) {
  // With Vercel's [...] catch-all, the full path is preserved in req.url
  // But we need to ensure it starts with /api for Express routes to match
  
  const originalUrl = req.url || req.originalUrl || '/';
  
  // Ensure the URL starts with /api prefix
  // Vercel routes /api/* to this handler, so the path should include /api
  if (!originalUrl.startsWith('/api')) {
    req.url = '/api' + (originalUrl.startsWith('/') ? originalUrl : '/' + originalUrl);
  } else {
    req.url = originalUrl;
  }
  
  // Set originalUrl for Express
  req.originalUrl = req.url;
  
  // Preserve query string if present
  const queryIndex = originalUrl.indexOf('?');
  if (queryIndex !== -1 && !req.url.includes('?')) {
    req.url += originalUrl.substring(queryIndex);
    req.originalUrl = req.url;
  }
  
  // Log for debugging
  console.log(`[API Handler] ${req.method} ${req.url}`);
  
  // Pass request to Express app
  return app(req, res);
}

