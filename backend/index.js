require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const port = process.env.PORT || 7860;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Init Clients
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY; // Use ANON key, not Service Role

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase URL or Anon Key");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Helper to create a client scoped to the user's token
const getUserClient = (token) => {
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    });
};

const MAX_CREDITS = 3;
const REFILL_MS = 24 * 60 * 60 * 1000;

// --- Auth Routes (Proxy) ---

app.post('/api/auth/signup', async (req, res) => {
    const { email, password } = req.body;
    // For signup, we use a basic anon client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.auth.signUp({ email, password });
    
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) return res.status(401).json({ error: error.message });
    res.json(data);
});

app.post('/api/auth/logout', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
        const supabase = getUserClient(token);
        await supabase.auth.signOut();
    }
    res.json({ success: true });
});

app.get('/api/auth/me', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });

    const supabase = getUserClient(token);
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) return res.status(401).json({ error: 'Invalid token' });
    res.json({ user });
});

// --- Quota Routes ---

app.get('/api/quota', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });

    const supabase = getUserClient(token);
    
    // We get the profile. Since we are using the User's token, RLS applies.
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .single();

    if (error || !profile) {
        // If profile doesn't exist yet (race condition on signup trigger), return default "empty" or "full"
        // Returning 0 to be safe
        return res.json({ allowed: false, remaining: 0 });
    }

    // Logic for display purposes (Read-only logic)
    // The "Write" logic happens in the DB Function during restore
    const now = Date.now();
    const lastRefill = new Date(profile.last_refill).getTime();
    const elapsed = now - lastRefill;
    const gained = Math.floor(elapsed / REFILL_MS);
    
    let currentCredits = profile.credits + gained;
    if (currentCredits > MAX_CREDITS) currentCredits = MAX_CREDITS;
    
    let nextReset = undefined;
    if (currentCredits < MAX_CREDITS) {
        // next reset is when the current 24h block ends
        nextReset = lastRefill + ((gained + 1) * REFILL_MS);
    }

    res.json({
        allowed: currentCredits > 0,
        remaining: currentCredits,
        nextReset
    });
});

// --- Restore Route ---

app.post('/api/restore', async (req, res) => {
  const { image, mimeType, prompt } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  try {
    const supabase = getUserClient(token);

    // 1. Attempt to deduct credit securely via RPC
    // We do NOT manually calculate and update here because we don't have the Service Role key.
    // We rely on a Postgres function `attempt_restore` that runs with 'security definer' privileges on the DB side.
    const { data: success, error: rpcError } = await supabase.rpc('attempt_deduct_credit');

    if (rpcError) {
        console.error("RPC Error", rpcError);
        return res.status(500).json({ error: 'Database error handling credits.' });
    }

    if (!success) {
        return res.status(402).json({ error: 'Daily credit limit reached.' });
    }

    // 2. Call Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: image,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    // Extract image
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
    console.error(err);
    // If Gemini fails, we should ideally refund the credit.
    // Since we don't have a service key, we'd need another RPC 'refund_credit'.
    // For simplicity in this demo, we accept the risk or add:
    // await supabase.rpc('refund_credit');
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});