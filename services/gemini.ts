const getEnv = (key: string, fallback: string) => {
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) return import.meta.env[key];
  return fallback;
};

const BACKEND_URL = getEnv('VITE_BACKEND_URL', 'http://localhost:7860');

export const restoreImage = async (
  base64Image: string, 
  mimeType: string, 
  prompt: string,
  token: string
): Promise<string> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        image: base64Image,
        mimeType: mimeType,
        prompt: prompt
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