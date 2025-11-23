import app from '../server.js';

// Vercel serverless function handler - catch-all for all API routes
// The [...] pattern matches all paths under /api/
export default function handler(req, res) {
  // Store original for debugging
  const originalUrl = req.url;
  
  // Extract path and query string
  const urlParts = (req.url || '/').split('?');
  let pathOnly = urlParts[0] || '/';
  const queryString = urlParts[1] ? '?' + urlParts[1] : '';
  
  // Ensure path starts with /api for Express routes
  // Vercel routes /api/* to this handler, so path might be relative or absolute
  if (!pathOnly.startsWith('/api')) {
    // Add /api prefix if missing
    pathOnly = '/api' + (pathOnly.startsWith('/') ? pathOnly : '/' + pathOnly);
  }
  
  // Reconstruct full URL with query string
  req.url = pathOnly + queryString;
  req.originalUrl = req.url;
  
  // Log for debugging
  console.log(`[API Handler] ${req.method} ${req.url} (original: ${originalUrl})`);
  
  // Pass to Express app
  return app(req, res);
}

