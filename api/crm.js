export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "https://vexoralabs05.github.io";
  const origin = req.headers.origin || "";
  if (origin && origin !== allowedOrigin) {
    return res.status(403).json({ ok: false, error: "Origin not allowed." });
  }
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed." });

  const scriptUrl = process.env.APPS_SCRIPT_URL;
  const bridgeSecret = process.env.CRM_BRIDGE_SECRET;
  if (!scriptUrl || !bridgeSecret) {
    return res.status(500).json({ ok: false, error: "API environment is not configured." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!body || typeof body.action !== "string" || typeof body.idToken !== "string") {
      return res.status(400).json({ ok: false, error: "Invalid request." });
    }

    const upstream = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      redirect: "follow",
      body: JSON.stringify({
        secret: bridgeSecret,
        action: body.action,
        idToken: body.idToken,
        payload: body.payload || {}
      })
    });

    const raw = await upstream.text();
    let result;
    try { result = JSON.parse(raw); }
    catch { throw new Error("CRM backend returned an unreadable response. Check the Apps Script deployment."); }

    if (!upstream.ok || !result || result.ok !== true) {
      return res.status(400).json({ ok: false, error: result?.error || "CRM request failed." });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || "Unexpected API error." });
  }
}
