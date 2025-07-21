
const API_URL = 'https://aiapi-production-e072.up.railway.app/image-gen/image-gen/generate-image';

/**
 * Calls the external image generation API.
 * @param prompt The text prompt for the image.
 * @returns A base64 encoded string of the generated image.
 */
export const generateImage = async (prompt: string): Promise<string> => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Image generation API failed with status ${response.status}: ${errorBody}`);
        }

        const data = await response.json();
        
        if (!data.image_b64) {
            throw new Error('Image generation API returned an invalid response.');
        }

        return data.image_b64;
    } catch (error) {
        console.error('Error generating image:', error);
        throw error;
    }
};
