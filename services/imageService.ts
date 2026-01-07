import { ImageResult } from "../types";

const PEXELS_API_KEY = '7GHv14VpKoMunMLaJI9FKrTd5DM13FCuSiV8P8h5qdfrE9zslEefmevx';

/**
 * Fetches high-quality educational images related to the query from Pexels.
 */
export const fetchPexelsImages = async (query: string): Promise<ImageResult[]> => {
  try {
    const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=16`, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return data.photos.map((photo: any) => ({
      title: photo.alt || "Educational Illustration",
      url: photo.src.large,
      source: 'Pexels'
    }));
  } catch (error) {
    console.error("Error fetching images from Pexels:", error);
    return [];
  }
};