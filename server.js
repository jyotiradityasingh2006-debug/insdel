"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const FILES = {
  products: path.join(DATA_DIR, "products.json"),
  categories: path.join(DATA_DIR, "categories.json"),
  orders: path.join(DATA_DIR, "orders.json"),
  settings: path.join(DATA_DIR, "settings.json"),
  secret: path.join(DATA_DIR, "secret.key")
};

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "insdel123";
const SESSION_HOURS = 12;
const MAX_BODY = 1024 * 1024;

const STATUSES = ["placed", "packed", "out_for_delivery", "delivered", "cancelled"];
const TAGS = ["bestseller", "fresh", "deal"];

const DEFAULT_SETTINGS = {
  storeName: "Insdel Store",
  address: "Shop 12, MG Road, Near City Mall, Bengaluru 560001",
  phone: "+91 98765 43210",
  hours: "7:00 AM – 11:00 PM",
  etaMinutes: 8,
  freeDeliveryAt: 199,
  deliveryFee: 29,
  handlingFee: 2,
  serviceRadiusKm: 3
};

/* ---------------- storage ---------------- */
fs.mkdirSync(DATA_DIR, { recursive: true });

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    return fallback;
  }
}

function writeJson(file, data) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

function seedData() {
  const seed = readJson(path.join(DATA_DIR, "seed.json"), { categories: [], products: [] });
  if (!fs.existsSync(FILES.products)) writeJson(FILES.products, seed.products);
  if (!fs.existsSync(FILES.categories)) writeJson(FILES.categories, seed.categories);
  if (!fs.existsSync(FILES.orders)) writeJson(FILES.orders, []);
  if (!fs.existsSync(FILES.settings)) writeJson(FILES.settings, DEFAULT_SETTINGS);
  if (!fs.existsSync(FILES.secret)) fs.writeFileSync(FILES.secret, crypto.randomBytes(32).toString("hex"));
}

seedData();

const SECRET = fs.readFileSync(FILES.secret, "utf8").trim();

/* ---------------- helpers ---------------- */
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(httpError(413, "Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (e) {
        reject(httpError(400, "Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

/* ---------------- auth ---------------- */
function signToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_HOURS * 3600 * 1000 })).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return payload + "." + sig;
}

function verifyToken(token) {
  if (!token || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number(data.exp) > Date.now();
  } catch (e) {
    return false;
  }
}

function requireAuth(req, res) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!verifyToken(token)) {
    send(res, 401, { error: "Unauthorized. Please log in again." });
    return false;
  }
  return true;
}

function passwordMatches(candidate) {
  const a = crypto.createHash("sha256").update(String(candidate)).digest();
  const b = crypto.createHash("sha256").update(ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

/* ---------------- validation ---------------- */
function cleanString(value, max) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

function validateProduct(input, categories, existingId) {
  const name = cleanString(input.name, 80);
  const unit = cleanString(input.unit, 60) || "1 pc";
  const emoji = cleanString(input.emoji, 16) || "🛒";
  const cat = cleanString(input.cat, 40);
  const price = Math.round(Number(input.price) * 100) / 100;
  const mrp = Math.round(Number(input.mrp) * 100) / 100;
  let tag = cleanString(input.tag, 20) || null;

  if (!name) throw httpError(400, "Product name is required");
  if (!Number.isFinite(price) || price <= 0) throw httpError(400, "Price must be greater than 0");
  if (!Number.isFinite(mrp) || mrp < price) throw httpError(400, "MRP must be greater than or equal to the selling price");
  if (!categories.some((c) => c.id === cat)) throw httpError(400, "Please choose a valid category");
  if (tag && !TAGS.includes(tag)) tag = null;

  return {
    id: existingId || null,
    name,
    unit,
    price,
    mrp,
    emoji,
    cat,
    tag
  };
}

function validateSettings(input, current) {
  const next = { ...current };
  const textFields = ["storeName", "address", "phone", "hours"];
  textFields.forEach((key) => {
    if (input[key] != null) next[key] = cleanString(input[key], key === "address" ? 200 : 80);
  });

  const numeric = {
    etaMinutes: [1, 120, true],
    freeDeliveryAt: [0, 100000, false],
    deliveryFee: [0, 5000, false],
    handlingFee: [0, 1000, false],
    serviceRadiusKm: [0.5, 100, false]
  };
  Object.keys(numeric).forEach((key) => {
    if (input[key] == null) return;
    const [min, max, integer] = numeric[key];
    let value = Number(input[key]);
    if (!Number.isFinite(value)) throw httpError(400, `Invalid value for ${key}`);
    if (integer) value = Math.round(value);
    value = Math.min(max, Math.max(min, value));
    next[key] = value;
  });

  if (!next.storeName) throw httpError(400, "Store name is required");
  if (!next.address) throw httpError(400, "Store address is required");
  return next;
}

/* ---------------- orders ---------------- */
function newOrderId(orders) {
  const used = new Set(orders.map((o) => o.id));
  for (let i = 0; i < 50; i += 1) {
    const id = "#INS" + Math.floor(1000 + Math.random() * 9000);
    if (!used.has(id)) return id;
  }
  return "#INS" + Date.now().toString().slice(-6);
}

function createOrder(body, products, settings, orders) {
  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (!rawItems.length) throw httpError(400, "Cart is empty");

  const merged = new Map();
  rawItems.forEach((item) => {
    const id = cleanString(item && item.id, 60);
    const qty = Math.floor(Number(item && item.qty));
    if (!id || !Number.isFinite(qty) || qty < 1) return;
    if (qty > 99) throw httpError(400, "Maximum quantity per item is 99");
    merged.set(id, Math.min(99, (merged.get(id) || 0) + qty));
  });
  if (!merged.size) throw httpError(400, "No valid items in cart");

  const items = [];
  let mrpTotal = 0;
  let itemTotal = 0;

  merged.forEach((qty, id) => {
    const product = products.find((p) => p.id === id);
    if (!product) throw httpError(400, "One of the items is no longer available. Please refresh your cart.");
    mrpTotal += product.mrp * qty;
    itemTotal += product.price * qty;
    items.push({
      id: product.id,
      name: product.name,
      unit: product.unit,
      emoji: product.emoji,
      price: product.price,
      mrp: product.mrp,
      qty
    });
  });

  const customerInput = body.customer || {};
  const customer = {
    name: cleanString(customerInput.name, 60),
    phone: cleanString(customerInput.phone, 20),
    address: cleanString(customerInput.address, 200),
    note: cleanString(customerInput.note, 120)
  };
  if (customer.name.length < 2) throw httpError(400, "Please enter your name");
  if (customer.phone.replace(/\D/g, "").length < 7) throw httpError(400, "Please enter a valid phone number");
  if (customer.address.length < 5) throw httpError(400, "Please enter a delivery address");

  const delivery = itemTotal >= settings.freeDeliveryAt ? 0 : settings.deliveryFee;
  const handling = settings.handlingFee;
  const total = Math.round((itemTotal + delivery + handling) * 100) / 100;
  const discount = Math.round((mrpTotal - itemTotal) * 100) / 100;

  const now = new Date().toISOString();
  const order = {
    id: newOrderId(orders),
    items,
    customer,
    totals: {
      mrpTotal: Math.round(mrpTotal * 100) / 100,
      itemTotal: Math.round(itemTotal * 100) / 100,
      discount,
      delivery,
      handling,
      total
    },
    status: "placed",
    etaMinutes: settings.etaMinutes,
    createdAt: now,
    updatedAt: now
  };

  orders.push(order);
  return order;
}

/* ---------------- api ---------------- */
async function handleApi(req, res, parts) {
  try {
    const method = req.method;

    /* auth */
    if (parts[1] === "admin" && parts[2] === "login" && method === "POST") {
      const body = await readBody(req);
      if (!passwordMatches(body.password || "")) throw httpError(401, "Incorrect password");
      return send(res, 200, { token: signToken(), expiresInHours: SESSION_HOURS });
    }

    if (parts[1] === "admin" && parts[2] === "session" && method === "GET") {
      if (!requireAuth(req, res)) return;
      return send(res, 200, { ok: true });
    }

    /* categories */
    if (parts[1] === "categories" && parts.length === 2 && method === "GET") {
      return send(res, 200, readJson(FILES.categories, []));
    }

    /* products */
    if (parts[1] === "products") {
      const products = readJson(FILES.products, []);
      const categories = readJson(FILES.categories, []);

      if (parts.length === 2 && method === "GET") {
        return send(res, 200, products);
      }

      if (parts.length === 2 && method === "POST") {
        if (!requireAuth(req, res)) return;
        const body = await readBody(req);
        const product = validateProduct(body, categories);
        let id;
        do {
          id = "p" + Date.now().toString(36) + crypto.randomBytes(2).toString("hex");
        } while (products.some((p) => p.id === id));
        product.id = id;
        products.push(product);
        writeJson(FILES.products, products);
        return send(res, 201, product);
      }

      if (parts.length === 3) {
        const id = decodeURIComponent(parts[2]);
        const index = products.findIndex((p) => p.id === id);
        if (index === -1) throw httpError(404, "Product not found");

        if (method === "PUT") {
          if (!requireAuth(req, res)) return;
          const body = await readBody(req);
          const product = validateProduct(body, categories, id);
          products[index] = product;
          writeJson(FILES.products, products);
          return send(res, 200, product);
        }

        if (method === "DELETE") {
          if (!requireAuth(req, res)) return;
          const [removed] = products.splice(index, 1);
          writeJson(FILES.products, products);
          return send(res, 200, { ok: true, removed: removed.id });
        }
      }
    }

    /* settings */
    if (parts[1] === "settings" && parts.length === 2) {
      if (method === "GET") {
        return send(res, 200, readJson(FILES.settings, DEFAULT_SETTINGS));
      }
      if (method === "PUT") {
        if (!requireAuth(req, res)) return;
        const body = await readBody(req);
        const current = readJson(FILES.settings, DEFAULT_SETTINGS);
        const next = validateSettings(body, current);
        writeJson(FILES.settings, next);
        return send(res, 200, next);
      }
    }

    /* orders */
    if (parts[1] === "orders") {
      const orders = readJson(FILES.orders, []);

      if (parts.length === 2 && method === "GET") {
        if (!requireAuth(req, res)) return;
        const sorted = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return send(res, 200, sorted);
      }

      if (parts.length === 2 && method === "POST") {
        const body = await readBody(req);
        const products = readJson(FILES.products, []);
        const settings = readJson(FILES.settings, DEFAULT_SETTINGS);
        const order = createOrder(body, products, settings, orders);
        writeJson(FILES.orders, orders);
        console.log(`[order] ${order.id} · ${order.items.length} item(s) · ₹${order.totals.total} · ${order.customer.name}`);
        return send(res, 201, {
          orderId: order.id,
          total: order.totals.total,
          etaMinutes: order.etaMinutes,
          status: order.status,
          store: {
            name: settings.storeName,
            address: settings.address,
            phone: settings.phone
          }
        });
      }

      if (parts.length === 4 && parts[3] === "status" && method === "PATCH") {
        if (!requireAuth(req, res)) return;
        const id = decodeURIComponent(parts[2]);
        const body = await readBody(req);
        const status = cleanString(body.status, 30);
        if (!STATUSES.includes(status)) throw httpError(400, "Invalid order status");
        const order = orders.find((o) => o.id === id);
        if (!order) throw httpError(404, "Order not found");
        order.status = status;
        order.updatedAt = new Date().toISOString();
        writeJson(FILES.orders, orders);
        return send(res, 200, order);
      }

      if (parts.length === 3 && method === "DELETE") {
        if (!requireAuth(req, res)) return;
        const id = decodeURIComponent(parts[2]);
        const index = orders.findIndex((o) => o.id === id);
        if (index === -1) throw httpError(404, "Order not found");
        orders.splice(index, 1);
        writeJson(FILES.orders, orders);
        return send(res, 200, { ok: true });
      }
    }

    throw httpError(404, "API route not found");
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error("[api]", err);
    send(res, status, { error: err.message || "Server error" });
  }
}

/* ---------------- static files ---------------- */
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json"
};

const BLOCKED = new Set(["server.js", "package.json", "package-lock.json", "seed.js"]);

function serveStatic(req, res, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Method not allowed");
  }

  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch (e) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Bad request");
  }

  if (rel === "/admin/") {
    res.writeHead(301, { Location: "/admin" });
    return res.end();
  }
  if (rel === "/" || rel === "") rel = "/index.html";
  if (rel === "/admin") rel = "/admin.html";

  const segments = rel.split("/").filter(Boolean);
  if (segments.some((s) => s.startsWith(".")) || (segments[0] === "data") || (segments.length === 1 && BLOCKED.has(segments[0]))) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Not found");
  }

  let filePath = path.join(ROOT, rel);
  if (!path.normalize(filePath).startsWith(ROOT + path.sep)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Forbidden");
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      return res.end("<h1>404</h1><p>This page could not be found. <a href=\"/\">Go to store</a></p>");
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    const headers = {
      "Content-Type": type,
      "Content-Length": stat.size,
      "Cache-Control": ext === ".html" ? "no-store" : "no-cache"
    };
    res.writeHead(200, headers);
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(filePath)
      .on("error", () => {
        res.destroy();
      })
      .pipe(res);
  });
}

/* ---------------- server ---------------- */
const server = http.createServer((req, res) => {
  let url;
  try {
    url = new URL(req.url, "http://localhost");
  } catch (e) {
    res.writeHead(400);
    return res.end("Bad request");
  }

  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
    const parts = url.pathname.split("/").filter(Boolean);
    handleApi(req, res, parts);
    return;
  }

  serveStatic(req, res, url.pathname);
});

server.listen(PORT, HOST, () => {
  console.log("");
  console.log("  insdel server running");
  console.log(`  Store:  http://localhost:${PORT}/`);
  console.log(`  Admin:  http://localhost:${PORT}/admin`);
  console.log(`  Admin password: ${ADMIN_PASSWORD}${process.env.ADMIN_PASSWORD ? "" : "  (default — set ADMIN_PASSWORD to change)"}`);
  console.log("");
});
