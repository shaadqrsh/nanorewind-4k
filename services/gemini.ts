// API runs as same-origin Vercel serverless functions under /api.

export const restoreImage = async (
  base64Image: string, 
  mimeType: string, 
  options: { process: string; chiaroscuro: boolean; matte: boolean },
  token: string
): Promise<string> => {
  try {
    const response = await fetch(`/api/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        image: base64Image,
        mimeType: mimeType,
        process: options.process,
        chiaroscuro: options.chiaroscuro,
        matte: options.matte
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    return data.image;
  } catch (error) {
    console.error("Restoration Error:", error);
    throw error;
  }
};