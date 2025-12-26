require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { GoogleGenAI } = require('@google/genai');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 7860;

// Configuration
const NEON_AUTH_URL = process.env.NEON_AUTH_URL;
const MAX_CREDITS = 3;
const REFILL_MS = 24 * 60 * 60 * 1000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        credits INTEGER DEFAULT 3,
        last_refill TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Database initialized.");
  } catch (err) {
    console.error("DB Error:", err);
  }
}
initDb();

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Verification middleware using Neon Auth JWT
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.sub) throw new Error("Invalid token");
    
    req.user = { 
      id: decoded.sub,
      email: decoded.email || 'user@example.com'
    };

    // Ensure user exists in our local record
    // We use a separate try/catch for the DB operation to distinguish auth vs db errors
    try {
        await pool.query(
        'INSERT INTO users (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
        [req.user.id]
        );
    } catch (dbErr) {
        console.error("User creation failed:", dbErr);
        // Continue anyway, maybe the user exists or select will handle it
    }

    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    res.status(403).json({ error: 'Auth failed' });
  }
};

// Endpoint for frontend to get the Auth URL
app.get('/api/auth-config', (req, res) => {
  if (!NEON_AUTH_URL) {
    return res.status(500).json({ error: 'NEON_AUTH_URL not configured on server' });
  }
  res.json({ domain: NEON_AUTH_URL });
});

app.get('/api/quota', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT credits, last_refill FROM users WHERE user_id = $1', [req.user.id]);
    
    // Handle case where user might not exist despite middleware (e.g. race condition or insert fail)
    let profile = result.rows[0];
    if (!profile) {
        // Fallback: Create and return default
        await pool.query(
            'INSERT INTO users (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
            [req.user.id]
        );
        profile = { credits: MAX_CREDITS, last_refill: new Date() };
    }

    const now = Date.now();
    const lastRefill = new Date(profile.last_refill).getTime();
    const elapsed = now - lastRefill;
    const gained = Math.floor(elapsed / REFILL_MS);
    
    let currentCredits = Math.min(MAX_CREDITS, profile.credits + gained);
    // Calculate next reset time if credits are not full
    let nextReset = currentCredits < MAX_CREDITS 
        ? lastRefill + ((gained + 1) * REFILL_MS) 
        : null;
        
    res.json({ allowed: currentCredits > 0, remaining: currentCredits, nextReset });
  } catch (err) {
    console.error("Quota Error:", err);
    res.status(500).json({ error: 'Quota fetch failed' });
  }
});

app.post('/api/restore', authenticateToken, async (req, res) => {
  const { image, mimeType, prompt } = req.body;
  try {
    const deductResult = await pool.query(`
      WITH updated AS (
        UPDATE users 
        SET 
          credits = CASE 
            WHEN (credits + floor(extract(epoch from (now() - last_refill)) * 1000 / $2)) >= 1 
            THEN LEAST($1, credits + floor(extract(epoch from (now() - last_refill)) * 1000 / $2)) - 1
            ELSE credits 
          END,
          last_refill = CASE 
            WHEN (credits + floor(extract(epoch from (now() - last_refill)) * 1000 / $2)) >= $1 THEN now()
            ELSE last_refill + (floor(extract(epoch from (now() - last_refill)) * 1000 / $2) * interval '1 day')
          END
        WHERE user_id = $3 
          AND (credits + floor(extract(epoch from (now() - last_refill)) * 1000 / $2)) >= 1
        RETURNING user_id
      )
      SELECT EXISTS(SELECT 1 FROM updated) as success;
    `, [MAX_CREDITS, REFILL_MS, req.user.id]);

    if (!deductResult.rows[0].success) return res.status(402).json({ error: 'Out of credits' });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ inlineData: { data: image, mimeType: mimeType } }, { text: prompt }] },
    });

    let restoredBase64 = null;
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) { restoredBase64 = part.inlineData.data; break; }
    }
    if (!restoredBase64) throw new Error("No image returned");
    res.json({ image: `data:image/png;base64,${restoredBase64}` });
  } catch (err) {
    console.error("Restore Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => console.log(`Backend on port ${port}`));