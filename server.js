import dotenv from 'dotenv';
dotenv.config();
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import nodemailer from "nodemailer";
import { createClient } from '@vercel/postgres';

// Conditionally import Vercel Blob (only if available)
let blobPut = null;
let blobDel = null;
let blobAvailable = false;

try {
  const blobModule = await import('@vercel/blob');
  blobPut = blobModule.put;
  blobDel = blobModule.del;
  blobAvailable = true;
  console.log('✅ Vercel Blob Storage available');
} catch (err) {
  console.warn('⚠️ @vercel/blob package not installed. Blob storage will be disabled.');
  console.warn('⚠️ To enable persistent storage, run: npm install @vercel/blob');
  console.warn('⚠️ Images will be stored locally (ephemeral on Vercel without blob storage)');
}

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Vercel Postgres client (only if connection string is available)
let db = null;
try {
  // Check if Postgres environment variables are available
  if (process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING) {
    db = createClient();
    console.log('✅ Vercel Postgres client initialized');
  } else {
    console.warn('⚠️ Postgres environment variables not found. Reviews feature will be disabled.');
  }
} catch (err) {
  console.warn('⚠️ Could not initialize Postgres client:', err.message);
  db = null;
}

// File paths - handle both local and Vercel
// On Vercel, process.env.VERCEL is set to "1" (string)
const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true" || process.env.VERCEL === true;
const getFilePath = (filename) => {
  if (isVercel) {
    // Ensure /tmp exists on Vercel
    const tmpDir = "/tmp";
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch (err) {
      console.warn("Could not create /tmp directory:", err.message);
    }
    return path.join(tmpDir, filename);
  } else {
    // For local development, use project root
    return path.join(__dirname, filename);
  }
};

const SERVICES_FILE = getFilePath("services.json");
const PENDING_FILE = getFilePath("pending.json");
const REVIEWS_FILE = getFilePath("reviews.json");
const SUBSCRIBERS_FILE = getFilePath("subscribers.json");
const PREMIUM_FILE = getFilePath("premium-subscriptions.json");
const USERS_FILE = getFilePath("users.json");

// Sync services.json bidirectionally on startup
// This ensures public/services.json (used by frontend) is always in sync
const syncServicesOnStartup = () => {
  const publicServicesPath = path.join(__dirname, "public", "services.json");
  
  try {
    let servicesFromMain = [];
    let servicesFromPublic = [];
    
    // Read from main services file (SERVICES_FILE)
    if (fs.existsSync(SERVICES_FILE)) {
      try {
        const content = fs.readFileSync(SERVICES_FILE, "utf-8");
        if (content && content.trim()) {
          servicesFromMain = JSON.parse(content);
        }
      } catch (err) {
        console.warn("⚠️ Could not read main services file:", err.message);
      }
    }
    
    // Read from public/services.json
    if (fs.existsSync(publicServicesPath)) {
      try {
        const content = fs.readFileSync(publicServicesPath, "utf-8");
        if (content && content.trim()) {
          servicesFromPublic = JSON.parse(content);
        }
      } catch (err) {
        console.warn("⚠️ Could not read public services file:", err.message);
      }
    }
    
    // Use whichever has more services (likely the most up-to-date)
    // Or prefer SERVICES_FILE if it exists and has data
    let servicesToUse = servicesFromMain;
    if (servicesFromPublic.length > servicesFromMain.length) {
      servicesToUse = servicesFromPublic;
      // Also update SERVICES_FILE
      if (fs.existsSync(SERVICES_FILE)) {
        fs.writeFileSync(SERVICES_FILE, JSON.stringify(servicesToUse, null, 2));
      }
    }
    
    // Always ensure public/services.json is synced (frontend needs this)
    if (servicesToUse.length > 0) {
      const publicDir = path.dirname(publicServicesPath);
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      fs.writeFileSync(publicServicesPath, JSON.stringify(servicesToUse, null, 2));
      console.log(`✅ Synced ${servicesToUse.length} services to public/services.json on startup`);
    }
  } catch (err) {
    console.warn("⚠️ Error syncing services on startup:", err.message);
  }
};

// For local dev, also sync pending.json if it exists in root
if (!isVercel) {
  const rootPendingPath = path.join(__dirname, "pending.json");
  if (fs.existsSync(rootPendingPath)) {
    try {
      const rootPending = fs.readFileSync(rootPendingPath, "utf-8");
      fs.writeFileSync(PENDING_FILE, rootPending);
      console.log("✅ Synced pending.json from root folder");
    } catch (err) {
      console.warn("⚠️ Could not sync pending.json:", err.message);
    }
  }
}

// Run sync on startup
syncServicesOnStartup();

// Ensure JSON files exist in /tmp (writable directory on Vercel)
const ensureFilesExist = () => {
  try {
    // Ensure /tmp directory exists
    if (isVercel) {
      const tmpDir = "/tmp";
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    }
    
    // Create files if they don't exist
    const files = [
      SERVICES_FILE,
      PENDING_FILE,
      REVIEWS_FILE,
      SUBSCRIBERS_FILE,
      PREMIUM_FILE,
      USERS_FILE
    ];
    
    files.forEach(file => {
      try {
        if (!fs.existsSync(file)) {
          fs.writeFileSync(file, "[]", "utf-8");
        }
      } catch (err) {
        console.warn(`Could not create ${file}:`, err.message);
      }
    });
  } catch (err) {
    console.warn("Error ensuring files exist:", err.message);
  }
};

ensureFilesExist();

// Multer setup for Vercel (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Email configuration (same as before)
const createEmailTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ Email credentials not configured. Email notifications will be disabled.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const emailTransporter = createEmailTransporter();
const isEmailConfigured = () => emailTransporter !== null;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images from /tmp/uploads on Vercel (before static middleware)
app.get("/uploads/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Try multiple possible locations
    const possiblePaths = [];
    
    if (isVercel) {
      // On Vercel, try /tmp/uploads first (ephemeral, but might exist)
      possiblePaths.push(path.join("/tmp", "uploads", filename));
      // Also try public/uploads as fallback (if files were synced there)
      possiblePaths.push(path.join(__dirname, "public", "uploads", filename));
    } else {
      // Local development - serve from public/uploads
      possiblePaths.push(path.join(__dirname, "public", "uploads", filename));
    }
    
    // Try each path until we find the file
    let filePath = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        filePath = testPath;
        break;
      }
    }
    
    if (filePath) {
      // Set proper content type based on file extension
      const ext = path.extname(filename).toLowerCase();
      const contentTypeMap = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml'
      };
      const contentType = contentTypeMap[ext] || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      res.sendFile(filePath);
    } else {
      console.warn(`Image not found: ${filename}. Tried paths:`, possiblePaths);
      res.status(404).json({ 
        error: "Image not found",
        filename: filename,
        triedPaths: possiblePaths
      });
    }
  } catch (err) {
    console.error("Error serving image:", err);
    res.status(500).json({ error: "Failed to serve image", message: err.message });
  }
});

// Serve static files from public directory
// This will also serve files from public/uploads if they exist there
app.use(express.static(path.join(__dirname, "public"), {
  // Serve uploads with proper caching
  setHeaders: (res, filePath) => {
    if (filePath.includes('uploads')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    }
  }
}));

// Global error handler for unhandled errors
app.use((err, req, res, next) => {
  console.error("Global error handler caught:", err);
  console.error("Error stack:", err.stack);
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error", message: err.message });
  }
});

// Initialize database table for reviews
async function initReviewsTable() {
  if (!db) {
    console.warn('⚠️ Skipping reviews table initialization - Postgres not configured');
    return;
  }
  try {
    await db.sql`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        provider_name VARCHAR(255) NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT NOT NULL,
        author VARCHAR(255) NOT NULL,
        service_id INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('✅ Reviews table initialized');
  } catch (error) {
    console.error('Error initializing reviews table:', error);
  }
}

// Updated Admin authentication middleware - checks both username and password
const authenticateAdmin = (req, res, next) => {
  try {
    // Safely extract username and password from query parameters
    const adminUsername = req.query.username;
    const adminPassword = req.query.password;
    
    const expectedUsername = process.env.ADMIN_USERNAME || "admin";
    const expectedPassword = process.env.ADMIN_PASSWORD || "admin123";
    
    console.log(`[Auth] Attempting admin login - Username: ${adminUsername}, Expected: ${expectedUsername}`);
    
    if (!adminUsername || !adminPassword) {
      console.warn("[Auth] Admin access attempted without username or password");
      return res.status(401).json({ error: "Unauthorized. Admin access requires both username and password." });
    }
    
    if (adminUsername !== expectedUsername) {
      console.warn(`[Auth] Admin access attempted with incorrect username: ${adminUsername}`);
      return res.status(401).json({ error: "Unauthorized. Admin access required." });
    }
    
    if (adminPassword !== expectedPassword) {
      console.warn("[Auth] Admin access attempted with incorrect password");
      return res.status(401).json({ error: "Unauthorized. Admin access required." });
    }
    
    // Both username and password match, proceed
    console.log("[Auth] Admin authentication successful");
    next();
  } catch (err) {
    console.error("[Auth] Error in authenticateAdmin middleware:", err);
    console.error("[Auth] Error message:", err.message);
    console.error("[Auth] Error stack:", err.stack);
    return res.status(500).json({ error: "Authentication error: " + (err.message || "Unknown error") });
  }
};

// Routes (keep all your existing routes, but update review-related ones)

// Get reviews for a service (UPDATED for Vercel Postgres)
app.get("/api/service/:id/reviews", async (req, res) => {
  if (!db) {
    return res.json([]); // Return empty array if Postgres not configured
  }
  try {
    const result = await db.sql`
      SELECT * FROM reviews 
      WHERE service_id = ${parseInt(req.params.id)}
      ORDER BY created_at DESC
    `;
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read reviews." });
  }
});

// Add a review (UPDATED for Vercel Postgres)
app.post("/api/service/:id/reviews", async (req, res) => {
  if (!db) {
    return res.status(503).json({ error: "Reviews feature is not available. Postgres not configured." });
  }
  try {
    const services = JSON.parse(fs.readFileSync(SERVICES_FILE, "utf-8"));
    const service = services.find((s) => String(s.id) === req.params.id);
    
    if (!service) return res.status(404).json({ error: "Service not found" });

    const result = await db.sql`
      INSERT INTO reviews (provider_name, rating, comment, author, service_id)
      VALUES (${service.name}, ${req.body.rating}, ${req.body.comment}, ${req.body.author || "Anonymous"}, ${parseInt(req.params.id)})
      RETURNING *
    `;

    res.json({
      success: true,
      message: "Review submitted!",
      review: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit review." });
  }
});

// Serve services.json (for frontend compatibility)
app.get("/services.json", (req, res) => {
  try {
    if (fs.existsSync(SERVICES_FILE)) {
      const services = fs.readFileSync(SERVICES_FILE, "utf-8");
      res.setHeader('Content-Type', 'application/json');
      res.send(services);
    } else {
      res.json([]);
    }
  } catch (err) {
    console.error("Error serving services.json:", err);
    res.status(500).json({ error: "Failed to read services." });
  }
});

// Search approved services (UPDATED to include Postgres reviews)
app.get("/api/search", async (req, res) => {
  try {
    const services = JSON.parse(fs.readFileSync(SERVICES_FILE, "utf-8"));

    const servicesWithRatings = await Promise.all(services.map(async (service) => {
      let averageRating = 0;
      let reviewCount = 0;
      
      if (db) {
        try {
          const reviewsResult = await db.sql`
            SELECT rating FROM reviews WHERE service_id = ${service.id}
          `;
          const serviceReviews = reviewsResult.rows;
          reviewCount = serviceReviews.length;
          averageRating = serviceReviews.length > 0
            ? serviceReviews.reduce((sum, review) => sum + review.rating, 0) / serviceReviews.length
            : 0;
        } catch (err) {
          console.error(`Error fetching reviews for service ${service.id}:`, err);
        }
      }

      return {
        ...service,
        averageRating: Math.round(averageRating * 10) / 10,
        reviewCount: reviewCount,
        isFeatured: service.isPremium || false
      };
    }));

    // Sort: premium services first, then by rating/reviews
    servicesWithRatings.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      if (a.averageRating !== b.averageRating) return b.averageRating - a.averageRating;
      return b.reviewCount - a.reviewCount;
    });

    const q = (req.query.q || "").toLowerCase();
    let results = servicesWithRatings;
    if (q) {
      results = servicesWithRatings.filter(
        (s) =>
          (s.name || "").toLowerCase().includes(q) ||
          (s.location || "").toLowerCase().includes(q) ||
          (s.category || []).some((c) => c.toLowerCase().includes(q)) ||
          (s.description || "").toLowerCase().includes(q)
      );
    }
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read services." });
  }
});

// Get single service with reviews (UPDATED for Postgres)
app.get("/api/service/:id", async (req, res) => {
  try {
    const services = JSON.parse(fs.readFileSync(SERVICES_FILE, "utf-8"));
    const service = services.find((s) => String(s.id) === req.params.id);
    if (!service) return res.status(404).json({ error: "Service not found" });

    let serviceReviews = [];
    let averageRating = 0;
    
    if (db) {
      try {
        const reviewsResult = await db.sql`
          SELECT * FROM reviews WHERE service_id = ${parseInt(req.params.id)} ORDER BY created_at DESC
        `;
        serviceReviews = reviewsResult.rows;
        averageRating = serviceReviews.length > 0
          ? serviceReviews.reduce((sum, review) => sum + review.rating, 0) / serviceReviews.length
          : 0;
      } catch (err) {
        console.error(`Error fetching reviews for service ${req.params.id}:`, err);
      }
    }

    res.json({
      ...service,
      reviews: serviceReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      reviewCount: serviceReviews.length,
      isFeatured: service.isPremium || false
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read service." });
  }
});

// Add new service (to pending.json)
app.post("/api/add", upload.single("photo"), async (req, res) => {
  try {
    const { name, email, phone, location, address, services, registered, description, aboutMe } = req.body;
    
    // Validate required fields
    if (!name || !email || !phone || !location || !address || !registered || !description) {
      return res.status(400).json({
        success: false,
        error: "Please fill in all required fields."
      });
    }

    // Parse services array (can be single value or array from form)
    let servicesArray = [];
    if (Array.isArray(services)) {
      servicesArray = services;
    } else if (services) {
      servicesArray = [services];
    }

    if (servicesArray.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Please select at least one service type."
      });
    }

    // Handle photo upload
    let photoPath = "";
    if (req.file) {
      const timestamp = Date.now();
      const ext = path.extname(req.file.originalname) || ".jpg";
      const filename = `service-${timestamp}-${Math.floor(Math.random() * 1000000)}${ext}`;
      
      try {
        // Use Vercel Blob Storage if available and BLOB_READ_WRITE_TOKEN is set
        if (blobAvailable && process.env.BLOB_READ_WRITE_TOKEN && blobPut) {
          // Upload to Vercel Blob Storage (persistent)
          const blob = await blobPut(filename, req.file.buffer, {
            access: 'public',
            contentType: req.file.mimetype || `image/${ext.slice(1)}`,
          });
          photoPath = blob.url;
          console.log(`✅ Uploaded image to Vercel Blob Storage: ${blob.url}`);
        } else if (isVercel) {
          // Fallback: On Vercel without blob token, save to /tmp/uploads (ephemeral)
          const uploadDir = path.join("/tmp", "uploads");
          if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
          const filePath = path.join(uploadDir, filename);
          fs.writeFileSync(filePath, req.file.buffer);
          console.log(`⚠️ Saved image to /tmp/uploads/${filename} (ephemeral - set BLOB_READ_WRITE_TOKEN for persistent storage)`);
          photoPath = `/uploads/${filename}`;
        } else {
          // Local development - save to public/uploads
          const uploadDir = path.join(__dirname, "public", "uploads");
          if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
          const filePath = path.join(uploadDir, filename);
          fs.writeFileSync(filePath, req.file.buffer);
          console.log(`✅ Saved image to public/uploads/${filename}`);
          photoPath = `uploads/${filename}`;
        }
      } catch (uploadError) {
        console.error("Error uploading image:", uploadError);
        // Continue without photo if upload fails
        photoPath = "";
      }
    }

    // Read existing pending services
    let pendingServices = [];
    if (fs.existsSync(PENDING_FILE)) {
      try {
        pendingServices = JSON.parse(fs.readFileSync(PENDING_FILE, "utf-8"));
      } catch (err) {
        console.warn("Could not read pending.json, starting fresh:", err.message);
        pendingServices = [];
      }
    }

    // Create new pending service
    const newService = {
      id: Date.now(),
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      location: location.trim(),
      address: address.trim(),
      services: servicesArray,
      registered: registered,
      description: description.trim(),
      aboutMe: aboutMe ? aboutMe.trim() : "",
      photo: photoPath,
      dateAdded: new Date().toISOString(),
      status: "pending"
    };

    pendingServices.push(newService);

    // Save to pending.json
    fs.writeFileSync(PENDING_FILE, JSON.stringify(pendingServices, null, 2));

    // Send email notification to admin if configured
    if (isEmailConfigured() && process.env.ADMIN_EMAIL) {
      try {
        await emailTransporter.sendMail({
          from: process.env.EMAIL_USER,
          to: process.env.ADMIN_EMAIL,
          subject: `New Service Submission: ${name}`,
          html: `
            <h2>New Service Submission</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Location:</strong> ${location}</p>
            <p><strong>Services:</strong> ${servicesArray.join(", ")}</p>
            <p><strong>NDIS Registered:</strong> ${registered}</p>
            <p><strong>Description:</strong> ${description}</p>
            <p>Please review and approve this service in the admin panel.</p>
          `
        });
      } catch (emailErr) {
        console.warn("Failed to send email notification:", emailErr.message);
      }
    }

    res.json({
      success: true,
      message: "Service submitted successfully. It will be reviewed before going live."
    });
  } catch (err) {
    console.error("Error submitting service:", err);
    res.status(500).json({
      success: false,
      error: "Failed to submit service: " + err.message
    });
  }
});

// User Registration - FIXED VERSION
app.post("/api/register", (req, res) => {
  try {
    // ... keep your existing registration code exactly as is ...
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Failed to create account: " + err.message });
  }
});

// User Login - FIXED VERSION
app.post("/api/login", (req, res) => {
  try {
    // ... keep your existing login code exactly as is ...
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Failed to login: " + err.message });
  }
});

// Get pending services (admin only)
app.get("/api/admin/pending", authenticateAdmin, (req, res) => {
  // Wrap everything in a try-catch to prevent any unhandled errors
  try {
    console.log(`[Admin] Loading pending services from: ${PENDING_FILE}`);
    let pendingServices = [];
    
    // Ensure the directory exists
    try {
      const fileDir = path.dirname(PENDING_FILE);
      console.log(`[Admin] Checking directory: ${fileDir}`);
      // On Vercel, /tmp should always exist, but check anyway
      if (!fs.existsSync(fileDir)) {
        console.log(`[Admin] Creating directory: ${fileDir}`);
        fs.mkdirSync(fileDir, { recursive: true });
      }
    } catch (dirError) {
      console.error("[Admin] Error creating directory:", dirError);
      console.error("[Admin] Directory error stack:", dirError.stack);
      // Continue anyway, might work if directory already exists
    }
    
    // Ensure the file exists
    try {
      if (!fs.existsSync(PENDING_FILE)) {
        console.log(`[Admin] Creating pending.json file: ${PENDING_FILE}`);
        fs.writeFileSync(PENDING_FILE, "[]", "utf-8");
      }
    } catch (fileError) {
      console.error("[Admin] Error creating pending.json file:", fileError);
      console.error("[Admin] File error stack:", fileError.stack);
      // Return empty array if we can't create the file
      return res.status(200).json([]);
    }
    
    // Read and parse the file
    try {
      console.log(`[Admin] Reading file: ${PENDING_FILE}`);
      const fileContent = fs.readFileSync(PENDING_FILE, "utf-8");
      if (fileContent && fileContent.trim()) {
        pendingServices = JSON.parse(fileContent);
        // Ensure it's an array
        if (!Array.isArray(pendingServices)) {
          console.warn("[Admin] pending.json is not an array, resetting to empty array");
          pendingServices = [];
          try {
            fs.writeFileSync(PENDING_FILE, "[]", "utf-8");
          } catch (writeErr) {
            console.error("[Admin] Error writing empty array:", writeErr);
          }
        }
      }
      console.log(`[Admin] Loaded ${pendingServices.length} pending services`);
    } catch (parseError) {
      console.error("[Admin] Error parsing pending.json:", parseError);
      console.error("[Admin] Parse error stack:", parseError.stack);
      // If file is corrupted, reset it
      try {
        fs.writeFileSync(PENDING_FILE, "[]", "utf-8");
      } catch (writeError) {
        console.error("[Admin] Error resetting pending.json:", writeError);
      }
      pendingServices = [];
    }
    
    // Always return a valid JSON response
    return res.status(200).json(pendingServices);
  } catch (err) {
    // Catch any unexpected errors
    console.error("[Admin] Unexpected error in /api/admin/pending:", err);
    console.error("[Admin] Error message:", err.message);
    console.error("[Admin] Error stack:", err.stack);
    // Return empty array instead of error to prevent 500
    return res.status(200).json([]);
  }
});

// Approve service (admin only)
app.post("/api/admin/approve/:id", authenticateAdmin, async (req, res) => {
  try {
    // Read pending services
    let pendingServices = [];
    if (fs.existsSync(PENDING_FILE)) {
      pendingServices = JSON.parse(fs.readFileSync(PENDING_FILE, "utf-8"));
    }

    // Find the service to approve
    const serviceIndex = pendingServices.findIndex(s => String(s.id) === String(req.params.id));
    if (serviceIndex === -1) {
      return res.status(404).json({ error: "Service not found in pending list." });
    }

    const service = pendingServices[serviceIndex];
    
    // Normalize photo path - ensure it starts with / for consistency
    if (service.photo && !service.photo.startsWith('http') && !service.photo.startsWith('/')) {
      service.photo = '/' + service.photo;
    }
    
    // Read approved services
    let approvedServices = [];
    if (fs.existsSync(SERVICES_FILE)) {
      approvedServices = JSON.parse(fs.readFileSync(SERVICES_FILE, "utf-8"));
    }

    // Add to approved services
    delete service.status; // Remove pending status
    approvedServices.push(service);

    // Save approved services
    fs.writeFileSync(SERVICES_FILE, JSON.stringify(approvedServices, null, 2));
    console.log(`✅ Saved ${approvedServices.length} services to ${SERVICES_FILE}`);

    // Remove from pending
    pendingServices.splice(serviceIndex, 1);
    fs.writeFileSync(PENDING_FILE, JSON.stringify(pendingServices, null, 2));
    console.log(`✅ Removed service from pending. ${pendingServices.length} services remaining in pending.`);

    // ALWAYS sync to public/services.json - this is critical for frontend to display services
    const publicServicesPath = path.join(__dirname, "public", "services.json");
    try {
      // Ensure the directory exists
      const publicDir = path.dirname(publicServicesPath);
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      
      fs.writeFileSync(publicServicesPath, JSON.stringify(approvedServices, null, 2));
      console.log(`✅ Synced ${approvedServices.length} services to public/services.json`);
    } catch (err) {
      console.error("❌ CRITICAL: Could not sync to public/services.json:", err.message);
      console.error("Error details:", err);
      // Don't throw - we still want to complete the approval, but log the error
    }
    
    // Also sync to root services.json if it exists (for backup) - only on local dev
    if (!isVercel) {
      const rootServicesPath = path.join(__dirname, "services.json");
      try {
        fs.writeFileSync(rootServicesPath, JSON.stringify(approvedServices, null, 2));
        console.log(`✅ Synced ${approvedServices.length} services to root services.json`);
      } catch (err) {
        console.warn("Could not sync to root services.json:", err.message);
      }
    }

    // Send approval email if configured
    if (isEmailConfigured() && service.email) {
      try {
        await emailTransporter.sendMail({
          from: process.env.EMAIL_USER,
          to: service.email,
          subject: "Your Service Has Been Approved - NDIS Service Finder",
          html: `
            <h2>Service Approved!</h2>
            <p>Great news! Your service "<strong>${service.name}</strong>" has been approved and is now live on NDIS Service Finder.</p>
            <p>You can view it at: <a href="${process.env.SITE_URL || 'https://ndiservicefinder.com'}/service-details.html?id=${service.id}">View Your Service</a></p>
            <p>Thank you for being part of our platform!</p>
          `
        });
      } catch (emailErr) {
        console.warn("Failed to send approval email:", emailErr.message);
      }
    }

    res.json({ success: true, message: "Service approved and added to live listings." });
  } catch (err) {
    console.error("Error approving service:", err);
    res.status(500).json({ error: "Failed to approve service: " + err.message });
  }
});

// Reject service (admin only)
app.post("/api/admin/reject/:id", authenticateAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    
    // Read pending services
    let pendingServices = [];
    if (fs.existsSync(PENDING_FILE)) {
      pendingServices = JSON.parse(fs.readFileSync(PENDING_FILE, "utf-8"));
    }

    // Find the service to reject
    const serviceIndex = pendingServices.findIndex(s => String(s.id) === String(req.params.id));
    if (serviceIndex === -1) {
      return res.status(404).json({ error: "Service not found in pending list." });
    }

    const service = pendingServices[serviceIndex];

    // Remove from pending
    pendingServices.splice(serviceIndex, 1);
    fs.writeFileSync(PENDING_FILE, JSON.stringify(pendingServices, null, 2));

    // Send rejection email if configured
    if (isEmailConfigured() && service.email) {
      try {
        await emailTransporter.sendMail({
          from: process.env.EMAIL_USER,
          to: service.email,
          subject: "Service Submission Update - NDIS Service Finder",
          html: `
            <h2>Service Submission Update</h2>
            <p>Thank you for submitting your service "<strong>${service.name}</strong>" to NDIS Service Finder.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <p>Unfortunately, we are unable to approve your service at this time. If you have questions, please feel free to contact us.</p>
          `
        });
      } catch (emailErr) {
        console.warn("Failed to send rejection email:", emailErr.message);
      }
    }

    res.json({ success: true, message: "Service rejected and removed from pending list." });
  } catch (err) {
    console.error("Error rejecting service:", err);
    res.status(500).json({ error: "Failed to reject service: " + err.message });
  }
});

// Delete approved service (admin only)
app.delete("/api/admin/delete/:id", authenticateAdmin, async (req, res) => {
  try {
    // Read approved services
    let approvedServices = [];
    if (fs.existsSync(SERVICES_FILE)) {
      approvedServices = JSON.parse(fs.readFileSync(SERVICES_FILE, "utf-8"));
    }

    // Find the service to delete
    const serviceIndex = approvedServices.findIndex(s => String(s.id) === String(req.params.id));
    if (serviceIndex === -1) {
      return res.status(404).json({ error: "Service not found in approved list." });
    }

    const service = approvedServices[serviceIndex];

    // Optionally delete the associated image file
    if (service.photo) {
      try {
        // Check if it's a Vercel Blob URL
        if (service.photo.includes('blob.vercel-storage.com') || service.photo.includes('public.blob.vercel-storage.com')) {
          // Delete from Vercel Blob Storage
          if (blobAvailable && process.env.BLOB_READ_WRITE_TOKEN && blobDel) {
            try {
              await blobDel(service.photo);
              console.log(`✅ Deleted image from Vercel Blob Storage: ${service.photo}`);
            } catch (blobErr) {
              console.warn("Could not delete from Vercel Blob Storage:", blobErr.message);
            }
          } else {
            console.warn("Blob storage not available, skipping blob deletion");
          }
        } else {
          // Delete local file
          let imagePath;
          if (isVercel) {
            // Extract filename from path (could be /uploads/filename.jpg or uploads/filename.jpg)
            const filename = service.photo.replace(/^\/?uploads\//, '');
            imagePath = path.join("/tmp", "uploads", filename);
          } else {
            // Extract filename from path
            const filename = service.photo.replace(/^uploads\//, '');
            imagePath = path.join(__dirname, "public", "uploads", filename);
          }
          
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            console.log(`✅ Deleted local image: ${imagePath}`);
          }
        }
      } catch (imageErr) {
        console.warn("Could not delete image file:", imageErr.message);
        // Continue with service deletion even if image deletion fails
      }
    }

    // Remove from approved services
    approvedServices.splice(serviceIndex, 1);
    fs.writeFileSync(SERVICES_FILE, JSON.stringify(approvedServices, null, 2));
    console.log(`✅ Removed service from approved list. ${approvedServices.length} services remaining.`);

    // ALWAYS sync to public/services.json - this is critical for frontend to display services
    const publicServicesPath = path.join(__dirname, "public", "services.json");
    try {
      // Ensure the directory exists
      const publicDir = path.dirname(publicServicesPath);
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      
      fs.writeFileSync(publicServicesPath, JSON.stringify(approvedServices, null, 2));
      console.log(`✅ Synced ${approvedServices.length} services to public/services.json after deletion`);
    } catch (err) {
      console.error("❌ CRITICAL: Could not sync to public/services.json:", err.message);
      console.error("Error details:", err);
    }
    
    // Also sync to root services.json if it exists (for backup) - only on local dev
    if (!isVercel) {
      const rootServicesPath = path.join(__dirname, "services.json");
      try {
        fs.writeFileSync(rootServicesPath, JSON.stringify(approvedServices, null, 2));
        console.log(`✅ Synced ${approvedServices.length} services to root services.json`);
      } catch (err) {
        console.warn("Could not sync to root services.json:", err.message);
      }
    }

    res.json({ success: true, message: "Service deleted successfully." });
  } catch (err) {
    console.error("Error deleting service:", err);
    res.status(500).json({ error: "Failed to delete service: " + err.message });
  }
});

// Get all approved services (admin only) - for admin panel to show existing listings
app.get("/api/admin/services", authenticateAdmin, (req, res) => {
  try {
    console.log(`[Admin] Loading approved services from: ${SERVICES_FILE}`);
    let approvedServices = [];
    
    if (fs.existsSync(SERVICES_FILE)) {
      try {
        const fileContent = fs.readFileSync(SERVICES_FILE, "utf-8");
        if (fileContent && fileContent.trim()) {
          approvedServices = JSON.parse(fileContent);
          // Ensure it's an array
          if (!Array.isArray(approvedServices)) {
            console.warn("[Admin] services.json is not an array, resetting to empty array");
            approvedServices = [];
          }
        }
        console.log(`[Admin] Loaded ${approvedServices.length} approved services`);
      } catch (parseError) {
        console.error("[Admin] Error parsing services.json:", parseError);
        console.error("[Admin] Parse error stack:", parseError.stack);
        approvedServices = [];
      }
    } else {
      console.log(`[Admin] Services file does not exist: ${SERVICES_FILE}`);
    }
    
    res.json(approvedServices);
  } catch (err) {
    console.error("[Admin] Unexpected error loading approved services:", err);
    console.error("[Admin] Error message:", err.message);
    console.error("[Admin] Error stack:", err.stack);
    // Return empty array instead of 500 error
    res.status(200).json([]);
  }
});

// Manual sync endpoint (admin only) - force sync services to public/services.json
app.post("/api/admin/sync-services", authenticateAdmin, (req, res) => {
  try {
    let approvedServices = [];
    if (fs.existsSync(SERVICES_FILE)) {
      approvedServices = JSON.parse(fs.readFileSync(SERVICES_FILE, "utf-8"));
    }
    
    // Sync to public/services.json
    const publicServicesPath = path.join(__dirname, "public", "services.json");
    const publicDir = path.dirname(publicServicesPath);
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    fs.writeFileSync(publicServicesPath, JSON.stringify(approvedServices, null, 2));
    console.log(`✅ Manual sync: Synced ${approvedServices.length} services to public/services.json`);
    
    res.json({ 
      success: true, 
      message: `Successfully synced ${approvedServices.length} services to public/services.json`,
      serviceCount: approvedServices.length
    });
  } catch (err) {
    console.error("Error syncing services:", err);
    res.status(500).json({ error: "Failed to sync services: " + err.message });
  }
});

// ... KEEP ALL YOUR OTHER EXISTING ROUTES EXACTLY AS THEY ARE ...

// Initialize database and start server
const PORT = process.env.PORT || 3000;

// For Vercel deployment, export the app
// On Vercel, process.env.VERCEL is set to "1" (string)
const isVercelEnv = process.env.VERCEL === "1" || process.env.VERCEL === "true" || process.env.VERCEL === true;
if (isVercelEnv) {
  // Initialize database when deployed on Vercel
  initReviewsTable().catch(err => {
    console.error("Error initializing reviews table on Vercel:", err);
  });
}

// For local development, start the server
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  initReviewsTable().then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running at http://localhost:${PORT}`);
      console.log(`📧 Email notifications: ${isEmailConfigured() ? '✅ Enabled' : '❌ Disabled (configure .env file)'}`);
      console.log(`👤 User system: ✅ Enabled`);
      console.log(`🗄️ Vercel Postgres: ✅ Enabled for reviews`);
    });
  });
}

export default app;
