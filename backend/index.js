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

// Initialize Supabase Admin Client
// We need Service Role Key to bypass RLS (though for now we only read/write profiles as admin)
// and to manage users if needed.
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Service Role Key.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'nanorewind-4k' }
});

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Verification middleware using Supabase Auth
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) throw new Error("Invalid token");

    req.user = {
      id: user.id,
      email: user.email
    };

    // Ensure profile exists
    // We try to select, if missing we insert.
    const { data: profile, error: fetchErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!profile && (!fetchErr || fetchErr.code === 'PGRST116')) {
      // Create profile
      await supabase.from('profiles').insert([{ user_id: user.id }]);
    }

    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    res.status(403).json({ error: 'Auth failed' });
  }
};

// Endpoint for frontend to get the Auth URL - Not needed for Supabase as URL is in frontend env
// But we keep the route to not break frontend if it calls it, though we removed the call in frontend auth.ts
app.get('/api/auth-config', (req, res) => {
  // Deprecated for Supabase flow, but keeping for compatibility if needed? 
  // Actually frontend auth.ts was updated to NOT call this.
  res.json({ message: "Use Supabase client in frontend" });
});

// Helper to calculate credits
function calculateCredits(profile) {
  const now = Date.now();
  const lastRefill = new Date(profile.last_refill).getTime();
  const elapsed = now - lastRefill;
  const gained = Math.floor(elapsed / REFILL_MS);

  let currentCredits = Math.min(MAX_CREDITS, profile.credits + gained);

  // Calculate next reset time
  // If we are full, no next reset. 
  // If not full, it's (gained + 1) * REFILL_MS from last_refill
  let nextReset = currentCredits < MAX_CREDITS
    ? lastRefill + ((gained + 1) * REFILL_MS)
    : null;

  return { currentCredits, gained, nextReset, lastRefill };
}

app.get('/api/quota', authenticateToken, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error || !profile) {
      // Should have been created in middleware
      return res.status(500).json({ error: 'Profile not found' });
    }

    const { currentCredits, nextReset } = calculateCredits(profile);

    res.json({ allowed: currentCredits > 0, remaining: currentCredits, nextReset });
  } catch (err) {
    console.error("Quota Error:", err);
    res.status(500).json({ error: 'Quota fetch failed' });
  }
});

app.post('/api/restore', authenticateToken, async (req, res) => {
  const { image, mimeType, prompt } = req.body;
  try {
    // 1. Fetch Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (!profile) return res.status(500).json({ error: 'Profile missing' });

    // 2. Calculate Credits
    let { currentCredits, gained, lastRefill } = calculateCredits(profile);

    if (currentCredits < 1) {
      return res.status(402).json({ error: 'Out of credits' });
    }

    // 3. Deduct & Update
    const newCredits = currentCredits - 1;
    let newLastRefill;

    // Logic: 
    // If we were at max (or would have reached max), reset timeline to NOW.
    // Else (we were replenishing), assume we consumed one, so we just shift the timeline?
    // Actually, to be fair:
    // If we gained credits, we should advance last_refill so users don't get "double dip".
    // Example: last_refill was 25 hours ago. Gained 1. Remaining surplus 1 hour.
    // If we use 'now', we lose that 1 hour.
    // If we use 'last_refill + 24h', we keep the 1 hour progress.
    // BUT if we reached cap, we stop accumulating, so last_refill should be reset to avoid "instant refill" since the "gained" was capped.

    if (profile.credits + gained >= MAX_CREDITS) {
      // We hit the cap. Reset logic to now.
      newLastRefill = new Date().toISOString();
    } else {
      // We haven't hit cap, just advance the refill time by the days we gained
      // so `now - newLastRefill` still = `surplus time`
      const advanceMs = gained * REFILL_MS;
      newLastRefill = new Date(lastRefill + advanceMs).toISOString();
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        credits: newCredits,
        last_refill: newLastRefill
      })
      .eq('user_id', req.user.id);

    if (updateErr) throw updateErr;

    // 4. Generate Content
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
    // Refund? (Complex to handle failure vs credits, for now strict deduction)
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => console.log(`Backend on port ${port}`));