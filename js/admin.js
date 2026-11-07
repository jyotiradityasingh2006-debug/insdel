(function () {
  "use strict";

  const TOKEN_KEY = "insdel-admin-token";
  const $ = (id) => document.getElementById(id);

  const STATUS_META = {
    placed: { label: "Placed", cls: "status-placed" },
    packed: { label: "Packed", cls: "status-packed" },
    out_for_delivery: { label: "Out for delivery", cls: "status-out_for_delivery" },
    delivered: { label: "Delivered", cls: "status-delivered" },
    cancelled: { label: "Cancelled", cls: "status-cancelled" }
  };
  const STATUS_ORDER = ["placed", "packed", "out_for_delivery", "delivered", "cancelled"];

  const state = {
    token: localStorage.getItem(TOKEN_KEY) || "",
    products: [],
    categories: [],
    orders: [],
    settings: {},
    view: "dashboard",
    orderFilter: "all",
    productQuery: "",
    editingId: null
  };

  /* ---------------- utils ---------------- */
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function money(n) {
    return "₹" + Number(n || 0).toLocaleString("en-IN");
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  function fmtTime(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }

  function categoryOf(id) {
    return state.categories.find((c) => c.id === id) || { name: id, emoji: "🛒", bg: "#eef4ef" };
  }

  let toastTimer;
  function toast(message, isError) {
    const el = $("adminToast");
    el.textContent = message;
    el.classList.toggle("error", !!isError);
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => (el.hidden = true), 260);
    }, 2200);
  }

  async function api(path, options) {
    const opts = Object.assign({}, options);
    const headers = Object.assign({}, opts.headers || {});
    if (opts.body) headers["Content-Type"] = "application/json";
    if (state.token) headers.Authorization = "Bearer " + state.token;

    const res = await fetch(path, Object.assign({}, opts, { headers }));
    let data = {};
    try {
      data = await res.json();
    } catch (e) {
      data = {};
    }

    if (res.status === 401 && state.token) {
      logout();
      throw new Error("Your session expired. Please log in again.");
    }
    if (!res.ok) throw new Error(data.error || "Request failed. Please try again.");
    return data;
  }

  /* ---------------- auth ---------------- */
  function showLogin() {
    $("appView").hidden = true;
    $("loginView").hidden = false;
    setTimeout(() => $("loginPassword").focus(), 60);
  }

  function showApp() {
    $("loginView").hidden = true;
    $("appView").hidden = false;
  }

  function logout() {
    state.token = "";
    localStorage.removeItem(TOKEN_KEY);
    showLogin();
  }

  $("showPassBtn").addEventListener("click", () => {
    const input = $("loginPassword");
    input.type = input.type === "password" ? "text" : "password";
    $("showPassBtn").textContent = input.type === "password" ? "👁️" : "🙈";
  });

  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("loginBtn");
    const errorEl = $("loginError");
    errorEl.hidden = true;
    btn.disabled = true;
    btn.textContent = "Signing in…";
    try {
      const data = await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ password: $("loginPassword").value })
      });
      state.token = data.token;
      localStorage.setItem(TOKEN_KEY, data.token);
      $("loginPassword").value = "";
      await loadAll();
      showApp();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = "Sign in →";
    }
  });

  $("logoutBtn").addEventListener("click", logout);

  /* ---------------- data ---------------- */
  async function loadAll() {
    const [products, categories, orders, settings] = await Promise.all([
      api("/api/products"),
      api("/api/categories"),
      api("/api/orders"),
      api("/api/settings")
    ]);
    state.products = products;
    state.categories = categories;
    state.orders = orders;
    state.settings = settings;
    renderAll();
  }

  async function refreshProducts() {
    state.products = await api("/api/products");
    renderProducts();
    renderStats();
  }

  async function refreshOrders() {
    state.orders = await api("/api/orders");
    renderStats();
    renderOrderFilters();
    renderOrders();
    renderRecentOrders();
  }

  function renderAll() {
    renderStats();
    renderRecentOrders();
    renderStoreInfo();
    renderProducts();
    renderOrderFilters();
    renderOrders();
    fillSettings();
    $("storeLabel").textContent = state.settings.storeName || "Insdel Store";
    renderCategoryOptions();
  }

  /* ---------------- dashboard ---------------- */
  function renderStats() {
    const todayKey = new Date().toDateString();
    const todays = state.orders.filter((o) => new Date(o.createdAt).toDateString() === todayKey);
    const valid = todays.filter((o) => o.status !== "cancelled");
    const revenue = valid.reduce((sum, o) => sum + Number(o.totals.total || 0), 0);
    const pending = state.orders.filter((o) => ["placed", "packed", "out_for_delivery"].includes(o.status));
    const categories = new Set(state.products.map((p) => p.cat));

    $("statRevenue").textContent = money(revenue);
    $("statRevenueSub").textContent = valid.length
      ? `${valid.length} paid order${valid.length === 1 ? "" : "s"} today`
      : "No orders yet today";
    $("statOrders").textContent = todays.length;
    $("statOrdersSub").textContent = `${state.orders.length} order${state.orders.length === 1 ? "" : "s"} all time`;
    $("statPending").textContent = pending.length;
    $("statPendingSub").textContent = pending.length ? "Needs your attention" : "All caught up 🎉";
    $("statProducts").textContent = state.products.length;
    $("statProductsSub").textContent = `Across ${categories.size} categories`;

    const badge = $("pendingBadge");
    if (pending.length) {
      badge.textContent = pending.length;
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }

  function statusPill(status) {
    const meta = STATUS_META[status] || { label: status, cls: "" };
    return `<span class="status-pill ${meta.cls}">${esc(meta.label)}</span>`;
  }

  function renderRecentOrders() {
    const recent = state.orders.slice(0, 6);
    $("recentOrdersBody").innerHTML = recent
      .map(
        (o) => `
        <tr>
          <td><b>${esc(o.id)}</b><small>${fmtTime(o.createdAt)}</small></td>
          <td>${esc(o.customer.name)}<small>${o.items.reduce((n, i) => n + i.qty, 0)} items</small></td>
          <td><b>${money(o.totals.total)}</b></td>
          <td>${statusPill(o.status)}</td>
        </tr>`
      )
      .join("");
    $("recentEmpty").hidden = recent.length > 0;
  }

  function renderStoreInfo() {
    const s = state.settings;
    $("storeInfo").innerHTML = `
      <div class="store-info-row"><span class="ico">🏪</span><div><b>${esc(s.storeName || "Insdel Store")}</b><span>${esc(s.address || "")}</span></div></div>
      <div class="store-info-row"><span class="ico">🕖</span><div><b>${esc(s.hours || "—")}</b><span>Open all days</span></div></div>
      <div class="store-info-row"><span class="ico">⚡</span><div><b>${esc(s.etaMinutes || 8)} minute delivery</b><span>Within ${esc(s.serviceRadiusKm || 3)} km · Free above ${money(s.freeDeliveryAt)}</span></div></div>
      <div class="store-info-row"><span class="ico">📞</span><div><b>${esc(s.phone || "—")}</b><span>Store support</span></div></div>`;
  }

  /* ---------------- products ---------------- */
  function renderCategoryOptions() {
    $("pCat").innerHTML = state.categories
      .map((c) => `<option value="${esc(c.id)}">${esc(c.emoji)} ${esc(c.name)}</option>`)
      .join("");
  }

  function renderProducts() {
    const q = state.productQuery.trim().toLowerCase();
    const items = state.products.filter((p) => {
      const cat = categoryOf(p.cat);
      return !q || p.name.toLowerCase().includes(q) || p.unit.toLowerCase().includes(q) || cat.name.toLowerCase().includes(q);
    });

    $("productsBody").innerHTML = items
      .map((p) => {
        const cat = categoryOf(p.cat);
        const tag = p.tag ? `<span class="tag-pill tag-${esc(p.tag)}">${esc(p.tag)}</span>` : `<span class="muted-dash">—</span>`;
        return `
        <tr>
          <td>
            <div class="product-cell">
              <div class="product-thumb" style="background:${esc(cat.bg)}">${esc(p.emoji)}</div>
              <div><b>${esc(p.name)}</b><small>${esc(p.unit)}</small></div>
            </div>
          </td>
          <td>${esc(cat.name)}</td>
          <td class="price-cell"><b>${money(p.price)}</b>${p.mrp > p.price ? `<small>${money(p.mrp)}</small>` : ""}</td>
          <td>${money(p.mrp)}</td>
          <td>${tag}</td>
          <td>
            <div class="row-actions">
              <button class="icon-action" data-edit-product="${esc(p.id)}" title="Edit ${esc(p.name)}">✏️</button>
              <button class="icon-action danger" data-delete-product="${esc(p.id)}" title="Delete ${esc(p.name)}">🗑️</button>
            </div>
          </td>
        </tr>`;
      })
      .join("");

    $("productsEmpty").hidden = items.length > 0;
    $("productsCount").textContent = `Showing ${items.length} of ${state.products.length} products`;
  }

  $("productSearch").addEventListener("input", (e) => {
    state.productQuery = e.target.value;
    renderProducts();
  });

  function openModal(modal) {
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add("show"));
    document.body.classList.add("modal-open");
  }

  function closeModal(modal) {
    modal.classList.remove("show");
    document.body.classList.remove("modal-open");
    setTimeout(() => (modal.hidden = true), 240);
  }

  function openProductModal(product) {
    state.editingId = product ? product.id : null;
    $("productModalTitle").textContent = product ? "Edit product" : "Add product";
    $("productError").hidden = true;
    renderCategoryOptions();

    $("pId").value = product ? product.id : "";
    $("pName").value = product ? product.name : "";
    $("pUnit").value = product ? product.unit : "";
    $("pEmoji").value = product ? product.emoji : "";
    $("pCat").value = product ? product.cat : (state.categories[0] && state.categories[0].id) || "";
    $("pTag").value = product && product.tag ? product.tag : "";
    $("pPrice").value = product ? product.price : "";
    $("pMrp").value = product ? product.mrp : "";

    openModal($("productModal"));
    setTimeout(() => $("pName").focus(), 80);
  }

  $("addProductBtn").addEventListener("click", () => openProductModal(null));
  $("productClose").addEventListener("click", () => closeModal($("productModal")));
  $("productCancel").addEventListener("click", () => closeModal($("productModal")));

  $("productForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("productSave");
    const errEl = $("productError");
    errEl.hidden = true;

    const payload = {
      name: $("pName").value,
      unit: $("pUnit").value,
      emoji: $("pEmoji").value,
      cat: $("pCat").value,
      tag: $("pTag").value,
      price: Number($("pPrice").value),
      mrp: Number($("pMrp").value)
    };

    if (!payload.name.trim()) return showProductError("Please enter a product name");
    if (!(payload.price > 0)) return showProductError("Selling price must be greater than 0");
    if (!(payload.mrp >= payload.price)) return showProductError("MRP must be greater than or equal to the selling price");

    btn.disabled = true;
    btn.textContent = "Saving…";
    try {
      if (state.editingId) {
        await api("/api/products/" + encodeURIComponent(state.editingId), {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        toast("Product updated");
      } else {
        await api("/api/products", { method: "POST", body: JSON.stringify(payload) });
        toast("Product added");
      }
      closeModal($("productModal"));
      await refreshProducts();
    } catch (err) {
      showProductError(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Save product";
    }
  });

  function showProductError(message) {
    $("productError").textContent = message;
    $("productError").hidden = false;
  }

  async function deleteProduct(id) {
    const product = state.products.find((p) => p.id === id);
    if (!product) return;
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await api("/api/products/" + encodeURIComponent(id), { method: "DELETE" });
      toast("Product deleted");
      await refreshProducts();
    } catch (err) {
      toast(err.message, true);
    }
  }

  /* ---------------- orders ---------------- */
  function renderOrderFilters() {
    const counts = { all: state.orders.length };
    STATUS_ORDER.forEach((s) => (counts[s] = 0));
    state.orders.forEach((o) => {
      if (counts[o.status] != null) counts[o.status] += 1;
    });

    const filters = [{ id: "all", label: "All orders" }].concat(
      STATUS_ORDER.map((s) => ({ id: s, label: STATUS_META[s].label }))
    );

    $("orderFilters").innerHTML = filters
      .map(
        (f) => `<button class="filter-pill ${state.orderFilter === f.id ? "active" : ""}" data-filter="${f.id}">
          ${esc(f.label)}<span class="count">${counts[f.id] || 0}</span>
        </button>`
      )
      .join("");

    const active = filters.find((f) => f.id === state.orderFilter);
    if (active) $("viewSub").textContent = state.view === "orders" ? `${active.label} · ${counts[active.id] || 0}` : $("viewSub").textContent;
  }

  function renderOrders() {
    const items = state.orders.filter((o) => state.orderFilter === "all" || o.status === state.orderFilter);

    $("ordersBody").innerHTML = items
      .map((o) => {
        const itemCount = o.items.reduce((n, i) => n + i.qty, 0);
        const options = STATUS_ORDER.map(
          (s) => `<option value="${s}" ${o.status === s ? "selected" : ""}>${STATUS_META[s].label}</option>`
        ).join("");
        return `
        <tr>
          <td><b>${esc(o.id)}</b><small>${fmtTime(o.createdAt)}</small></td>
          <td>${esc(o.customer.name)}<small>${esc(o.customer.phone)}</small></td>
          <td>${itemCount} item${itemCount === 1 ? "" : "s"} <button class="link-btn" data-order-view="${esc(o.id)}">View</button></td>
          <td><b>${money(o.totals.total)}</b></td>
          <td>
            <select class="status-select status-${esc(o.status)}" data-order-status="${esc(o.id)}" aria-label="Order status">${options}</select>
          </td>
          <td>${fmtDate(o.createdAt)}</td>
          <td>
            <div class="row-actions">
              <button class="icon-action danger" data-delete-order="${esc(o.id)}" title="Delete order">🗑️</button>
            </div>
          </td>
        </tr>`;
      })
      .join("");

    $("ordersEmpty").hidden = items.length > 0;
  }

  async function updateOrderStatus(id, status) {
    try {
      const updated = await api("/api/orders/" + encodeURIComponent(id) + "/status", {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      const idx = state.orders.findIndex((o) => o.id === id);
      if (idx > -1) state.orders[idx] = updated;
      toast(`Order ${id} → ${STATUS_META[status].label}`);
      renderStats();
      renderOrderFilters();
      renderOrders();
      renderRecentOrders();
    } catch (err) {
      toast(err.message, true);
      renderOrders();
    }
  }

  async function deleteOrder(id) {
    if (!window.confirm(`Delete order ${id}? This cannot be undone.`)) return;
    try {
      await api("/api/orders/" + encodeURIComponent(id), { method: "DELETE" });
      toast("Order deleted");
      await refreshOrders();
    } catch (err) {
      toast(err.message, true);
    }
  }

  function openOrderModal(id) {
    const o = state.orders.find((x) => x.id === id);
    if (!o) return;
    $("orderModalTitle").textContent = "Order " + o.id;

    const itemRows = o.items
      .map(
        (i) => `
        <div class="order-item">
          <span class="emoji">${esc(i.emoji)}</span>
          <div class="name"><b>${esc(i.name)}</b><small>${esc(i.unit)} · ${money(i.price)} each</small></div>
          <span class="qty">×${i.qty}</span>
          <span class="amt">${money(i.price * i.qty)}</span>
        </div>`
      )
      .join("");

    $("orderModalBody").innerHTML = `
      <div class="order-detail-grid">
        <div><span>Customer</span><b>${esc(o.customer.name)}</b></div>
        <div><span>Phone</span><b>${esc(o.customer.phone)}</b></div>
        <div style="grid-column:1/-1"><span>Delivery address</span><b>${esc(o.customer.address)}</b></div>
        <div><span>Placed on</span><b>${fmtDate(o.createdAt)}</b></div>
        <div><span>Status</span><b>${statusPill(o.status)}</b></div>
      </div>
      <div class="order-items">${itemRows}</div>
      <div class="order-totals">
        <div><span>Item total (MRP)</span><span>${money(o.totals.mrpTotal)}</span></div>
        <div><span>Discount</span><span>−${money(o.totals.discount)}</span></div>
        <div><span>Delivery fee</span><span>${o.totals.delivery === 0 ? "FREE" : money(o.totals.delivery)}</span></div>
        <div><span>Handling fee</span><span>${money(o.totals.handling)}</span></div>
        <div class="total"><span>Total paid</span><span>${money(o.totals.total)}</span></div>
      </div>
      ${o.customer.note ? `<div class="order-note">📝 ${esc(o.customer.note)}</div>` : ""}`;

    openModal($("orderModal"));
  }

  /* ---------------- settings ---------------- */
  function fillSettings() {
    const s = state.settings;
    $("sName").value = s.storeName || "";
    $("sPhone").value = s.phone || "";
    $("sAddress").value = s.address || "";
    $("sHours").value = s.hours || "";
    $("sEta").value = s.etaMinutes || 8;
    $("sRadius").value = s.serviceRadiusKm || 3;
    $("sFree").value = s.freeDeliveryAt != null ? s.freeDeliveryAt : 199;
    $("sFee").value = s.deliveryFee != null ? s.deliveryFee : 29;
    $("sHandling").value = s.handlingFee != null ? s.handlingFee : 2;
    $("settingsError").hidden = true;
  }

  $("settingsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("settingsSave");
    const errEl = $("settingsError");
    errEl.hidden = true;

    const payload = {
      storeName: $("sName").value,
      phone: $("sPhone").value,
      address: $("sAddress").value,
      hours: $("sHours").value,
      etaMinutes: Number($("sEta").value),
      serviceRadiusKm: Number($("sRadius").value),
      freeDeliveryAt: Number($("sFree").value),
      deliveryFee: Number($("sFee").value),
      handlingFee: Number($("sHandling").value)
    };

    btn.disabled = true;
    btn.textContent = "Saving…";
    try {
      state.settings = await api("/api/settings", { method: "PUT", body: JSON.stringify(payload) });
      toast("Store settings saved");
      $("storeLabel").textContent = state.settings.storeName;
      renderStoreInfo();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = "Save changes";
    }
  });

  /* ---------------- navigation ---------------- */
  const VIEW_META = {
    dashboard: { title: "Dashboard", sub: "Overview of your store" },
    products: { title: "Products", sub: "Add, edit and manage your catalogue" },
    orders: { title: "Orders", sub: "Track and update customer orders" },
    settings: { title: "Settings", sub: "Store details, delivery and charges" }
  };

  function setView(name) {
    if (!VIEW_META[name]) return;
    state.view = name;
    Object.keys(VIEW_META).forEach((key) => {
      $("view-" + key).hidden = key !== name;
    });
    document.querySelectorAll(".side-link").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === name);
    });
    $("viewTitle").textContent = VIEW_META[name].title;
    $("viewSub").textContent = VIEW_META[name].sub;
    if (name === "orders") renderOrderFilters();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------------- global events ---------------- */
  document.addEventListener("click", (e) => {
    const viewBtn = e.target.closest("[data-view]");
    if (viewBtn) {
      setView(viewBtn.dataset.view);
      return;
    }

    const editBtn = e.target.closest("[data-edit-product]");
    if (editBtn) {
      const product = state.products.find((p) => p.id === editBtn.dataset.editProduct);
      if (product) openProductModal(product);
      return;
    }

    const delProduct = e.target.closest("[data-delete-product]");
    if (delProduct) {
      deleteProduct(delProduct.dataset.deleteProduct);
      return;
    }

    const filterBtn = e.target.closest("[data-filter]");
    if (filterBtn) {
      state.orderFilter = filterBtn.dataset.filter;
      renderOrderFilters();
      renderOrders();
      return;
    }

    const viewOrder = e.target.closest("[data-order-view]");
    if (viewOrder) {
      openOrderModal(viewOrder.dataset.orderView);
      return;
    }

    const delOrder = e.target.closest("[data-delete-order]");
    if (delOrder) {
      deleteOrder(delOrder.dataset.deleteOrder);
      return;
    }

    if (e.target.classList.contains("modal-overlay") && e.target.classList.contains("show")) {
      if (e.target.id === "productModal" || e.target.id === "orderModal") closeModal(e.target);
    }
  });

  document.addEventListener("change", (e) => {
    const select = e.target.closest("[data-order-status]");
    if (select) updateOrderStatus(select.dataset.orderStatus, select.value);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      ["productModal", "orderModal"].forEach((id) => {
        const modal = $(id);
        if (!modal.hidden) closeModal(modal);
      });
    }
  });

  $("orderClose").addEventListener("click", () => closeModal($("orderModal")));

  /* ---------------- boot ---------------- */
  async function boot() {
    if (!state.token) {
      showLogin();
      return;
    }
    try {
      await api("/api/admin/session");
      await loadAll();
      showApp();
    } catch (err) {
      showLogin();
    }
  }

  boot();
})();
