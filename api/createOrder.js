// api/createOrder.js
// Vercel Serverless Function for Notion Integration

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get environment variables
  const NOTION_API_KEY = process.env.NOTION_API_KEY;
  const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

  // Validate environment variables
  if (!NOTION_API_KEY) {
    console.error('Missing NOTION_API_KEY environment variable');
    return res.status(500).json({ error: 'Server configuration error: Missing Notion API Key' });
  }

  if (!NOTION_DATABASE_ID) {
    console.error('Missing NOTION_DATABASE_ID environment variable');
    return res.status(500).json({ error: 'Server configuration error: Missing Notion Database ID' });
  }

  try {
    const { summary, designFile, designFiles = [], customerName } = req.body;

    // We may append a note to the summary if some files are skipped
    let finalSummary = summary;

    // Validate required fields
    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ error: 'Customer name is required' });
    }

    if (!summary || !summary.trim()) {
      return res.status(400).json({ error: 'Order summary is required' });
    }

    // Build the Notion page properties
    const properties = {
      // Customer Name - Title property (default Name column)
      'Customer Name': {
        title: [
          {
            text: {
              content: customerName.trim(),
            },
          },
        ],
      },
      // Order Summary - Rich Text property
      'Order Summary': {
        rich_text: [
          {
            text: {
              content: (finalSummary || '').substring(0, 2000), // Notion has a 2000 char limit per text block
            },
          },
        ],
      },
      // Status - Status property (set to "New")
      Status: {
        status: {
          name: 'New',
        },
      },
    };

    // Add Design Files if provided (stored as data URLs so Notion hosts them directly)
    const designFilePayloads = [];
    const allDesignFiles = [...designFiles];

    // Backwards compatibility for single designFile payloads
    if (designFile) {
      allDesignFiles.push(designFile);
    }

    const MAX_FILE_BYTES = 5 * 1024 * 1024;   // max per file
    const MAX_TOTAL_BYTES = 5 * 1024 * 1024;  // max combined
    const skippedDesignFiles = [];
    let totalBytes = 0;

    const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dvlwr8kro';
    const CLOUD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'CTBS2025';

    const uploadDesignToCloudinary = async (file) => {
      try {
        const formData = new FormData();
        formData.append('file', file.data);
        formData.append('upload_preset', CLOUD_PRESET);
        formData.append('folder', 'ctbs-design-uploads');

        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.secure_url) {
          console.error('Cloudinary upload failed:', uploadData);
          skippedDesignFiles.push(file.name || 'Design File');
          return null;
        }
        return uploadData.secure_url;
      } catch (err) {
        console.error('Cloudinary upload error:', err);
        skippedDesignFiles.push(file.name || 'Design File');
        return null;
      }
    };

    for (const file of allDesignFiles) {
      if (!file?.data) continue;

      const reportedSize = Number(file.size) || 0;
      const base64Data = file.data.split(',')[1] || '';
      const estimatedBytes = Math.ceil((base64Data.length * 3) / 4);
      const effectiveSize = reportedSize || estimatedBytes;

      // Per-file hard limit
      if (effectiveSize > MAX_FILE_BYTES) {
        return res.status(400).json({
          error: `Design file "${file.name || 'File'}" exceeds 5MB limit`,
        });
      }

      // Total limit across all design files
      if (totalBytes + effectiveSize > MAX_TOTAL_BYTES) {
        return res.status(400).json({
          error: 'Total design files exceed 5MB limit. Please upload smaller or fewer files.',
        });
      }

      totalBytes += effectiveSize;

      const uploadedUrl = await uploadDesignToCloudinary(file);
      if (!uploadedUrl) continue;

      designFilePayloads.push({
        type: 'external',
        name: file.name || 'Design File',
        external: {
          url: uploadedUrl,
        },
      });
    }

    if (designFilePayloads.length > 0) {
      properties['Design File'] = {
        files: designFilePayloads,
      };
    }

    if (skippedDesignFiles.length > 0) {
      const note = `Design files not attached (upload failed or too large): ${skippedDesignFiles.join(', ')}`;
      finalSummary = `${summary || ''}\n\n${note}`.substring(0, 2000);
    }

    // Create the page in Notion
    const notionResponse = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: {
          database_id: NOTION_DATABASE_ID,
        },
        properties,
      }),
    });

    const notionData = await notionResponse.json();

    if (!notionResponse.ok) {
      console.error('Notion API Error:', {
        status: notionResponse.status,
        data: notionData,
      });

      // Provide helpful error messages
      let errorMessage = 'Failed to create order in Notion';
      
      if (notionData.code === 'validation_error') {
        errorMessage = `Notion validation error: ${notionData.message}. Please check your database properties match the expected format.`;
      } else if (notionData.code === 'unauthorized') {
        errorMessage = 'Notion API key is invalid or the integration does not have access to the database.';
      } else if (notionData.code === 'object_not_found') {
        errorMessage = 'Notion database not found. Please check your database ID and ensure the integration has access.';
      } else if (notionData.message) {
        errorMessage = notionData.message;
      }

      return res.status(notionResponse.status).json({ 
        error: errorMessage,
        detail: notionData.message || 'Unknown error',
      });
    }

    // Success!
    return res.status(200).json({ 
      success: true, 
      message: 'Order created successfully',
      pageId: notionData.id,
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      detail: error.message,
    });
  }
}
