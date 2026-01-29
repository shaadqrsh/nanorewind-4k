require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const port = process.env.PORT || 7860;

// Configuration
const MAX_CREDITS = 3;
const REFILL_MS = 24 * 60 * 60 * 1000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize Supabase Clients
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase URL or Anon Key.");
  process.exit(1);
}

const globalSupabase = createClient(supabaseUrl, supabaseAnonKey);
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- HELPERS ---

// Helper to ensure profile exists using a user-scoped client
const ensureProfileExists = async (session) => {
  if (!session || !session.user || !session.access_token) return;

  try {
    const scopedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${session.access_token}` } },
      db: { schema: 'nanorewind-4k' }
    });

    const { data: profile, error: fetchErr } = await scopedClient
      .from('profiles')
      .select('user_id')
      .eq('user_id', session.user.id)
      .single();

    if (!profile && (!fetchErr || fetchErr.code === 'PGRST116')) {
      await scopedClient.from('profiles').insert([{ user_id: session.user.id }]);
    }
  } catch (err) {
    console.error("Profile creation failed:", err.message);
  }
};

// --- AUTH ENDPOINTS ---

app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name, redirectTo } = req.body;
  try {
    const { data, error } = await globalSupabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: redirectTo
      }
    });

    if (error) throw error;

    // If auto-confirm is on, we get a session immediately. Initialize profile.
    if (data.session) {
      await ensureProfileExists(data.session);
    }

    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data, error } = await globalSupabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // REVERTED BEHAVIOR: Always ensure profile exists on login.
    // This allows users from other apps in the same project to "migrate" purely by logging in.
    if (data.session) {
      await ensureProfileExists(data.session);
    }

    res.json(data);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

app.get('/api/auth/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const { data: { user }, error } = await globalSupabase.auth.getUser(token);
    if (error || !user) throw new Error("Invalid token");

    // Also check here just in case
    await ensureProfileExists({ user, access_token: token });

    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: "Invalid session" });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    await globalSupabase.auth.signOut(token).catch(() => { });
  }
  res.json({ success: true });
});

app.post('/api/auth/update', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  const { name, password } = req.body;
  const updates = {};
  if (name !== undefined) updates.data = { name };
  if (password !== undefined) updates.password = password;

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No updates provided' });

  try {
    const { error } = await globalSupabase.auth.updateUser(token, updates);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- MIDDLEWARE ---

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      db: { schema: 'nanorewind-4k' }
    });

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) throw new Error("Invalid token");

    req.user = { id: user.id, email: user.email };
    req.supabase = supabase;

    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    res.status(403).json({ error: 'Auth failed' });
  }
};

// --- QUOTA ---

function calculateCredits(profile) {
  const now = Date.now();
  const lastRefill = new Date(profile.last_refill).getTime();
  const elapsed = now - lastRefill;
  const gained = Math.floor(elapsed / REFILL_MS);

  let currentCredits = Math.min(MAX_CREDITS, profile.credits + gained);

  let nextReset = currentCredits < MAX_CREDITS
    ? lastRefill + ((gained + 1) * REFILL_MS)
    : null;

  return { currentCredits, nextReset };
}

app.get('/api/quota', authenticateToken, async (req, res) => {
  try {
    const { data: profile, error } = await req.supabase
      .from('profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error || !profile) {
      return res.status(500).json({ error: 'Profile not found' });
    }

    const { currentCredits, nextReset } = calculateCredits(profile);
    res.json({ allowed: currentCredits > 0, remaining: currentCredits, nextReset });
  } catch (err) {
    console.error("Quota Error:", err);
    res.status(500).json({ error: 'Quota fetch failed' });
  }
});

// --- RESTORE ---

app.post('/api/restore', authenticateToken, async (req, res) => {
  const { image, mimeType, prompt } = req.body;
  try {
    const { data: result, error: rpcError } = await req.supabase
      .rpc('deduct_credits');

    if (rpcError) throw rpcError;

    if (!result.success) {
      return res.status(402).json({ error: result.error || 'Out of credits' });
    }

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