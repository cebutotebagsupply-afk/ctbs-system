export default async function handler(req, res) {
  const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
  const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID;

  if (!JSONBIN_API_KEY || !JSONBIN_BIN_ID) {
    return res.status(500).json({ 
      error: 'Server configuration error: Missing JSONBin credentials' 
    });
  }

  const binUrl = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

  if (req.method === 'GET') {
    try {
      const response = await fetch(binUrl, {
        headers: { 'X-Master-Key': JSONBIN_API_KEY },
      });
      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ error: 'Failed to fetch products' });
      }
      const products = data.record?.products || [];
      return res.status(200).json({ products });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { products } = req.body;
      if (!Array.isArray(products)) {
        return res.status(400).json({ error: 'Products must be an array' });
      }
      const response = await fetch(binUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_API_KEY,
        },
        body: JSON.stringify({ products }),
      });
      if (!response.ok) {
        return res.status(response.status).json({ error: 'Failed to save products' });
      }
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}