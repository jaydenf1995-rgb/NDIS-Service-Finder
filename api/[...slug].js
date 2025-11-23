import app from '../server.js';

// Vercel serverless function handler - catch-all for all API routes
// The [...slug] pattern matches all paths under /api/
export default function handler(req, res) {
  // Reconstruct the full path with /api prefix
  // Vercel passes the matched segments in req.query.slug as an array
  const slug = req.query.slug;
  const pathSegments = Array.isArray(slug) ? slug : (slug ? [slug] : []);
  const apiPath = '/api/' + pathSegments.join('/');
  
  // Preserve query parameters (excluding 'slug' which is the path parameter)
  const queryParams = { ...req.query };
  delete queryParams.slug; // Remove slug from query params
  
  // Build query string from remaining params
  const queryString = Object.keys(queryParams).length > 0
    ? '?' + new URLSearchParams(queryParams).toString()
    : '';
  
  // Update the request URL to include /api prefix and query string
  req.url = apiPath + queryString;
  req.originalUrl = req.url;
  
  // Log for debugging
  console.log(`[API Handler] ${req.method} ${req.url}`);
  
  // Pass request to Express app
  return app(req, res);
}

