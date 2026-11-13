import type { VercelRequest, VercelResponse } from './_lib/vercel.js';
import { requireUser } from './_lib/auth.js';
import { withRateLimit } from './_lib/rateLimit.js';
import { ai, IMAGE_MODEL } from './_lib/gemini.js';
import { archiveRestoration, RestorationDTO } from './_lib/archive.js';

const PROCESSES = ['standard', 'silver-gelatin', 'albumen', 'cyanotype', 'autochrome', 'kodachrome'];
const UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// Checks the file's leading bytes match its declared type, so arbitrary data
// labelled "image/png" is rejected before it costs a credit or gets stored.
const matchesSignature = (base64: string, mimeType: string): boolean => {
  const b = Buffer.from(base64.slice(0, 24), 'base64');
  switch (mimeType) {
    case 'image/png':
      return b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/jpeg':
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case 'image/webp':
      return b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP';
    default:
      return false;
  }
};

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ctx = await requireUser(req, res);
  if (!ctx) return;

  const { image, mimeType, originalName, chiaroscuro, matte } = req.body || {};
  // Validate before deducting a credit, so a bad request never costs one.
  if (
    typeof image !== 'string' || !image ||
    !UPLOAD_TYPES.includes(mimeType) || !matchesSignature(image, mimeType)
  ) {
    return res.status(400).json({ error: 'Upload a JPG, PNG or WebP image.' });
  }
  const process: string = PROCESSES.includes(req.body.process) ? req.body.process : 'standard';

  try {
    // Atomic credit deduction is handled server-side by the SECURITY DEFINER RPC.
    const { data: result, error: rpcError } = await ctx.supabase.rpc('deduct_credits');

    if (rpcError) throw rpcError;

    if (!result.success) {
      return res.status(402).json({ error: result.error || 'Out of credits' });
    }

    // Build the aesthetic styling directives
    const styleDirectives: string[] = [];

    switch (process) {
      case 'silver-gelatin':
        styleDirectives.push("Develop the restored image as a classic, high-contrast monochrome silver gelatin print. Apply rich, deep blacks (silver-halide style), bright white highlights, and a full spectrum of smooth gray midtones. Absolutely no color should remain.");
        break;
      case 'albumen':
        styleDirectives.push("Develop the restored image as an antique albumen print. Apply a rich, warm, sepia-toned monochrome color palette, featuring characteristic brownish-gold and amber hues. The final output should evoke 19th-century photographic tones.");
        break;
      case 'cyanotype':
        styleDirectives.push("Develop the restored image as a historic cyanotype print. The entire image must be rendered in a monochromatic Prussian blue wash, ranging from deep indigo shadows to bright, blue-tinted highlights.");
        break;
      case 'autochrome':
        styleDirectives.push("Render the restored image in the style of Lumière Autochrome (early 20th-century color plate photography). Apply soft, pastel, slightly desaturated colors, a warm glowing highlight, and a subtle organic color-grain texture.");
        break;
      case 'kodachrome':
        styleDirectives.push("Develop the restored image with the iconic Kodachrome 64 slide film aesthetic. Emphasize rich, highly saturated warm tones (particularly reds and yellows), deep high-contrast shadows, and a classic filmic rendition.");
        break;
      case 'standard':
      default:
        styleDirectives.push("Maintain natural, realistic, and balanced colors. Correct any vintage color casts, yellowing, fading, or off-balance tinting. The final image should have modern, neutral color tones.");
        break;
    }

    if (chiaroscuro) {
      styleDirectives.push("Enhance the lighting with a dramatic chiaroscuro effect. Make the shadows deeper and more pronounced, and brighten the key light source to create strong contrast and drama.");
    }
    if (matte) {
      styleDirectives.push("Render the image with a fine-art matte paper finish. Soften the contrast slightly, roll off the highlights smoothly, and give the image the velvety, low-glare texture of a vintage dry-plate emulsion print.");
    }

    // System instruction (default restoration) always run by default.
    const systemInstruction = 
      "You are an expert photographic restoration model. " +
      "Analyze the provided image and restore it to pristine condition. " +
      "Automatically perform the following restoration tasks: " +
      "1. Erase all signs of physical damage: scratches, dust, spots, tears, fold lines, cracks, and mold. " +
      "2. Clean up noise: remove digital sensor noise, scan artifacts, and grain, while keeping fine details. " +
      "3. Optical correction: deblur, sharpen soft focus, resolve lens distortion, and recover sharp details. " +
      "4. Facial recovery: reconstruct facial details (eyes, irises, skin texture, lips) naturally and accurately, preserving the subject's original identity and expression. " +
      "5. Output high-fidelity, high-resolution 4K results matching the original composition, lighting, and aspect ratio.";

    const finalPrompt = `${systemInstruction}\n\nStyle and processing instructions:\n${styleDirectives.join(" ")}`;

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts: [{ inlineData: { data: image, mimeType } }, { text: finalPrompt }] },
    });

    const restoredPart = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    const restoredBase64 = restoredPart?.inlineData?.data;
    if (!restoredBase64) throw new Error('No image returned');
    const restoredMime = restoredPart?.inlineData?.mimeType || 'image/png';

    // The credit is already spent, so a failed archive save must not fail the
    // request. The client tells the user to download the result instead.
    let restoration: RestorationDTO | null = null;
    try {
      restoration = await archiveRestoration(ctx.supabase, ctx.user.id, {
        original: {
          base64: image,
          mimeType,
          name: typeof originalName === 'string'
            ? originalName.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 200) || null
            : null,
        },
        restored: { base64: restoredBase64, mimeType: restoredMime },
        treatment: { process, chiaroscuro: !!chiaroscuro, matte: !!matte },
      });
    } catch (archiveErr) {
      console.error('Archive save failed:', archiveErr);
    }

    res.json({ image: `data:${restoredMime};base64,${restoredBase64}`, restoration });
  } catch (err) {
    console.error('Restore error:', err);
    res.status(500).json({ error: 'Restoration failed. Please try again.' });
  }
}

export default withRateLimit(handler, { name: 'restore', limit: 5, windowMs: 10 * 60 * 1000 });
