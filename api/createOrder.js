// api/createOrder.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { summary, designFileUrl, customerName } = req.body || {};

    if (!summary || !customerName) {
      return res.status(400).json({ error: "Missing order summary or customer name" });
    }

    const properties = {
      "Customer Name": {
        rich_text: [
          {
            type: "text",
            text: { content: customerName.slice(0, 1900) },
          },
        ],
      },
      "Order Summary": {
        rich_text: [
          {
            type: "text",
            text: { content: summary.slice(0, 1900) }, // Notion text safety limit
          },
        ],
      },
      Status: {
        select: { name: "New" }, // must match your Notion Status option
      },
    };

    if (designFileUrl) {
      properties["Design File"] = {
        files: [
          {
            type: "external",
            name: "design-file",
            external: { url: designFileUrl },
          },
        ],
      };
    }

    const notionResponse = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { database_id: process.env.NOTION_DB_ID },
        properties,
      }),
    });

    if (!notionResponse.ok) {
      const detail = await notionResponse.text();
      console.error("Notion error:", detail);
      return res
        .status(500)
        .json({ error: "Notion API error", detail });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
