// api/cloudinary-assets.js
// Fetches all images from your Cloudinary account

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
  const API_KEY = process.env.CLOUDINARY_API_KEY;
  const API_SECRET = process.env.CLOUDINARY_API_SECRET;

  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    return res.status(500).json({ 
      error: 'Server configuration error: Missing Cloudinary credentials' 
    });
  }

  try {
    // Get cursor for pagination if provided
    const { cursor } = req.query;
    
    // Build the URL for Cloudinary Admin API
    let url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image?max_results=50`;
    if (cursor) {
      url += `&next_cursor=${cursor}`;
    }

    // Make authenticated request to Cloudinary
    const response = await fetch(url, {
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64'),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Cloudinary API error:', data);
      return res.status(response.status).json({ 
        error: data.error?.message || 'Failed to fetch assets' 
      });
    }

    // Return formatted assets
    const assets = (data.resources || []).map((asset) => ({
      id: asset.public_id,
      url: asset.secure_url,
      thumbnail: asset.secure_url.replace('/upload/', '/upload/c_thumb,w_200,h_200/'),
      width: asset.width,
      height: asset.height,
      format: asset.format,
      bytes: asset.bytes,
      createdAt: asset.created_at,
    }));

    return res.status(200).json({ 
      assets,
      nextCursor: data.next_cursor || null,
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}