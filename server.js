import dotenv from 'dotenv';
dotenv.config();
import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import nodemailer from "nodemailer";
import { db } from '@vercel/postgres';

const app = express();
const __dirname = path.dirname(new URL(import.meta.url).pathname);

// File paths
const SERVICES_FILE = path.join("/tmp", "services.json");
const PENDING_FILE = path.join("/tmp", "pending.json");
const REVIEWS_FILE = path.join("/tmp", "reviews.json");
const SUBSCRIBERS_FILE = path.join("/tmp", "subscribers.json");
const PREMIUM_FILE = path.join("/tmp", "premium-subscriptions.json");
const USERS_FILE = path.join("/tmp", "users.json");

// Ensure JSON files exist in /tmp (writable directory on Vercel)
const ensureFilesExist = () => {
  if (!fs.existsSync(SERVICES_FILE)) fs.writeFileSync(SERVICES_FILE, "[]");
  if (!fs.existsSync(PENDING_FILE)) fs.writeFileSync(PENDING_FILE, "[]");
  if (!fs.existsSync(REVIEWS_FILE)) fs.writeFileSync(REVIEWS_FILE, "[]");
  if (!fs.existsSync(SUBSCRIBERS_FILE)) fs.writeFileSync(SUBSCRIBERS_FILE, "[]");
  if (!fs.existsSync(PREMIUM_FILE)) fs.writeFileSync(PREMIUM_FILE, "[]");
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]");
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
app.use(express.static(path.join(__dirname, "public")));

// Initialize database table for reviews
async function initReviewsTable() {
  try {
    const client = await db.connect();
    await client.sql`
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
    client.release();
    console.log('✅ Reviews table initialized');
  } catch (error) {
    console.error('Error initializing reviews table:', error);
  }
}

// Routes (keep all your existing routes, but update review-related ones)

// Get reviews for a service (UPDATED for Vercel Postgres)
app.get("/api/service/:id/reviews", async (req, res) => {
  try {
    const client = await db.connect();
    const result = await client.sql`
      SELECT * FROM reviews 
      WHERE service_id = ${parseInt(req.params.id)}
      ORDER BY created_at DESC
    `;
    client.release();
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read reviews." });
  }
});

// Add a review (UPDATED for Vercel Postgres)
app.post("/api/service/:id/reviews", async (req, res) => {
  try {
    const services = JSON.parse(fs.readFileSync(SERVICES_FILE, "utf-8"));
    const service = services.find((s) => String(s.id) === req.params.id);
    
    if (!service) return res.status(404).json({ error: "Service not found" });

    const client = await db.connect();
    const result = await client.sql`
      INSERT INTO reviews (provider_name, rating, comment, author, service_id)
      VALUES (${service.name}, ${req.body.rating}, ${req.body.comment}, ${req.body.author || "Anonymous"}, ${parseInt(req.params.id)})
      RETURNING *
    `;
    client.release();

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

// Search approved services (UPDATED to include Postgres reviews)
app.get("/api/search", async (req, res) => {
  try {
    const services = JSON.parse(fs.readFileSync(SERVICES_FILE, "utf-8"));
    const client = await db.connect();

    const servicesWithRatings = await Promise.all(services.map(async (service) => {
      const reviewsResult = await client.sql`
        SELECT rating FROM reviews WHERE service_id = ${service.id}
      `;
      const serviceReviews = reviewsResult.rows;
      const averageRating = serviceReviews.length > 0
        ? serviceReviews.reduce((sum, review) => sum + review.rating, 0) / serviceReviews.length
        : 0;

      return {
        ...service,
        averageRating: Math.round(averageRating * 10) / 10,
        reviewCount: serviceReviews.length,
        isFeatured: service.isPremium || false
      };
    }));

    client.release();

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

    const client = await db.connect();
    const reviewsResult = await client.sql`
      SELECT * FROM reviews WHERE service_id = ${parseInt(req.params.id)} ORDER BY created_at DESC
    `;
    client.release();

    const serviceReviews = reviewsResult.rows;
    const averageRating = serviceReviews.length > 0
      ? serviceReviews.reduce((sum, review) => sum + review.rating, 0) / serviceReviews.length
      : 0;

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

// Add new service (to pending.json) - WITH USER LINKING
app.post("/api/add", upload.single("photo"), (req, res) => {
  try {
    // ... keep your existing add service code exactly as is ...
    // This will continue to use file-based storage
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

// ... KEEP ALL YOUR OTHER EXISTING ROUTES EXACTLY AS THEY ARE ...

// Initialize database and start server
const PORT = process.env.PORT || 3000;

// For Vercel deployment, export the app
if (process.env.VERCEL) {
  // Initialize database when deployed on Vercel
  initReviewsTable();
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
