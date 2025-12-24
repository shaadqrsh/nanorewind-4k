const getEnv = (key: string, fallback: string) => {
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) return import.meta.env[key];
  return fallback;
};

const BACKEND_URL = getEnv('VITE_BACKEND_URL', 'http://localhost:7860');

/**
 * Restores an image by calling the dedicated backend.
 */
export const restoreImage = async (
  base64Image: string, 
  mimeType: string, 
  prompt: string
): Promise<string> => {
  try {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      throw new Error("User is not authenticated");
    }

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
      if (response.status === 402 || response.status === 403) {
        throw new Error("Quota exceeded or permission denied.");
      }
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.image; // Expecting data URL from backend

  } catch (error) {
    console.error("Restoration Error:", error);
    throw error;
  }
};