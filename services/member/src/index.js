const http = require("node:http");
const { randomUUID } = require("node:crypto");

const serviceName = process.env.SERVICE_NAME || "member";
const appEnv = process.env.APP_ENV || "local";
const port = Number(process.env.PORT || 8080);
const startedAt = Date.now();

let requestCount = 0;

const members = new Map([
  ["M001", { id: "M001", name: "Lin Chen", level: "GOLD", points: 1680, coupons: ["CAT-COFFEE-10", "WEEKDAY-SEAT"] }],
  ["M002", { id: "M002", name: "Qiao Yu", level: "SILVER", points: 620, coupons: ["CAT-CAKE-5"] }],
  ["M003", { id: "M003", name: "Zhou Ning", level: "PLATINUM", points: 3260, coupons: ["PRIVATE-ROOM", "CAT-SET-20"] }],
  ["M004", { id: "M004", name: "Meng Xia", level: "BRONZE", points: 180, coupons: [] }],
  ["M005", { id: "M005", name: "Han Yue", level: "SILVER", points: 880, coupons: ["BIRTHDAY-CAKE"] }],
]);

const accounts = new Map([
  ["M001", { accountId: "M001", role: "customer", password: "123456", memberId: "M001", displayName: "Lin Chen" }],
  ["M002", { accountId: "M002", role: "customer", password: "123456", memberId: "M002", displayName: "Qiao Yu" }],
  ["M003", { accountId: "M003", role: "customer", password: "123456", memberId: "M003", displayName: "Zhou Ning" }],
  ["M004", { accountId: "M004", role: "customer", password: "123456", memberId: "M004", displayName: "Meng Xia" }],
  ["M005", { accountId: "M005", role: "customer", password: "123456", memberId: "M005", displayName: "Han Yue" }],
  ["A001", { accountId: "A001", role: "admin", password: "admin123", displayName: "Store Manager" }],
  ["A002", { accountId: "A002", role: "admin", password: "admin123", displayName: "Operations Lead" }],
]);

function publicAccount(account) {
  if (!account) return null;
  const { password, ...safeAccount } = account;
  return safeAccount;
}

function jsonLog(fields) {
  console.log(JSON.stringify({ service: serviceName, env: appEnv, ...fields }));
}

function healthPayload() {
  return {
    status: "ok",
    service: serviceName,
    env: appEnv,
    uptimeSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(3)),
  };
}

function metricsPayload() {
  return [
    "# HELP nekocafe_member_requests_total Total member service requests.",
    "# TYPE nekocafe_member_requests_total counter",
    `nekocafe_member_requests_total ${requestCount}`,
    "# HELP nekocafe_members_total Current members in memory.",
    "# TYPE nekocafe_members_total gauge",
    `nekocafe_members_total ${members.size}`,
    "# HELP nekocafe_accounts_total Current accounts in memory.",
    "# TYPE nekocafe_accounts_total gauge",
    `nekocafe_accounts_total ${accounts.size}`,
    "",
  ].join("\n");
}

function sendCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Trace-Id");
}

function sendJson(res, status, body, traceId) {
  const payload = Buffer.from(JSON.stringify(body));
  sendCorsHeaders(res);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": payload.length,
    "X-Trace-Id": traceId,
  });
  res.end(payload);
}

function sendText(res, status, body, contentType) {
  const payload = Buffer.from(body);
  sendCorsHeaders(res);
  res.writeHead(status, {
    "Content-Type": contentType,
    "Content-Length": payload.length,
  });
  res.end(payload);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("payload_too_large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("invalid_json"));
      }
    });
    req.on("error", reject);
  });
}

function nextMemberId() {
  const maxNumber = [...members.keys()].reduce((max, id) => {
    const match = id.match(/^M(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `M${String(maxNumber + 1).padStart(3, "0")}`;
}

function nextAdminId() {
  const maxNumber = [...accounts.keys()].reduce((max, id) => {
    const match = id.match(/^A(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `A${String(maxNumber + 1).padStart(3, "0")}`;
}

function login(payload) {
  const accountId = String(payload.accountId || "").trim().toUpperCase();
  const password = String(payload.password || "");
  const account = accounts.get(accountId);

  if (!account || account.password !== password) {
    return [401, { error: "invalid_credentials" }];
  }

  return [200, { session: publicAccount(account), member: members.get(account.memberId) || null }];
}

function register(payload) {
  const role = payload.role === "admin" ? "admin" : "customer";
  const name = String(payload.name || "").trim();
  const password = String(payload.password || "").trim();

  if (!name || password.length < 6) {
    return [400, { error: "invalid_registration", message: "name and a 6+ character password are required" }];
  }

  if (role === "admin") {
    if (payload.inviteCode !== "NEKO-ADMIN") {
      return [403, { error: "invalid_invite_code" }];
    }
    const accountId = nextAdminId();
    const account = { accountId, role, password, displayName: name };
    accounts.set(accountId, account);
    return [201, { session: publicAccount(account), member: null }];
  }

  const memberId = nextMemberId();
  const member = {
    id: memberId,
    name,
    level: "BRONZE",
    points: 0,
    coupons: ["WELCOME-DRINK"],
  };
  const account = {
    accountId: memberId,
    role,
    password,
    memberId,
    displayName: name,
  };
  members.set(memberId, member);
  accounts.set(memberId, account);
  return [201, { session: publicAccount(account), member }];
}

async function route(req, res) {
  requestCount += 1;
  const started = Date.now();
  const traceId = req.headers["x-trace-id"] || randomUUID().replaceAll("-", "");
  const url = new URL(req.url, "http://127.0.0.1");

  try {
    if (req.method === "OPTIONS") {
      sendCorsHeaders(res);
      res.writeHead(204);
      res.end();
    } else if (req.method === "GET" && ["/healthz", "/readyz"].includes(url.pathname)) {
      sendJson(res, 200, healthPayload(), traceId);
    } else if (req.method === "GET" && url.pathname === "/metrics") {
      sendText(res, 200, metricsPayload(), "text/plain; version=0.0.4");
    } else if (req.method === "GET" && url.pathname === "/members") {
      sendJson(res, 200, { items: [...members.values()] }, traceId);
    } else if (req.method === "GET" && url.pathname.startsWith("/members/")) {
      const id = decodeURIComponent(url.pathname.split("/")[2]).toUpperCase();
      const member = members.get(id);
      sendJson(res, member ? 200 : 404, member || { error: "member_not_found" }, traceId);
    } else if (req.method === "POST" && url.pathname === "/auth/login") {
      const [status, body] = login(await readJson(req));
      sendJson(res, status, body, traceId);
    } else if (req.method === "POST" && url.pathname === "/auth/register") {
      const [status, body] = register(await readJson(req));
      sendJson(res, status, body, traceId);
    } else {
      sendJson(res, 404, { error: "not_found" }, traceId);
    }
  } catch (error) {
    sendJson(res, 400, { error: error.message || "bad_request" }, traceId);
  } finally {
    jsonLog({
      method: req.method,
      path: url.pathname,
      trace_id: traceId,
      duration_ms: Date.now() - started,
    });
  }
}

function createServer() {
  return http.createServer(route);
}

if (require.main === module) {
  createServer().listen(port, "0.0.0.0", () => {
    jsonLog({ event: "startup", port });
  });
}

module.exports = {
  accounts,
  createServer,
  healthPayload,
  login,
  members,
  metricsPayload,
  register,
};
