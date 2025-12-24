require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { GoogleGenAI } = require('@google/genai');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pkg = require('./package.json');

const app = express();
const port = process.env.PORT || 7860;

console.log(`Starting NanoRewind Backend v${pkg.version}`);

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'nano-rewind-secret-key-4k';
const MAX_CREDITS = 3;
const REFILL_MS = 24 * 60 * 60 * 1000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database Pool (Neon)
if (!process.env.DATABASE_URL) {
  console.error("CRITICAL ERROR: DATABASE_URL environment variable is missing!");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
});

// Test connection and initialize schema
async function initDb() {
  try {
    const client = await pool.connect();
    console.log("Successfully connected to Postgres database.");
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        credits INTEGER DEFAULT 3,
        last_refill TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Database schema verified/initialized.");
    client.release();
  } catch (err) {
    console.error("DATABASE INITIALIZATION ERROR:", err.message);
    console.error("Please verify your DATABASE_URL and ensure Neon allows connections.");
  }
}

initDb();

// AI Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Middleware: Authenticate JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// --- Auth Routes ---

app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );
    res.status(201).json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: `Server Database Error: ${err.message}` });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      session: { access_token: token },
      user: { id: user.id, email: user.email }
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: `Login failed: ${err.message}` });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true });
});

// --- Quota & Restoration ---

app.get('/api/quota', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT credits, last_refill FROM users WHERE id = $1', [req.user.id]);
    const profile = result.rows[0];

    if (!profile) return res.status(404).json({ error: 'User profile not found' });

    const now = Date.now();
    const lastRefill = new Date(profile.last_refill).getTime();
    const elapsed = now - lastRefill;
    const gained = Math.floor(elapsed / REFILL_MS);
    
    let currentCredits = profile.credits + gained;
    if (currentCredits > MAX_CREDITS) currentCredits = MAX_CREDITS;
    
    let nextReset = null;
    if (currentCredits < MAX_CREDITS) {
      nextReset = lastRefill + ((gained + 1) * REFILL_MS);
    }

    res.json({
      allowed: currentCredits > 0,
      remaining: currentCredits,
      nextReset
    });
  } catch (err) {
    console.error("QUOTA ERROR:", err);
    res.status(500).json({ error: 'Failed to fetch quota' });
  }
});

app.post('/api/restore', authenticateToken, async (req, res) => {
  const { image, mimeType, prompt } = req.body;

  try {
    // 1. Atomically deduct credit using Postgres logic
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
        WHERE id = $3 
          AND (credits + floor(extract(epoch from (now() - last_refill)) * 1000 / $2)) >= 1
        RETURNING id
      )
      SELECT EXISTS(SELECT 1 FROM updated) as success;
    `, [MAX_CREDITS, REFILL_MS, req.user.id]);

    if (!deductResult.rows[0].success) {
      return res.status(402).json({ error: 'Daily credit limit reached.' });
    }

    // 2. Call Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { inlineData: { data: image, mimeType: mimeType } },
          { text: prompt },
        ],
      },
    });

    let restoredImageBase64 = null;
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          restoredImageBase64 = part.inlineData.data;
          break;
        }
      }
    }

    if (!restoredImageBase64) {
      throw new Error("Gemini returned no image.");
    }

    res.json({ image: `data:image/png;base64,${restoredImageBase64}` });

  } catch (err) {
    console.error("RESTORATION ERROR:", err);
    res.status(500).json({ error: err.message || 'Restoration failed' });
  }
});

app.listen(port, () => {
  console.log(`Neon Backend listening on port ${port}`);
});