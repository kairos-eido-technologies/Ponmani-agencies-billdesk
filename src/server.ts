import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);
    if (url.pathname === "/api/db") {
      if (request.method === "GET") {
        try {
          const { SQLiteDatabaseManager } = await import("./lib/db/sqlite-server-db");
          const store = await SQLiteDatabaseManager.loadFullStore();
          return new Response(JSON.stringify(store), {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store, max-age=0, must-revalidate",
            },
          });
        } catch (err: any) {
          console.error("[API GET /api/db] Error loading database:", err);
          return new Response(JSON.stringify({ error: err.message || "Fetch failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      } else if (request.method === "POST") {
        try {
          const body = await request.json();
          const { action, table, data, id } = body;
          const { SQLiteDatabaseManager } = await import("./lib/db/sqlite-server-db");

          if (action === "upsert") {
            await SQLiteDatabaseManager.upsertRow(table, data);
          } else if (action === "delete") {
            await SQLiteDatabaseManager.deleteRow(table, id);
          } else if (action === "reset") {
            await SQLiteDatabaseManager.clearAllTables();
          }

          return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          console.error("[API POST /api/db] Error executing action:", err);
          return new Response(JSON.stringify({ error: err.message || "Action failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
    }

    // /api/printers — returns list of real installed printers from the OS
    if (url.pathname === "/api/printers" && request.method === "GET") {
      try {
        const { execSync } = await import("child_process") as any;
        let printers: string[] = [];

        try {
          // Windows: use PowerShell to get printer names
          const raw = execSync(
            'powershell -NoProfile -Command "Get-Printer | Select-Object -ExpandProperty Name"',
            { timeout: 5000, encoding: "utf8" }
          ) as string;
          printers = raw
            .split(/\r?\n/)
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);
        } catch {
          // Fallback: try wmic
          try {
            const raw = execSync('wmic printer get name /format:list', {
              timeout: 5000, encoding: "utf8"
            }) as string;
            printers = raw
              .split(/\r?\n/)
              .map((s: string) => s.replace(/^Name=/, "").trim())
              .filter((s: string) => s.length > 0 && !s.includes("="));
          } catch {
            printers = [];
          }
        }

        return new Response(JSON.stringify({ printers }), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ printers: [], error: err.message }), {
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
