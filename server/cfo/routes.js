import { authMiddleware } from "../auth.js";
import { clearCfoCredentials } from "./credentials.js";
import { getCfoConnectionStatus, verifyCfoConnection } from "./client.js";
import { consumeOAuthState } from "./oauth-provider.js";
import { beginCfoOAuth, pendingCfoTransports } from "./oauth-flow.js";

function clientAppOrigin() {
  const raw = process.env.CLIENT_ORIGIN || "http://localhost:3000";
  return raw.split(",")[0].trim();
}

function htmlPage(title, body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${body}</body></html>`;
}

/**
 * @param {import('express').Express} app
 */
export function registerCfoIntegrationRoutes(app) {
  app.get("/integrations/cfo/status", authMiddleware, async (req, res) => {
    try {
      const status = await getCfoConnectionStatus(req.user.id);
      res.json(status);
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: "unavailable", error: "status_failed" });
    }
  });

  app.post("/integrations/cfo/connect/start", authMiddleware, async (req, res) => {
    try {
      const result = await beginCfoOAuth(req.user.id);
      if (result.kind === "connected") {
        res.json({
          status: "connected",
          ...result.verified,
        });
        return;
      }
      res.json({
        status: "authorize",
        authorizationUrl: result.authorizationUrl,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "connect_failed" });
    }
  });

  app.get("/integrations/cfo/connect", authMiddleware, async (req, res) => {
    try {
      const result = await beginCfoOAuth(req.user.id);
      if (result.kind === "connected") {
        res.json({ status: "connected", ...result.verified });
        return;
      }
      res.redirect(result.authorizationUrl);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "connect_failed" });
    }
  });

  app.get("/integrations/cfo/callback", async (req, res) => {
    const code = typeof req.query?.code === "string" ? req.query.code : null;
    const state = typeof req.query?.state === "string" ? req.query.state : null;
    const oauthError =
      typeof req.query?.error === "string" ? req.query.error : null;

    if (oauthError) {
      res
        .status(400)
        .send(
          htmlPage(
            "cfo.ai connection failed",
            `<p>Authorization was denied or failed (${oauthError}). Close this window and try again from ProductSense.</p>`
          )
        );
      return;
    }

    if (!code || !state) {
      res.status(400).send(htmlPage("Invalid callback", "<p>Missing code or state.</p>"));
      return;
    }

    const consumed = await consumeOAuthState(state);
    if (!consumed) {
      res
        .status(400)
        .send(htmlPage("Invalid or expired", "<p>This link has expired. Start again from ProductSense.</p>"));
      return;
    }

    const transport = pendingCfoTransports.get(state);
    pendingCfoTransports.delete(state);

    if (!transport) {
      res
        .status(400)
        .send(
          htmlPage(
            "Session expired",
            "<p>Complete the connection from ProductSense while signed in, then approve in the browser.</p>"
          )
        );
      return;
    }

    try {
      await transport.finishAuth(code);
      await transport.close();
      const verified = await verifyCfoConnection(consumed.userId);
      const workspace = verified.primaryOrg?.name ?? "verified";
      const appOrigin = clientAppOrigin();
      res.send(
        htmlPage(
          "Connected to cfo.ai",
          `<p>ProductSense is now connected to cfo.ai.</p><p>Workspace: ${workspace}</p><p>You can close this window.</p>
<script>
try {
  if (window.opener) {
    window.opener.postMessage({ type: "productsense-cfo-connected" }, "${appOrigin}");
  }
} catch (_) {}
setTimeout(function () { window.close(); }, 1500);
</script>`
        )
      );
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .send(htmlPage("Connection failed", "<p>Could not finish authorization. Try again.</p>"));
    }
  });

  app.post("/integrations/cfo/disconnect", authMiddleware, async (req, res) => {
    try {
      await clearCfoCredentials(req.user.id);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "disconnect_failed" });
    }
  });
}
