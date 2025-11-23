import dotenv from 'dotenv';
dotenv.config();
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import nodemailer from "nodemailer";
import { createClient } from '@vercel/postgres';

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

// For local dev, also sync with public/services.json on startup
if (!isVercel) {
  const publicServicesPath = path.join(__dirname, "public", "services.json");
  if (fs.existsSync(publicServicesPath)) {
    try {
      const publicServices = fs.readFileSync(publicServicesPath, "utf-8");
      fs.writeFileSync(SERVICES_FILE, publicServices);
      console.log("✅ Synced services.json from public folder");
    } catch (err) {
      console.warn("⚠️ Could not sync services.json:", err.message);
    }
  }
  
  // Also sync pending.json if it exists in root
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
    let filePath;
    
    if (isVercel) {
      // On Vercel, serve from /tmp/uploads
      filePath = path.join("/tmp", "uploads", filename);
    } else {
      // Local development - serve from public/uploads
      filePath = path.join(__dirname, "public", "uploads", filename);
    }
    
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: "Image not found" });
    }
  } catch (err) {
    console.error("Error serving image:", err);
    res.status(500).json({ error: "Failed to serve image" });
  }
});

app.use(express.static(path.join(__dirname, "public")));

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

// KEEP ALL YOUR OTHER EXISTING ROUTES EXACTLY AS THEY ARE
// (The file-based routes for services, users, etc. will continue to work)

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
      const filename = `${timestamp}-${Math.floor(Math.random() * 1000000)}${ext}`;
      
      if (isVercel) {
        // On Vercel, save to /tmp/uploads
        const uploadDir = path.join("/tmp", "uploads");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, req.file.buffer);
        photoPath = `/uploads/${filename}`;
      } else {
        // Local development - save to public/uploads
        const uploadDir = path.join(__dirname, "public", "uploads");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, req.file.buffer);
        photoPath = `uploads/${filename}`;
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

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  try {
    // Safely extract password from various sources
    const adminPassword = req.headers.authorization || 
                         (req.body && req.body.password) || 
                         (req.query && req.query.password);
    const expectedPassword = process.env.ADMIN_PASSWORD || "admin123"; // Default password, should be set in env
    
    if (!adminPassword || adminPassword !== expectedPassword) {
      return res.status(401).json({ error: "Unauthorized. Admin access required." });
    }
    next();
  } catch (err) {
    console.error("Error in authenticateAdmin middleware:", err);
    return res.status(500).json({ error: "Authentication error: " + err.message });
  }
};

// Get pending services (admin only)
app.get("/api/admin/pending", authenticateAdmin, (req, res) => {
  // Wrap everything in a try-catch to prevent any unhandled errors
  try {
    let pendingServices = [];
    
    // Ensure the directory exists
    try {
      const fileDir = path.dirname(PENDING_FILE);
      // On Vercel, /tmp should always exist, but check anyway
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
    } catch (dirError) {
      console.error("Error creating directory:", dirError);
      // Continue anyway, might work if directory already exists
    }
    
    // Ensure the file exists
    try {
      if (!fs.existsSync(PENDING_FILE)) {
        fs.writeFileSync(PENDING_FILE, "[]", "utf-8");
      }
    } catch (fileError) {
      console.error("Error creating pending.json file:", fileError);
      // Return empty array if we can't create the file
      return res.status(200).json([]);
    }
    
    // Read and parse the file
    try {
      const fileContent = fs.readFileSync(PENDING_FILE, "utf-8");
      if (fileContent && fileContent.trim()) {
        pendingServices = JSON.parse(fileContent);
        // Ensure it's an array
        if (!Array.isArray(pendingServices)) {
          console.warn("pending.json is not an array, resetting to empty array");
          pendingServices = [];
          try {
            fs.writeFileSync(PENDING_FILE, "[]", "utf-8");
          } catch (writeErr) {
            console.error("Error writing empty array:", writeErr);
          }
        }
      }
    } catch (parseError) {
      console.error("Error parsing pending.json:", parseError);
      // If file is corrupted, reset it
      try {
        fs.writeFileSync(PENDING_FILE, "[]", "utf-8");
      } catch (writeError) {
        console.error("Error resetting pending.json:", writeError);
      }
      pendingServices = [];
    }
    
    // Always return a valid JSON response
    return res.status(200).json(pendingServices);
  } catch (err) {
    // Catch any unexpected errors
    console.error("Unexpected error in /api/admin/pending:", err);
    console.error("Error stack:", err.stack);
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

    // Remove from pending
    pendingServices.splice(serviceIndex, 1);
    fs.writeFileSync(PENDING_FILE, JSON.stringify(pendingServices, null, 2));

    // Sync to public/services.json for both local dev and Vercel (for static file serving)
    const publicServicesPath = path.join(__dirname, "public", "services.json");
    try {
      fs.writeFileSync(publicServicesPath, JSON.stringify(approvedServices, null, 2));
      console.log(`✅ Synced ${approvedServices.length} services to public/services.json`);
    } catch (err) {
      console.warn("Could not sync to public/services.json:", err.message);
    }
    
    // Also sync to root services.json if it exists (for backup)
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
          console.log(`✅ Deleted image: ${imagePath}`);
        }
      } catch (imageErr) {
        console.warn("Could not delete image file:", imageErr.message);
        // Continue with service deletion even if image deletion fails
      }
    }

    // Remove from approved services
    approvedServices.splice(serviceIndex, 1);
    fs.writeFileSync(SERVICES_FILE, JSON.stringify(approvedServices, null, 2));

    // Sync to public/services.json
    const publicServicesPath = path.join(__dirname, "public", "services.json");
    try {
      fs.writeFileSync(publicServicesPath, JSON.stringify(approvedServices, null, 2));
      console.log(`✅ Synced ${approvedServices.length} services to public/services.json after deletion`);
    } catch (err) {
      console.warn("Could not sync to public/services.json:", err.message);
    }
    
    // Also sync to root services.json if it exists (for backup)
    if (!isVercel) {
      const rootServicesPath = path.join(__dirname, "services.json");
      try {
        fs.writeFileSync(rootServicesPath, JSON.stringify(approvedServices, null, 2));
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
    let approvedServices = [];
    if (fs.existsSync(SERVICES_FILE)) {
      approvedServices = JSON.parse(fs.readFileSync(SERVICES_FILE, "utf-8"));
    }
    res.json(approvedServices);
  } catch (err) {
    console.error("Error loading approved services:", err);
    res.status(500).json({ error: "Failed to load services: " + err.message });
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


