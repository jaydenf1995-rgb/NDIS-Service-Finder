# Vercel Blob Storage Setup Guide

## Overview
This application uses Vercel Blob Storage for persistent image uploads. Without this setup, uploaded images will be stored in ephemeral `/tmp` storage and will be lost between deployments.

## Setup Instructions

### 1. Install Dependencies
The `@vercel/blob` package has been added to `package.json`. Run:
```bash
npm install
```

### 2. Create Vercel Blob Store

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project
3. Go to **Storage** tab
4. Click **Create Database** or **Add Storage**
5. Select **Blob** from the options
6. Give it a name (e.g., "ndis-service-images")
7. Click **Create**

### 3. Get Your Blob Token

1. In your Vercel project dashboard, go to **Settings** → **Environment Variables**
2. Look for `BLOB_READ_WRITE_TOKEN` (it should be automatically added when you create a Blob store)
3. If it's not there, you can find it in the Blob store settings

### 4. Add Environment Variable

Add the following to your `.env` file (for local development):
```
BLOB_READ_WRITE_TOKEN=your_token_here
```

**For Vercel deployment:**
- The token should be automatically available as an environment variable
- If not, add it manually in Vercel dashboard → Settings → Environment Variables

### 5. Verify Setup

Once configured:
- ✅ New uploads will be stored in Vercel Blob Storage (persistent)
- ✅ Images will have URLs like: `https://[hash].public.blob.vercel-storage.com/...`
- ✅ Images will persist across deployments
- ✅ Old images in `/tmp` will still work (fallback)

## How It Works

- **With BLOB_READ_WRITE_TOKEN**: Images are uploaded to Vercel Blob Storage (persistent)
- **Without token (local dev)**: Images are saved to `public/uploads/` (local file system)
- **Without token (Vercel)**: Images are saved to `/tmp/uploads/` (ephemeral - will be lost)

## Troubleshooting

### Images still showing 404
1. Check that `BLOB_READ_WRITE_TOKEN` is set in your environment variables
2. Verify the Blob store is created in Vercel dashboard
3. Check server logs for upload errors
4. Old images uploaded before setup will still need the `/uploads/:filename` route

### Local Development
For local development, images will be saved to `public/uploads/` even without the token. This is fine for testing.

