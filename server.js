require('dotenv').config();
const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const nodemailer = require("nodemailer");

// File paths
const SERVICES_FILE = path.join(__dirname, "services.json");
const PENDING_FILE = path.join(__dirname, "pending.json");
const REVIEWS_FILE = path.join(__dirname, "reviews.json");
const SUBSCRIBERS_FILE = path.join(__dirname, "subscribers.json");
const PREMIUM_FILE = path.join(__dirname, "premium-subscriptions.json");
const USERS_FILE = path.join(__dirname, "users.json");

// Ensure JSON files exist
if (!fs.existsSync(SERVICES_FILE)) fs.writeFileSync(SERVICES_FILE, "[]");
if (!fs.existsSync(PENDING_FILE)) fs.writeFileSync(PENDING_FILE, "[]");
if (!fs.existsSync(REVIEWS_FILE)) fs.writeFileSync(REVIEWS_FILE, "[]");
if (!fs.existsSync(SUBSCRIBERS_FILE)) fs.writeFileSync(SUBSCRIBERS_FILE, "[]");
if (!fs.existsSync(PREMIUM_FILE)) fs.writeFileSync(PREMIUM_FILE, "[]");
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]");

// Multer setup
const upload = multer({
  dest: path.join(__dirname, "public", "uploads"),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Email configuration
const createEmailTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ Email credentials not configured. Email notifications will be disabled.');
    console.warn('Set EMAIL_USER and EMAIL_PASS in your .env file to enable emails.');
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

const isEmailConfigured = () => {
  return emailTransporter !== null;
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/blog", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "blog.html"));
});

app.get("/service", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "service.html"));
});

app.get("/premium", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "premium.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/browse", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "browse.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "register.html"));
});

// Search approved services
app.get("/api/search", (req, res) => {
  try {
    const services = JSON.parse(fs.readFileSync(SERVICES_FILE, "utf-8"));
    const reviews = JSON.parse(fs.readFileSync(REVIEWS_FILE, "utf-8"));

    const servicesWithRatings = services.map(service => {
      const serviceReviews = reviews.filter(review => review.serviceId == service.id);
      const averageRating = serviceReviews.length > 0
        ? serviceReviews.reduce((sum, review) => sum + review.rating, 0) / serviceReviews.length
        : 0;

      return {
        ...service,
        averageRating: Math.round(averageRating * 10) / 10,
        reviewCount: serviceReviews.length,
        isFeatured: service.isPremium || false
      };
    });

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

// Get single service with reviews
app.get("/api/service/:id", (req, res) => {
  try {
    const services = JSON.parse(fs.readFileSync(SERVICES_FILE, "utf-8"));
    const reviews = JSON.parse(fs.readFileSync(REVIEWS_FILE, "utf-8"));

    const service = services.find((s) => String(s.id) === req.params.id);
    if (!service) return res.status(404).json({ error: "Service not found" });

    const serviceReviews = reviews.filter(review => review.serviceId == service.id);
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

// Get reviews for a service
app.get("/api/service/:id/reviews", (req, res) => {
  try {
    const reviews = JSON.parse(fs.readFileSync(REVIEWS_FILE, "utf-8"));
    const serviceReviews = reviews.filter(review => String(review.serviceId) == req.params.id);
    res.json(serviceReviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read reviews." });
  }
});

// Add a review
app.post("/api/service/:id/reviews", (req, res) => {
  try {
    const reviews = JSON.parse(fs.readFileSync(REVIEWS_FILE, "utf-8"));
    const services = JSON.parse(fs.readFileSync(SERVICES_FILE, "utf-8"));

    const service = services.find((s) => String(s.id) === req.params.id);
    if (!service) return res.status(404).json({ error: "Service not found" });

    const newReview = {
      id: Date.now(),
      serviceId: parseInt(req.params.id),
      rating: req.body.rating,
      comment: req.body.comment,
      author: req.body.author || "Anonymous",
      date: new Date().toISOString(),
      verified: false
    };

    reviews.push(newReview);
    fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, null, 2));

    res.json({
      success: true,
      message: "Review submitted!",
      review: newReview
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit review." });
  }
});

// Pending services
app.get("/api/pending", (req, res) => {
  try {
    const pending = JSON.parse(fs.readFileSync(PENDING_FILE, "utf-8"));
    res.json(pending);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read pending services." });
  }
});

// Add new service (to pending.json) - WITH USER LINKING
app.post("/api/add", upload.single("photo"), (req, res) => {
  try {
    console.log("Received form data:", req.body);
    console.log("Received file:", req.file);

    const pending = JSON.parse(fs.readFileSync(PENDING_FILE, "utf-8"));
    const id = Date.now();

    let photoPath = "";
    if (req.file) {
      const ext = path.extname(req.file.originalname) || ".jpg";
      const filename = `${id}-${Math.floor(Math.random() * 1000000)}${ext}`;
      const newPath = path.join(__dirname, "public", "uploads", filename);

      // Ensure uploads directory exists
      const uploadsDir = path.join(__dirname, "public", "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      fs.renameSync(req.file.path, newPath);
      photoPath = `/uploads/${filename}`;
    }

    // Handle categories - FIXED: properly parse categories from form data
    let categories = [];
    if (req.body.category) {
      if (Array.isArray(req.body.category)) {
        categories = req.body.category;
      } else if (typeof req.body.category === 'string') {
        categories = [req.body.category];
      } else {
        categories = [];
      }
    }

    const newService = {
      id,
      name: req.body.name || "",
      location: req.body.location || "",
      category: categories,
      registered: req.body.registered || "No",
      description: req.body.description || "",
      address: req.body.address || "",
      phone: req.body.phone || "",
      email: req.body.email || "",
      photo: photoPath,
      isPremium: false,
      submittedAt: new Date().toISOString()
    };

    console.log("New service to add:", newService);

    pending.push(newService);
    fs.writeFileSync(PENDING_FILE, JSON.stringify(pending, null, 2));

    // LINK SERVICE TO USER IF THEY EXIST
    try {
      const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
      const userIndex = users.findIndex(user => user.email === req.body.email);
      if (userIndex !== -1) {
        if (!users[userIndex].services) {
          users[userIndex].services = [];
        }
        // Only add if not already linked
        if (!users[userIndex].services.includes(id)) {
          users[userIndex].services.push(id);
          fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
          console.log(`✅ Service ${id} linked to user ${req.body.email}`);
        }
      }
    } catch (userError) {
      console.error("Error linking service to user:", userError);
      // Don't fail the whole request if user linking fails
    }

    // Send email notification if configured
    if (isEmailConfigured()) {
      sendNewServiceNotification(newService);
    }

    res.json({
      success: true,
      message: "Service submitted for approval!",
      serviceId: id
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
    const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    
    const { email, password, name, phone } = req.body;
    
    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }
    
    // Check if user already exists
    if (users.find(user => user.email === email)) {
      return res.status(400).json({ error: "User already exists with this email" });
    }
    
    // Create new user
    const newUser = {
      id: Date.now(),
      email: email.toLowerCase().trim(),
      password: password, // In production, use bcrypt to hash passwords!
      name: name.trim(),
      phone: phone || "",
      createdAt: new Date().toISOString(),
      services: []
    };
    
    users.push(newUser);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    
    console.log(`✅ New user registered: ${email}`);
    
    res.json({
      success: true,
      message: "Account created successfully!",
      user: { 
        id: newUser.id, 
        email: newUser.email, 
        name: newUser.name,
        phone: newUser.phone
      }
    });
    
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Failed to create account: " + err.message });
  }
});

// User Login - FIXED VERSION
app.post("/api/login", (req, res) => {
  try {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    const services = JSON.parse(fs.readFileSync(SERVICES_FILE, "utf-8"));
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    
    // Find user
    const user = users.find(u => u.email === email.toLowerCase().trim() && u.password === password);
    
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    
    // Get user's services
    const userServices = services.filter(service => 
      user.services.includes(service.id) || service.email === user.email
    );
    
    console.log(`✅ User logged in: ${email}`);
    
    res.json({
      success: true,
      message: "Login successful!",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        services: userServices
      }
    });
    
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Failed to login: " + err.message });
  }
});

// Get user's services
app.get("/api/user/services", (req, res) => {
  try {
    const userEmail = req.query.email;
    if (!userEmail) {
      return res.status(400).json({ error: "Email parameter is required" });
    }
    
    const services = JSON.parse(fs.readFileSync(SERVICES_FILE, "utf-8"));
    
    const userServices = services.filter(service => service.email === userEmail);
    
    res.json(userServices);
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get user services" });
  }
});

// Update service (for logged-in users)
app.put("/api/service/:id", upload.single("photo"), (req, res) => {
  try {
    const services = JSON.parse(fs.readFileSync(SERVICES_FILE, "utf-8"));
    const userEmail = req.body.userEmail;

    const serviceIndex = services.findIndex((s) => String(s.id) === req.params.id);
    if (serviceIndex === -1) return res.status(404).json({ error: "Service not found" });
    
    const service = services[serviceIndex];
    
    // Verify ownership
    if (service.email !== userEmail) {
      return res.status(403).json({ error: "Not authorized to update this service" });
    }
    
    // Handle photo update
    let photoPath = service.photo;
    if (req.file) {
      const ext = path.extname(req.file.originalname) || ".jpg";
      const filename = `${service.id}-${Math.floor(Math.random() * 1000000)}${ext}`;
      const newPath = path.join(__dirname, "public", "uploads", filename);
      
      // Ensure uploads directory exists
      const uploadsDir = path.join(__dirname, "public", "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Delete old photo if exists
      if (service.photo) {
        const oldPhotoFile = path.join(__dirname, "public", service.photo);
        if (fs.existsSync(oldPhotoFile)) fs.unlinkSync(oldPhotoFile);
      }
      
      fs.renameSync(req.file.path, newPath);
      photoPath = `/uploads/${filename}`;
    }
    
    // Handle categories
    let categories = [];
    if (req.body.category) {
      if (Array.isArray(req.body.category)) {
        categories = req.body.category;
      } else {
        categories = [req.body.category];
      }
    }
    
    // Update service
    services[serviceIndex] = {
      ...service,
      name: req.body.name || service.name,
      location: req.body.location || service.location,
      category: categories,
      registered: req.body.registered || service.registered,
      description: req.body.description || service.description,
      address: req.body.address || service.address,
      phone: req.body.phone || service.phone,
      photo: photoPath,
      updatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(SERVICES_FILE, JSON.stringify(services, null, 2));
    
    res.json({
      success: true,
      message: "Service updated successfully!",
      service: services[serviceIndex]
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update service" });
  }
});

// Upgrade to premium service
app.post("/api/service/:id/upgrade", (req, res) => {
  try {
    const services = JSON.parse(fs.readFileSync(SERVICES_FILE, "utf-8"));
    const premiumSubscriptions = JSON.parse(fs.readFileSync(PREMIUM_FILE, "utf-8"));

    const serviceIndex = services.findIndex((s) => String(s.id) === req.params.id);
    if (serviceIndex === -1) return res.status(404).json({ error: "Service not found" });

    const service = services[serviceIndex];
    service.isPremium = true;
    service.premiumSince = new Date().toISOString();
    service.premiumExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Record the subscription
    const subscription = {
      id: Date.now(),
      serviceId: service.id,
      serviceName: service.name,
      amount: 49.99,
      status: 'active',
      startedAt: new Date().toISOString(),
      expiresAt: service.premiumExpires
    };

    premiumSubscriptions.push(subscription);

    fs.writeFileSync(SERVICES_FILE, JSON.stringify(services, null, 2));
    fs.writeFileSync(PREMIUM_FILE, JSON.stringify(premiumSubscriptions, null, 2));

    // Send premium confirmation email
    if (isEmailConfigured()) {
      sendPremiumConfirmationEmail(service, subscription);
    }

    res.json({
      success: true,
      message: "Service upgraded to premium!",
      service: service
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upgrade service." });
  }
});

// Get premium subscription info
app.get("/api/service/:id/premium", (req, res) => {
  try {
    const services = JSON.parse(fs.readFileSync(SERVICES_FILE, "utf-8"));
    const premiumSubscriptions = JSON.parse(fs.readFileSync(PREMIUM_FILE, "utf-8"));

    const service = services.find((s) => String(s.id) === req.params.id);
    if (!service) return res.status(404).json({ error: "Service not found" });

    const subscription = premiumSubscriptions.find(sub =>
      sub.serviceId === service.id && sub.status === 'active'
    );

    res.json({
      isPremium: service.isPremium || false,
      subscription: subscription || null
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get premium info." });
  }
});

// Approve pending service
app.post("/api/approve/:id", (req, res) => {
  try {
    const pending = JSON.parse(fs.readFileSync(PENDING_FILE, "utf-8"));
    const services = JSON.parse(fs.readFileSync(SERVICES_FILE, "utf-8"));

    const index = pending.findIndex((s) => String(s.id) === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Pending service not found" });

    const [service] = pending.splice(index, 1);
    services.push(service);

    fs.writeFileSync(PENDING_FILE, JSON.stringify(pending, null, 2));
    fs.writeFileSync(SERVICES_FILE, JSON.stringify(services, null, 2));

    // LINK APPROVED SERVICE TO USER
    try {
      const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
      const userIndex = users.findIndex(user => user.email === service.email);
      if (userIndex !== -1) {
        if (!users[userIndex].services) {
          users[userIndex].services = [];
        }
        if (!users[userIndex].services.includes(service.id)) {
          users[userIndex].services.push(service.id);
          fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
          console.log(`✅ Approved service ${service.id} linked to user ${service.email}`);
        }
      }
    } catch (userError) {
      console.error("Error linking approved service to user:", userError);
    }

    // Send approval email if configured
    if (isEmailConfigured() && service.email) {
      sendServiceApprovedNotification(service);
    }

    res.json({ message: "Service approved!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to approve service." });
  }
});

// Delete pending service
app.delete("/api/delete/:id", (req, res) => {
  try {
    const pending = JSON.parse(fs.readFileSync(PENDING_FILE, "utf-8"));
    const index = pending.findIndex((s) => String(s.id) === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Pending service not found" });

    const service = pending[index];
    if (service.photo) {
      const photoFile = path.join(__dirname, "public", service.photo);
      if (fs.existsSync(photoFile)) fs.unlinkSync(photoFile);
    }

    pending.splice(index, 1);
    fs.writeFileSync(PENDING_FILE, JSON.stringify(pending, null, 2));
    res.json({ message: "Pending service deleted!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete pending service." });
  }
});

// Delete approved service (ADMIN ONLY)
app.delete("/api/admin/service/:id", (req, res) => {
  try {
    const services = JSON.parse(fs.readFileSync(SERVICES_FILE, "utf-8"));
    const index = services.findIndex((s) => String(s.id) === req.params.id);

    if (index === -1) return res.status(404).json({ error: "Service not found" });

    const service = services[index];

    // Delete the photo file if it exists
    if (service.photo) {
      const photoFile = path.join(__dirname, "public", service.photo);
      if (fs.existsSync(photoFile)) {
        fs.unlinkSync(photoFile);
      }
    }

    // Remove the service from the array
    services.splice(index, 1);
    fs.writeFileSync(SERVICES_FILE, JSON.stringify(services, null, 2));

    res.json({ message: "Service deleted successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete service." });
  }
});

// Subscribe to newsletter
app.post("/api/subscribe", (req, res) => {
  try {
    const subscribers = JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, "utf-8"));
    const email = req.body.email.toLowerCase().trim();

    // Check if already subscribed
    if (subscribers.find(sub => sub.email === email)) {
      return res.status(400).json({ error: "Email already subscribed" });
    }

    const newSubscriber = {
      email: email,
      subscribedAt: new Date().toISOString(),
      active: true
    };

    subscribers.push(newSubscriber);
    fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2));

    // Send welcome email if configured
    if (isEmailConfigured()) {
      sendWelcomeEmail(email);
    }

    res.json({
      success: true,
      message: "Successfully subscribed to newsletter!"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to subscribe." });
  }
});

// Email Functions
async function sendNewServiceNotification(service) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: 'New Service Submission - NDIS Service Finder',
      html: `
        <h2>New Service Submission</h2>
        <p>A new service has been submitted for approval:</p>
        <ul>
          <li><strong>Name:</strong> ${service.name}</li>
          <li><strong>Location:</strong> ${service.location}</li>
          <li><strong>Categories:</strong> ${service.category.join(', ')}</li>
          <li><strong>Registered:</strong> ${service.registered}</li>
          <li><strong>Contact:</strong> ${service.email} | ${service.phone}</li>
        </ul>
        <p>Please review and approve the service in the admin panel.</p>
        <p><a href="http://localhost:3000/admin.html">Go to Admin Panel</a></p>
      `
    };

    await emailTransporter.sendMail(mailOptions);
    console.log('✅ New service notification sent to admin');
  } catch (error) {
    console.error('❌ Error sending email notification:', error);
  }
}

async function sendServiceApprovedNotification(service) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: service.email,
      subject: 'Your Service Has Been Approved - NDIS Service Finder',
      html: `
        <h2>Service Approved! 🎉</h2>
        <p>Great news! Your service "<strong>${service.name}</strong>" has been approved and is now live on NDIS Service Finder.</p>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #b868c6; margin-top: 0;">Service Details</h3>
          <ul>
            <li><strong>Name:</strong> ${service.name}</li>
            <li><strong>Location:</strong> ${service.location}</li>
            <li><strong>Categories:</strong> ${service.category.join(', ')}</li>
            <li><strong>NDIS Registered:</strong> ${service.registered}</li>
          </ul>
        </div>

        <p><strong>View your service:</strong> <a href="http://localhost:3000/service.html?id=${service.id}" style="color: #b868c6; text-decoration: none; font-weight: bold;">Click here to see your listing</a></p>

        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #856404; margin-top: 0;"> 💬 Upgrade to Premium</h4>
          <p>Stand out from the crowd! Upgrade to premium and get:</p>
          <ul>
            <li> ✔ Featured placement in search results</li>
            <li> ✔ Premium badge on your listing</li>
            <li> ✔ Up to 5 photos instead of 1</li>
            <li> ✔ Priority customer support</li>
          </ul>
          <p><a href="http://localhost:3000/premium.html?id=${service.id}" style="background: #b868c6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Learn About Premium</a></p>
        </div>

        <p>Thank you for being part of our community! If you have any questions, please reply to this email.</p>

        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Best regards,<br>
          <strong>The NDIS Service Finder Team</strong>
        </p>
      `
    };

    await emailTransporter.sendMail(mailOptions);
    console.log('✅ Service approval notification sent to:', service.email);
  } catch (error) {
    console.error('❌ Error sending approval email:', error);
  }
}

async function sendPremiumConfirmationEmail(service, subscription) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: service.email,
      subject: 'Welcome to Premium! - NDIS Service Finder',
      html: `
        <h2>Welcome to Premium! ⭐</h2>
        <p>Thank you for upgrading <strong>${service.name}</strong> to a premium listing!</p>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #b868c6; margin-top: 0;">Premium Benefits Activated</h3>
          <ul>
            <li> ⭐ Featured placement in search results</li>
            <li> ⭐ Premium badge displayed on your listing</li>
            <li> ⭐ Increased visibility to potential clients</li>
            <li> ⭐ Priority customer support</li>
          </ul>
        </div>

        <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #0066cc; margin-top: 0;">Subscription Details</h4>
          <p><strong>Service:</strong> ${service.name}</p>
          <p><strong>Plan:</strong> Premium Monthly</p>
          <p><strong>Amount:</strong> $${subscription.amount}</p>
          <p><strong>Expires:</strong> ${new Date(subscription.expiresAt).toLocaleDateString()}</p>
        </div>

        <p><strong>View your premium listing:</strong> <a href="http://localhost:3000/service.html?id=${service.id}" style="color: #b868c6; text-decoration: none; font-weight: bold;">Click here to see your premium listing</a></p>

        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Thank you for your investment in growing your business!<br>
          <strong>The NDIS Service Finder Team</strong>
        </p>
      `
    };

    await emailTransporter.sendMail(mailOptions);
    console.log('✅ Premium confirmation sent to:', service.email);
  } catch (error) {
    console.error('❌ Error sending premium confirmation:', error);
  }
}

async function sendWelcomeEmail(email) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to NDIS Service Finder Newsletter',
      html: `
        <h2>Welcome to NDIS Service Finder! 🎉</h2>
        <p>Thank you for subscribing to our newsletter. You're now part of our community dedicated to connecting people with quality disability services.</p>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #b868c6; margin-top: 0;">What to Expect</h3>
          <ul>
            <li> 📈 Updates on new services in your area</li>
            <li> 📰 NDIS news and policy changes</li>
            <li> 💡 Helpful tips for finding the right support</li>
            <li> 🚀 Special features and platform updates</li>
            <li> 🌟 Service provider spotlights</li>
          </ul>
        </div>

        <p><strong>Explore our services:</strong> <a href="http://localhost:3000" style="color: #b868c6; text-decoration: none; font-weight: bold;">Browse Services</a></p>
        <p><strong>Learn about NDIS:</strong> <a href="http://localhost:3000/blog.html" style="color: #b868c6; text-decoration: none; font-weight: bold;">News & Resources</a></p>

        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          If you have any questions or need assistance finding services, please don't hesitate to contact us.<br><br>
          Best regards,<br>
          <strong>The NDIS Service Finder Team</strong>
        </p>
      `
    };

    await emailTransporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent to:', email);
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
  }
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📧 Email notifications: ${isEmailConfigured() ? '✅ Enabled' : '❌ Disabled (configure .env file)'}`);
  console.log(`👤 User system: ✅ Enabled`);
});