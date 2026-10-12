"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Link2, Link2Off, Loader2, RefreshCw } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { API_BASE } from "@/lib/auth";
import {
  disconnectCfoIntegration,
  fetchCfoIntegrationStatus,
  startCfoAuthorization,
  type CfoIntegrationStatus,
} from "@/lib/cfo-integration-api";

const API_ORIGIN = new URL(API_BASE).origin;

const CFO_MESSAGE_TYPE = "productsense-cfo-connected";

export function CfoConnectCard() {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<CfoIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!user) {
      setStatus(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await fetchCfoIntegrationStatus();
      setStatus(next);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load connection status."
      );
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      void loadStatus();
    }
  }, [authLoading, loadStatus]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== API_ORIGIN && event.origin !== window.location.origin) {
        return;
      }
      if (
        event.data &&
        typeof event.data === "object" &&
        (event.data as { type?: string }).type === CFO_MESSAGE_TYPE
      ) {
        void loadStatus();
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [loadStatus]);

  const handleConnect = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await startCfoAuthorization();
      if (result.status === "connected") {
        await loadStatus();
        return;
      }
      const popup = window.open(
        result.authorizationUrl,
        "cfo-oauth",
        "width=520,height=720"
      );
      if (!popup) {
        setError(
          "Popup blocked. Allow popups for this site or open the link manually."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start authorization."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    setError(null);
    try {
      await disconnectCfoIntegration();
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed.");
    } finally {
      setBusy(false);
    }
  };

  const connected = status?.status === "connected";

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Link2 className="size-4 text-primary" aria-hidden />
              cfo.ai workspace
            </CardTitle>
            <CardDescription>
              Connect your cfo.ai account so ProductSense can publish financial
              datasets and run calculations through MCP.
            </CardDescription>
          </div>
          {!loading && status && (
            <Badge variant={connected ? "default" : "secondary"}>
              {connected ? "Connected" : "Not connected"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {authLoading || loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Checking connection…
          </div>
        ) : !user ? (
          <p className="text-sm text-muted-foreground">
            Sign in to connect cfo.ai to your ProductSense account.
          </p>
        ) : connected ? (
          <dl className="space-y-1 text-sm">
            {status.orgId && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Workspace ID</dt>
                <dd className="font-mono text-xs">{status.orgId}</dd>
              </div>
            )}
            {status.connectedAt && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Connected</dt>
                <dd>{new Date(status.connectedAt).toLocaleString()}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            You will sign in on cfo.ai in a separate window and approve access
            for ProductSense.
          </p>
        )}
        {error && (
          <p className="text-sm text-destructive" role="alert">{error}</p>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        {user && (
          <>
            {connected ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void handleDisconnect()}
              >
                {busy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Link2Off className="size-3.5" />
                )}
                Disconnect
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => void handleConnect()}
              >
                {busy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ExternalLink className="size-3.5" />
                )}
                Connect cfo.ai
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy || loading}
              onClick={() => void loadStatus()}
            >
              <RefreshCw className="size-3.5" />
              Refresh
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
