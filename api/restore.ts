import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from './_lib/auth';
import { ai, IMAGE_MODEL } from './_lib/gemini';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ctx = await requireUser(req, res);
  if (!ctx) return;

  const { image, mimeType, prompt } = req.body || {};
  try {
    // Atomic credit deduction is handled server-side by the SECURITY DEFINER RPC.
    const { data: result, error: rpcError } = await ctx.supabase.rpc('deduct_credits');

    if (rpcError) throw rpcError;

    if (!result.success) {
      return res.status(402).json({ error: result.error || 'Out of credits' });
    }

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts: [{ inlineData: { data: image, mimeType } }, { text: prompt }] },
    });

    let restoredBase64: string | null = null;
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        restoredBase64 = part.inlineData.data;
        break;
      }
    }
    if (!restoredBase64) throw new Error('No image returned');
    res.json({ image: `data:image/png;base64,${restoredBase64}` });
  } catch (err) {
    console.error('Restore error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
}
