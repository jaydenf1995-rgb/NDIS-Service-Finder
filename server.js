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

// Initialize Vercel Postgres client with proper async initialization
let db = null;
let dbInitialized = false;

async function initializeDatabase() {
    console.log('🔧 Starting database initialization...');
    
    try {
        // Use POSTGRES_URL_NON_POOLING specifically for the client
        const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL;
        
        if (!connectionString) {
            console.warn('⚠️ No Postgres connection string found');
            return false;
        }

        console.log('🔧 Creating Postgres client with connection string...');
        
        // Create client with explicit configuration
        db = createClient({
            connectionString: connectionString
        });

        console.log('🔧 Testing database connection...');
        
        // Simple test query with timeout
        const testResult = await db.sql`SELECT version() as pg_version, NOW() as current_time`;
        
        console.log('✅ Database connection successful');
        console.log('✅ PostgreSQL Version:', testResult.rows[0].pg_version);
        console.log('✅ Current Time:', testResult.rows[0].current_time);
        
        dbInitialized = true;
        console.log('✅ Vercel Postgres client initialized successfully');
        return true;
        
    } catch (err) {
        console.error('❌ Database initialization failed:', err.message);
        console.error('❌ Full error:', err);
        db = null;
        dbInitialized = false;
        return false;
    }
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
// Initialize services table
async function initServicesTable() {
    if (!db) {
        console.warn('⚠️ Skipping services table initialization - Postgres not configured');
        return;
    }
    try {
        await db.sql`
            CREATE TABLE IF NOT EXISTS services (
                id BIGINT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(255) NOT NULL,
                location VARCHAR(255) NOT NULL,
                address TEXT NOT NULL,
                services JSONB NOT NULL,
                registered VARCHAR(50) NOT NULL,
                description TEXT NOT NULL,
                about_me TEXT,
                photo TEXT,
                approved BOOLEAN DEFAULT false,
                rejected BOOLEAN DEFAULT false,
                rejection_reason TEXT,
                approved_at TIMESTAMP WITH TIME ZONE,
                rejected_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;
        console.log('✅ Services table initialized');
        
        // Migrate existing services from JSON file to database
        await migrateServicesToDatabase();
    } catch (error) {
        console.error('Error initializing services table:', error);
    }
}

async function migrateServicesToDatabase() {
    try {
        // Migrate approved services
        if (fs.existsSync(SERVICES_FILE)) {
            const services = JSON.parse(fs.readFileSync(SERVICES_FILE, "utf-8"));
            let migratedCount = 0;
            
            for (const service of services) {
                try {
                    await db.sql`
                        INSERT INTO services (
                            id, name, email, phone, location, address, services, 
                            registered, description, about_me, photo, approved, approved_at, created_at
                        ) VALUES (
                            ${service.id}, 
                            ${service.name}, 
                            ${service.email}, 
                            ${service.phone}, 
                            ${service.location}, 
                            ${service.address}, 
                            ${JSON.stringify(service.services)}, 
                            ${service.registered}, 
                            ${service.description}, 
                            ${service.aboutMe || ''}, 
                            ${service.photo || ''}, 
                            true,
                            ${service.approvedAt || service.dateAdded || new Date().toISOString()},
                            ${service.dateAdded || new Date().toISOString()}
                        )
                        ON CONFLICT (id) DO NOTHING;
                    `;
                    migratedCount++;
                } catch (serviceError) {
                    console.error(`Error migrating service ${service.id}:`, serviceError);
                }
            }
            console.log(`✅ Migrated ${migratedCount} approved services to database`);
        }
        
        // Migrate pending services
        if (fs.existsSync(PENDING_FILE)) {
            const pendingServices = JSON.parse(fs.readFileSync(PENDING_FILE, "utf-8"));
            let pendingMigratedCount = 0;
            
            for (const service of pendingServices) {
                try {
                    await db.sql`
                        INSERT INTO services (
                            id, name, email, phone, location, address, services, 
                            registered, description, about_me, photo, approved, rejected, created_at
                        ) VALUES (
                            ${service.id}, 
                            ${service.name}, 
                            ${service.email}, 
                            ${service.phone}, 
                            ${service.location}, 
                            ${service.address}, 
                            ${JSON.stringify(service.services)}, 
                            ${service.registered}, 
                            ${service.description}, 
                            ${service.aboutMe || ''}, 
                            ${service.photo || ''}, 
                            false,
                            false,
                            ${service.dateAdded || new Date().toISOString()}
                        )
                        ON CONFLICT (id) DO NOTHING;
                    `;
                    pendingMigratedCount++;
                } catch (serviceError) {
                    console.error(`Error migrating pending service ${service.id}:`, serviceError);
                }
            }
            console.log(`✅ Migrated ${pendingMigratedCount} pending services to database`);
        }
    } catch (error) {
        console.error('Error migrating services to database:', error);
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
// Simple debug route to test server
app.get("/api/debug/simple", (req, res) => {
    res.json({
        status: "server_responding",
        timestamp: new Date().toISOString(),
        dbInitialized: dbInitialized,
        hasPostgresVars: !!(process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL)
    });
});
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

// Search approved services (UPDATED for Postgres)
app.get("/api/search", async (req, res) => {
    try {
        let services = [];
        
        if (dbInitialized) {
            // Get approved services from database
            const result = await db.sql`
                SELECT * FROM services 
                WHERE approved = true 
                ORDER BY created_at DESC
            `;
            services = result.rows;
        } else {
            // Fallback to file-based storage
            const servicesData = fs.readFileSync(SERVICES_FILE, "utf-8");
            services = JSON.parse(servicesData);
        }

        const servicesWithRatings = await Promise.all(services.map(async (service) => {
            let averageRating = 0;
            let reviewCount = 0;
            
            if (dbInitialized) {
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
                aboutMe: service.about_me, // Map database field to frontend field
                dateAdded: service.created_at,
                averageRating: Math.round(averageRating * 10) / 10,
                reviewCount: reviewCount,
                isFeatured: false // You can add premium features later
            };
        }));

        // Sort: you can add premium sorting logic here later
        servicesWithRatings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const q = (req.query.q || "").toLowerCase();
        let results = servicesWithRatings;
        if (q) {
            results = servicesWithRatings.filter(
                (s) =>
                    (s.name || "").toLowerCase().includes(q) ||
                    (s.location || "").toLowerCase().includes(q) ||
                    (s.services || []).some((c) => c.toLowerCase().includes(q)) ||
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
        let service = null;
        
        if (dbInitialized) {
            const result = await db.sql`
                SELECT * FROM services WHERE id = ${parseInt(req.params.id)}
            `;
            service = result.rows[0];
        } else {
            // Fallback to file-based storage
            const services = JSON.parse(fs.readFileSync(SERVICES_FILE, "utf-8"));
            service = services.find((s) => String(s.id) === req.params.id);
        }
        
        if (!service) return res.status(404).json({ error: "Service not found" });

        let serviceReviews = [];
        let averageRating = 0;
        
        if (dbInitialized) {
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
            aboutMe: service.about_me, // Map database field to frontend field
            dateAdded: service.created_at,
            reviews: serviceReviews,
            averageRating: Math.round(averageRating * 10) / 10,
            reviewCount: serviceReviews.length,
            isFeatured: false
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to read service." });
    }
});

// Add new service (to database) - UPDATED for Postgres
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

        // Parse services array
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

        // Handle photo upload (keep your existing photo code)
        let photoPath = "";
        if (req.file) {
            // ... (keep your existing photo upload code)
        }

        const serviceId = Date.now();

        if (dbInitialized) {
            // Save to database
            await db.sql`
                INSERT INTO services (
                    id, name, email, phone, location, address, services, 
                    registered, description, about_me, photo
                ) VALUES (
                    ${serviceId},
                    ${name.trim()},
                    ${email.trim()},
                    ${phone.trim()},
                    ${location.trim()},
                    ${address.trim()},
                    ${JSON.stringify(servicesArray)},
                    ${registered},
                    ${description.trim()},
                    ${aboutMe ? aboutMe.trim() : ''},
                    ${photoPath}
                )
            `;
        } else {
            // Fallback to file-based storage
            let pendingServices = [];
            if (fs.existsSync(PENDING_FILE)) {
                pendingServices = JSON.parse(fs.readFileSync(PENDING_FILE, "utf-8"));
            }

            const newService = {
                id: serviceId,
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
            fs.writeFileSync(PENDING_FILE, JSON.stringify(pendingServices, null, 2));
        }

        // Send email notification if configured
        // ... (keep your existing email code)

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

// Get pending services (admin only) - UPDATED for Postgres
app.get("/api/admin/pending", authenticateAdmin, async (req, res) => {
    try {
        let pendingServices = [];
        
        if (dbInitialized) {
            const result = await db.sql`
                SELECT * FROM services 
                WHERE approved = false AND rejected = false 
                ORDER BY created_at DESC
            `;
            pendingServices = result.rows.map(service => ({
                ...service,
                aboutMe: service.about_me,
                dateAdded: service.created_at
            }));
        } else {
            // Fallback to file-based storage
            if (fs.existsSync(PENDING_FILE)) {
                pendingServices = JSON.parse(fs.readFileSync(PENDING_FILE, "utf-8"));
            }
        }
        
        res.json(pendingServices);
    } catch (err) {
        console.error("Error loading pending services:", err);
        res.status(500).json({ error: "Failed to load pending services" });
    }
});

// Approve service (admin only) - UPDATED for Postgres
app.post("/api/admin/approve/:id", authenticateAdmin, async (req, res) => {
    try {
        if (dbInitialized) {
            // Update service in database
            await db.sql`
                UPDATE services 
                SET approved = true, approved_at = NOW() 
                WHERE id = ${parseInt(req.params.id)}
            `;
        } else {
            // Fallback to file-based storage (your existing code)
            let pendingServices = [];
            if (fs.existsSync(PENDING_FILE)) {
                pendingServices = JSON.parse(fs.readFileSync(PENDING_FILE, "utf-8"));
            }

            const serviceIndex = pendingServices.findIndex(s => String(s.id) === String(req.params.id));
            if (serviceIndex === -1) {
                return res.status(404).json({ error: "Service not found in pending list." });
            }

            const service = pendingServices[serviceIndex];
            
            let approvedServices = [];
            if (fs.existsSync(SERVICES_FILE)) {
                approvedServices = JSON.parse(fs.readFileSync(SERVICES_FILE, "utf-8"));
            }

            delete service.status;
            approvedServices.push(service);
            fs.writeFileSync(SERVICES_FILE, JSON.stringify(approvedServices, null, 2));

            pendingServices.splice(serviceIndex, 1);
            fs.writeFileSync(PENDING_FILE, JSON.stringify(pendingServices, null, 2));

            // Sync to public/services.json
            const publicServicesPath = path.join(__dirname, "public", "services.json");
            fs.writeFileSync(publicServicesPath, JSON.stringify(approvedServices, null, 2));
        }

        // Send approval email if configured
        // ... (keep your existing email code)

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
// ===== DEBUG ROUTES =====
// Test database connection
app.get("/api/debug/db-test", async (req, res) => {
    try {
        console.log("🔧 Testing database connection...");
        
        if (!db) {
            return res.json({ 
                status: "error", 
                message: "Database client not initialized",
                possibleReasons: [
                    "Postgres environment variables not set",
                    "Database connection failed on startup"
                ]
            });
        }
        
        // Test simple query
        const result = await db.sql`SELECT NOW() as current_time`;
        console.log("✅ Database test result:", result.rows[0]);
        
        // Test services table
        const servicesCount = await db.sql`SELECT COUNT(*) as count FROM services`;
        const pendingCount = await db.sql`SELECT COUNT(*) as count FROM services WHERE approved = false AND rejected = false`;
        const approvedCount = await db.sql`SELECT COUNT(*) as count FROM services WHERE approved = true`;
        
        res.json({
            status: "success",
            database: "Connected ✅",
            currentTime: result.rows[0].current_time,
            totalServices: parseInt(servicesCount.rows[0].count),
            pendingServices: parseInt(pendingCount.rows[0].count),
            approvedServices: parseInt(approvedCount.rows[0].count),
            tables: {
                services: "Exists ✅",
                reviews: "Exists ✅"
            }
        });
        
    } catch (error) {
        console.error("❌ Database test failed:", error);
        res.status(500).json({ 
            status: "error",
            message: "Database test failed: " + error.message,
            errorDetails: error.toString()
        });
    }
});

// Test specific service lookup
app.get("/api/debug/service/:id", async (req, res) => {
    try {
        const serviceId = req.params.id;
        console.log(`🔧 Debug: Looking up service ${serviceId}`);
        
        let service = null;
        
        if (dbInitialized) {
            const result = await db.sql`SELECT * FROM services WHERE id = ${parseInt(serviceId)}`;
            service = result.rows[0];
        }
        
        if (service) {
            res.json({
                status: "found",
                service: service,
                source: "database"
            });
        } else {
            // Check file fallback
            if (fs.existsSync(PENDING_FILE)) {
                const pendingServices = JSON.parse(fs.readFileSync(PENDING_FILE, "utf-8"));
                const fileService = pendingServices.find(s => String(s.id) === String(serviceId));
                if (fileService) {
                    res.json({
                        status: "found",
                        service: fileService,
                        source: "pending.json file"
                    });
                    return;
                }
            }
            
            res.json({
                status: "not_found",
                message: `Service ${serviceId} not found in database or files`
            });
        }
        
    } catch (error) {
        console.error("❌ Service debug failed:", error);
        res.status(500).json({ error: "Debug failed: " + error.message });
    }
});

// Test approve functionality
app.get("/api/debug/approve-test/:id", authenticateAdmin, async (req, res) => {
    try {
        const serviceId = req.params.id;
        console.log(`🔧 Testing approve for service ${serviceId}`);
        
        if (!db) {
            return res.json({ error: "Database not available for testing" });
        }
        
        // Check if service exists
        const checkResult = await db.sql`SELECT * FROM services WHERE id = ${parseInt(serviceId)}`;
        if (checkResult.rows.length === 0) {
            return res.json({ error: `Service ${serviceId} not found in database` });
        }
        
        const service = checkResult.rows[0];
        res.json({
            serviceExists: true,
            service: {
                id: service.id,
                name: service.name,
                approved: service.approved,
                rejected: service.rejected
            },
            readyForApproval: !service.approved && !service.rejected
        });
        
    } catch (error) {
        console.error("❌ Approve test failed:", error);
        res.status(500).json({ error: "Approve test failed: " + error.message });
    }
});
// Initialize database and start server
const PORT = process.env.PORT || 3000;

async function startServer() {
    // Initialize database first
    const dbSuccess = await initializeDatabase();
    
    if (dbSuccess) {
        console.log('✅ Database initialized successfully');
        // Initialize tables
        await Promise.all([
            initReviewsTable(),
            initServicesTable()
        ]).catch(err => {
            console.error("Error initializing database tables:", err);
        });
    } else {
        console.log('⚠️ Using file-based storage (database not available)');
    }

    // For Vercel deployment, export the app
    const isVercelEnv = process.env.VERCEL === "1" || process.env.VERCEL === "true" || process.env.VERCEL === true;
    
    if (isVercelEnv) {
        console.log('✅ Server ready for Vercel deployment');
        console.log(`🗄️ Database: ${dbSuccess ? '✅ Postgres Enabled' : '⚠️ File-based Storage'}`);
    } else {
        // For local development, start the server
        app.listen(PORT, () => {
            console.log(`✅ Server running at http://localhost:${PORT}`);
            console.log(`📧 Email notifications: ${isEmailConfigured() ? '✅ Enabled' : '❌ Disabled'}`);
            console.log(`🗄️ Database: ${dbSuccess ? '✅ Postgres Enabled' : '⚠️ File-based Storage'}`);
        });
    }
}

// Start the server
startServer().catch(err => {
    console.error('❌ Failed to start server:', err);
});

export default app;


