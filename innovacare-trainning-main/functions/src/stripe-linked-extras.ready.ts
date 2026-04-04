import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";

/**
 * READY TO PASTE
 *
 * Bridge API for a separate backend project.
 * Calls remote callable functions server-to-server to avoid browser CORS issues.
 *
 * Required env vars:
 * - REMOTE_FUNCTIONS_BASE_URL
 *   example: https://us-central1-innovacare-training.cloudfunctions.net
 *
 * Required secret:
 * - BRIDGE_SHARED_KEY
 *
 * Frontend must send:
 * - x-bridge-key: <same as BRIDGE_SHARED_KEY>
 * - authorization: Bearer <Firebase ID token> (from current signed-in user)
 */

const BRIDGE_SHARED_KEY = defineSecret("BRIDGE_SHARED_KEY");

type JsonRecord = Record<string, unknown>;

function getAllowedOrigin(reqOrigin?: string): string {
  const fallback = "http://localhost:4200";
  const allowed = (process.env.BRIDGE_ALLOWED_ORIGINS || fallback)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  if (!reqOrigin) return allowed[0] || fallback;
  return allowed.includes(reqOrigin) ? reqOrigin : allowed[0] || fallback;
}

function setCors(req: any, res: any): void {
  const origin = getAllowedOrigin(req.headers.origin as string | undefined);
  res.set("Access-Control-Allow-Origin", origin);
  res.set("Vary", "Origin");
  res.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type,Authorization,x-bridge-key");
}

function getBearerToken(req: any): string {
  const auth = String(req.headers.authorization || "");
  if (!auth.startsWith("Bearer ")) return "";
  return auth.slice(7).trim();
}

function assertBridgeKey(req: any): void {
  const incoming = String(req.headers["x-bridge-key"] || "").trim();
  const expected = BRIDGE_SHARED_KEY.value();

  if (!incoming || incoming !== expected) {
    throw new Error("invalid-bridge-key");
  }
}

async function callRemoteCallable(
  functionName: string,
  data: JsonRecord,
  idToken: string,
): Promise<JsonRecord> {
  const baseUrl = String(process.env.REMOTE_FUNCTIONS_BASE_URL || "").trim();
  if (!baseUrl) {
    throw new Error("REMOTE_FUNCTIONS_BASE_URL is missing");
  }

  const url = `${baseUrl.replace(/\/$/, "")}/${functionName}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({data}),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: payload,
    };
  }

  // Firebase callable format is usually { result: ... }.
  return {
    ok: true,
    status: response.status,
    result: (payload as any)?.result ?? payload,
  };
}

async function handleProxy(req: any, res: any, functionName: string): Promise<void> {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({error: "Method Not Allowed"});
    return;
  }

  try {
    assertBridgeKey(req);

    const idToken = getBearerToken(req);
    if (!idToken) {
      res.status(401).json({error: "Missing Bearer token"});
      return;
    }

    const body = (req.body || {}) as {data?: JsonRecord};
    const data = (body.data || {}) as JsonRecord;

    const result = await callRemoteCallable(functionName, data, idToken);
    const status = Number(result.status || 200);
    res.status(status).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    const status = message === "invalid-bridge-key" ? 403 : 500;
    res.status(status).json({error: message});
  }
}

export const apiGetMyCart = onRequest(
  {region: "us-central1", invoker: "public", secrets: [BRIDGE_SHARED_KEY]},
  async (req, res) => handleProxy(req, res, "getMyCart"),
);

export const apiMergeLocalCart = onRequest(
  {region: "us-central1", invoker: "public", secrets: [BRIDGE_SHARED_KEY]},
  async (req, res) => handleProxy(req, res, "mergeLocalCart"),
);

export const apiCreateCheckoutSession = onRequest(
  {region: "us-central1", invoker: "public", secrets: [BRIDGE_SHARED_KEY]},
  async (req, res) => handleProxy(req, res, "createCheckoutSession"),
);
