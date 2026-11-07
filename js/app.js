(function () {
  "use strict";

  const STORAGE_KEY = "insdel-cart-v1";
  const CUSTOMER_KEY = "insdel-customer";

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

  let CAT_MAP = {};
  let PRODUCT_MAP = {};
  function buildMaps() {
    CAT_MAP = {};
    CATEGORIES.forEach((c) => (CAT_MAP[c.id] = c));
    PRODUCT_MAP = {};
    PRODUCTS.forEach((p) => (PRODUCT_MAP[p.id] = p));
  }
  buildMaps();

  const state = {
    cart: loadCart(),
    category: "all",
    query: "",
    slide: 0,
    settings: Object.assign({}, DEFAULT_SETTINGS)
  };

  const $ = (id) => document.getElementById(id);
  const esc = (value) =>
    String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));

  const els = {
    categoryStrip: $("categoryStrip"),
    filterChips: $("filterChips"),
    productGrid: $("productGrid"),
    productsTitle: $("productsTitle"),
    productsSub: $("productsSub"),
    emptyState: $("emptyState"),
    searchInput: $("searchInput"),
    searchClear: $("searchClear"),
    cartBtnHeader: $("cartBtnHeader"),
    cartCountHeader: $("cartCountHeader"),
    cartItems: $("cartItems"),
    cartEmpty: $("cartEmpty"),
    cartFooter: $("cartFooter"),
    cartItemsLabel: $("cartItemsLabel"),
    cartDrawer: $("cartDrawer"),
    drawerOverlay: $("drawerOverlay"),
    drawerClose: $("drawerClose"),
    startShopping: $("startShopping"),
    deliveryProgress: $("deliveryProgress"),
    deliveryProgressText: $("deliveryProgressText"),
    deliveryProgressFill: $("deliveryProgressFill"),
    billMrp: $("billMrp"),
    billDiscount: $("billDiscount"),
    billDelivery: $("billDelivery"),
    billHandling: $("billHandling"),
    billTotal: $("billTotal"),
    billSavings: $("billSavings"),
    checkoutBtn: $("checkoutBtn"),
    checkoutTotal: $("checkoutTotal"),
    successOverlay: $("successOverlay"),
    orderId: $("orderId"),
    successTotal: $("successTotal"),
    successAddress: $("successAddress"),
    checkoutOverlay: $("checkoutOverlay"),
    checkoutForm: $("checkoutForm"),
    checkoutFormTotal: $("checkoutFormTotal"),
    checkoutEta: $("checkoutEta"),
    checkoutError: $("checkoutError"),
    checkoutConfirm: $("checkoutConfirm"),
    checkoutClose: $("checkoutClose"),
    checkoutCancel: $("checkoutCancel"),
    custName: $("custName"),
    custPhone: $("custPhone"),
    custAddress: $("custAddress"),
    custNote: $("custNote"),
    etaTime: $("etaTime"),
    etaBar: $("etaBar"),
    continueShopping: $("continueShopping"),
    mobileCartBar: $("mobileCartBar"),
    mobileCartCount: $("mobileCartCount"),
    mobileCartTotal: $("mobileCartTotal"),
    mobileCartBtn: $("mobileCartBtn"),
    toast: $("toast"),
    slides: $("slides"),
    dots: $("dots"),
    header: $("header"),
    resetFilters: $("resetFilters")
  };

  /* ---------- Storage ---------- */
  function loadCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const clean = {};
      Object.keys(parsed).forEach((id) => {
        if (PRODUCT_MAP[id] && Number.isInteger(parsed[id]) && parsed[id] > 0) {
          clean[id] = parsed[id];
        }
      });
      return clean;
    } catch (e) {
      return {};
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cart));
    } catch (e) {
      /* storage unavailable */
    }
  }

  /* ---------- Helpers ---------- */
  function money(n) {
    return "₹" + Number(n).toLocaleString("en-IN");
  }

  function cartCount() {
    return Object.values(state.cart).reduce((a, b) => a + b, 0);
  }

  function productQty(id) {
    return state.cart[id] || 0;
  }

  let toastTimer;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    requestAnimationFrame(() => els.toast.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.classList.remove("show");
      setTimeout(() => (els.toast.hidden = true), 260);
    }, 1900);
  }

  /* ---------- Categories ---------- */
  function renderCategories() {
    const all = { id: "all", name: "All", emoji: "🛍️", bg: "#eef4ef" };
    const list = [all, ...CATEGORIES];

    els.categoryStrip.innerHTML = list
      .map(
        (c) => `
        <button class="cat-item ${state.category === c.id ? "active" : ""}" data-cat="${esc(c.id)}">
          <span class="cat-circle" style="background:${esc(c.bg)}">${esc(c.emoji)}</span>
          <span class="cat-label">${esc(c.name)}</span>
        </button>`
      )
      .join("");

    els.filterChips.innerHTML = list
      .map(
        (c) => `<button class="chip ${state.category === c.id ? "active" : ""}" data-cat="${esc(c.id)}">${c.id === "all" ? "All items" : esc(c.name)}</button>`
      )
      .join("");
  }

  /* ---------- Products ---------- */
  function filteredProducts() {
    const q = state.query.trim().toLowerCase();
    return PRODUCTS.filter((p) => {
      const inCat = state.category === "all" || p.cat === state.category;
      const inQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.unit.toLowerCase().includes(q) ||
        ((CAT_MAP[p.cat] && CAT_MAP[p.cat].name) || p.cat).toLowerCase().includes(q);
      return inCat && inQuery;
    });
  }

  function controlHTML(product) {
    const qty = productQty(product.id);
    if (qty > 0) {
      return `
        <div class="stepper" data-control="${esc(product.id)}">
          <button data-action="dec" data-id="${esc(product.id)}" aria-label="Remove one ${esc(product.name)}">−</button>
          <span>${qty}</span>
          <button data-action="inc" data-id="${esc(product.id)}" aria-label="Add one ${esc(product.name)}">+</button>
        </div>`;
    }
    return `<button class="add-btn" data-action="inc" data-id="${esc(product.id)}" aria-label="Add ${esc(product.name)} to cart">ADD</button>`;
  }

  function cardHTML(p, index) {
    const cat = CAT_MAP[p.cat] || { bg: "#eef4ef" };
    const off = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
    const tag = p.tag ? TAG_LABELS[p.tag] : null;
    return `
      <article class="product-card" data-card="${esc(p.id)}" style="animation-delay:${Math.min(index, 14) * 22}ms">
        <div class="product-img" style="background:${esc(cat.bg)}">
          ${tag ? `<span class="tag-badge ${tag.cls}">${tag.text}</span>` : ""}
          ${off > 0 ? `<span class="discount-badge">${off}% OFF</span>` : ""}
          <span class="prod-emoji">${esc(p.emoji)}</span>
        </div>
        <h3 class="product-name">${esc(p.name)}</h3>
        <span class="product-unit">${esc(p.unit)}</span>
        <div class="product-bottom">
          <div class="price-block">
            <span class="price-now">${money(p.price)}</span>
            ${p.mrp > p.price ? `<span class="price-mrp">${money(p.mrp)}</span>` : ""}
          </div>
          <div class="card-control">${controlHTML(p)}</div>
        </div>
      </article>`;
  }

  function renderProducts() {
    const items = filteredProducts();
    els.productGrid.innerHTML = items.map(cardHTML).join("");
    els.emptyState.hidden = items.length > 0;
    els.productGrid.style.display = items.length ? "" : "none";

    if (state.query.trim()) {
      els.productsTitle.textContent = `Results for “${state.query.trim()}”`;
      els.productsSub.textContent = `${items.length} item${items.length === 1 ? "" : "s"} found at Insdel Store`;
    } else if (state.category !== "all") {
      const cat = CAT_MAP[state.category];
      els.productsTitle.textContent = cat.emoji + " " + cat.name;
      els.productsSub.textContent = `${items.length} item${items.length === 1 ? "" : "s"} · delivered in 8 minutes from our single store`;
    } else {
      els.productsTitle.textContent = "Bestsellers near you";
      els.productsSub.textContent = "Hand-picked essentials from Insdel Store, MG Road";
    }
  }

  function syncCardControl(id) {
    const card = els.productGrid.querySelector(`[data-card="${id}"]`);
    if (!card) return;
    const holder = card.querySelector(".card-control");
    if (holder) holder.innerHTML = controlHTML(PRODUCT_MAP[id]);
  }

  /* ---------- Cart ---------- */
  function addToCart(id) {
    const p = PRODUCT_MAP[id];
    if (!p) return;
    state.cart[id] = (state.cart[id] || 0) + 1;
    saveCart();
    syncCardControl(id);
    updateCartUI();
    toast(`${p.name} added to cart`);
  }

  function removeFromCart(id) {
    if (!state.cart[id]) return;
    state.cart[id] -= 1;
    if (state.cart[id] <= 0) delete state.cart[id];
    saveCart();
    syncCardControl(id);
    updateCartUI();
  }

  function computeBill() {
    let mrpTotal = 0;
    let itemTotal = 0;
    Object.keys(state.cart).forEach((id) => {
      const p = PRODUCT_MAP[id];
      const qty = state.cart[id];
      mrpTotal += p.mrp * qty;
      itemTotal += p.price * qty;
    });
    const s = state.settings;
    const hasItems = itemTotal > 0;
    const delivery = !hasItems ? 0 : itemTotal >= s.freeDeliveryAt ? 0 : s.deliveryFee;
    const handling = hasItems ? s.handlingFee : 0;
    const total = itemTotal + delivery + handling;
    const discount = mrpTotal - itemTotal;
    const savings = discount + (hasItems && delivery === 0 ? s.deliveryFee : 0);
    return { mrpTotal, itemTotal, delivery, handling, total, discount, savings, hasItems };
  }

  function renderCartDrawer() {
    const ids = Object.keys(state.cart);
    const count = cartCount();
    els.cartItemsLabel.textContent = count ? `· ${count} item${count === 1 ? "" : "s"}` : "";

    if (!ids.length) {
      els.cartItems.innerHTML = "";
      els.cartEmpty.classList.add("show");
      els.cartFooter.classList.add("hidden");
      els.deliveryProgress.style.display = "none";
      return;
    }

    els.cartEmpty.classList.remove("show");
    els.cartFooter.classList.remove("hidden");
    els.deliveryProgress.style.display = "";

    els.cartItems.innerHTML = ids
      .map((id) => {
        const p = PRODUCT_MAP[id];
        const qty = state.cart[id];
        const cat = CAT_MAP[p.cat] || { bg: "#eef4ef" };
        return `
        <div class="cart-item">
          <div class="cart-item-img" style="background:${esc(cat.bg)}">${esc(p.emoji)}</div>
          <div class="cart-item-info">
            <h4>${esc(p.name)}</h4>
            <small>${esc(p.unit)}</small>
            <div class="cart-item-price">${money(p.price)}</div>
          </div>
          <div class="cart-item-right">
            <div class="stepper">
              <button data-action="dec" data-id="${esc(id)}" aria-label="Remove one ${esc(p.name)}">−</button>
              <span>${qty}</span>
              <button data-action="inc" data-id="${esc(id)}" aria-label="Add one ${esc(p.name)}">+</button>
            </div>
            <span class="cart-item-total">${money(p.price * qty)}</span>
          </div>
        </div>`;
      })
      .join("");

    const bill = computeBill();
    els.billMrp.textContent = money(bill.mrpTotal);
    els.billDiscount.textContent = "−" + money(bill.discount);
    els.billDelivery.textContent = bill.delivery === 0 ? "FREE" : money(bill.delivery);
    els.billHandling.textContent = money(bill.handling);
    els.billTotal.textContent = money(bill.total);
    els.checkoutTotal.textContent = money(bill.total);

    if (bill.savings > 0) {
      els.billSavings.hidden = false;
      els.billSavings.textContent = `🎉 You saved ${money(bill.savings)} on this order`;
    } else {
      els.billSavings.hidden = true;
    }

    const freeAt = state.settings.freeDeliveryAt;
    const remaining = freeAt - bill.itemTotal;
    if (remaining > 0) {
      els.deliveryProgressText.innerHTML = `Add <b>${money(remaining)}</b> more for FREE delivery`;
      els.deliveryProgressFill.style.width = Math.min(100, (bill.itemTotal / freeAt) * 100) + "%";
      els.billDelivery.textContent = money(bill.delivery);
    } else {
      els.deliveryProgressText.innerHTML = `🎉 Yay! You've unlocked <b>FREE delivery</b>`;
      els.deliveryProgressFill.style.width = "100%";
    }
  }

  function updateCartUI() {
    const count = cartCount();
    const bill = computeBill();

    if (count > 0) {
      els.cartCountHeader.textContent = count;
      els.cartCountHeader.hidden = false;
    } else {
      els.cartCountHeader.hidden = true;
    }

    if (count > 0) {
      els.mobileCartBar.hidden = false;
      els.mobileCartCount.textContent = `${count} item${count === 1 ? "" : "s"}`;
      els.mobileCartTotal.textContent = money(bill.total);
    } else {
      els.mobileCartBar.hidden = true;
    }
    document.body.classList.toggle("has-cart", count > 0);

    renderCartDrawer();
  }

  /* ---------- Drawer / modal ---------- */
  let overlayTimer;

  function openDrawer() {
    els.drawerOverlay.hidden = false;
    requestAnimationFrame(() => {
      els.drawerOverlay.classList.add("show");
      els.cartDrawer.classList.add("open");
    });
    els.cartDrawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
  }

  function closeDrawer() {
    els.drawerOverlay.classList.remove("show");
    els.cartDrawer.classList.remove("open");
    els.cartDrawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
    clearTimeout(overlayTimer);
    overlayTimer = setTimeout(() => (els.drawerOverlay.hidden = true), 320);
  }

  let etaTimer = null;

  function loadCustomer() {
    try {
      return JSON.parse(localStorage.getItem(CUSTOMER_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function storeCustomer(customer) {
    try {
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
    } catch (e) {
      /* ignore */
    }
  }

  function openCheckout() {
    const bill = computeBill();
    if (!bill.hasItems) return;

    els.checkoutFormTotal.textContent = money(bill.total);
    els.checkoutEta.textContent = `${state.settings.etaMinutes} minutes`;
    els.checkoutError.hidden = true;

    const saved = loadCustomer();
    els.custName.value = saved.name || "";
    els.custPhone.value = saved.phone || "";
    els.custAddress.value = saved.address || "";
    els.custNote.value = "";

    closeDrawer();
    els.checkoutOverlay.hidden = false;
    requestAnimationFrame(() => els.checkoutOverlay.classList.add("show"));
    document.body.classList.add("no-scroll");
    setTimeout(() => els.custName.focus(), 120);
  }

  function closeCheckout() {
    els.checkoutOverlay.classList.remove("show");
    document.body.classList.remove("no-scroll");
    setTimeout(() => (els.checkoutOverlay.hidden = true), 260);
  }

  function showCheckoutError(message) {
    els.checkoutError.textContent = message;
    els.checkoutError.hidden = false;
  }

  function clearCart() {
    state.cart = {};
    saveCart();
    els.productGrid.querySelectorAll(".card-control").forEach((holder) => {
      const card = holder.closest("[data-card]");
      if (card) holder.innerHTML = controlHTML(PRODUCT_MAP[card.dataset.card]);
    });
    updateCartUI();
  }

  function showSuccess(result, customer) {
    const etaMinutes = Number(result.etaMinutes) || state.settings.etaMinutes || 8;
    els.orderId.textContent = result.orderId;
    els.successTotal.textContent = money(result.total);
    const address = customer && customer.address ? customer.address : "Home · MG Road";
    els.successAddress.textContent = address.length > 46 ? address.slice(0, 46) + "…" : address;
    els.successOverlay.hidden = false;
    requestAnimationFrame(() => els.successOverlay.classList.add("show"));
    document.body.classList.add("no-scroll");
    startEta(etaMinutes * 60);
  }

  async function submitCheckout(event) {
    event.preventDefault();
    const bill = computeBill();
    if (!bill.hasItems) {
      closeCheckout();
      return;
    }

    const customer = {
      name: els.custName.value.trim(),
      phone: els.custPhone.value.trim(),
      address: els.custAddress.value.trim(),
      note: els.custNote.value.trim()
    };
    if (customer.name.length < 2) return showCheckoutError("Please enter your name.");
    if (customer.phone.replace(/\D/g, "").length < 7) return showCheckoutError("Please enter a valid phone number.");
    if (customer.address.length < 5) return showCheckoutError("Please enter a delivery address.");

    els.checkoutError.hidden = true;
    els.checkoutConfirm.disabled = true;
    els.checkoutConfirm.textContent = "Placing order…";

    const items = Object.keys(state.cart).map((id) => ({ id, qty: state.cart[id] }));
    let result = null;

    if (typeof fetch === "function") {
      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items, customer })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showCheckoutError(data.error || "Could not place your order. Please try again.");
          els.checkoutConfirm.disabled = false;
          els.checkoutConfirm.textContent = "Place order";
          return;
        }
        result = data;
      } catch (err) {
        result = null;
      }
    }

    if (!result) {
      result = {
        orderId: "#INS" + Math.floor(1000 + Math.random() * 9000),
        total: bill.total,
        etaMinutes: state.settings.etaMinutes,
        offline: true
      };
    }

    storeCustomer(customer);
    clearCart();
    closeCheckout();
    showSuccess(result, customer);

    els.checkoutConfirm.disabled = false;
    els.checkoutConfirm.textContent = "Place order";
  }

  function startEta(totalSeconds) {
    clearInterval(etaTimer);
    let remaining = totalSeconds;
    const render = () => {
      const m = String(Math.floor(remaining / 60)).padStart(2, "0");
      const s = String(remaining % 60).padStart(2, "0");
      els.etaTime.textContent = remaining > 0 ? `${m}:${s}` : "Any moment now";
      els.etaBar.style.width = Math.max(0, (remaining / totalSeconds) * 100) + "%";
      if (remaining > 0) remaining -= 1;
    };
    render();
    els.etaBar.style.transition = "none";
    els.etaBar.style.width = "100%";
    requestAnimationFrame(() => {
      els.etaBar.style.transition = "";
    });
    etaTimer = setInterval(render, 1000);
  }

  function closeSuccess() {
    clearInterval(etaTimer);
    els.successOverlay.classList.remove("show");
    document.body.classList.remove("no-scroll");
    setTimeout(() => (els.successOverlay.hidden = true), 260);
  }

  /* ---------- Carousel ---------- */
  const SLIDES = [
    {
      cls: "slide-green",
      tag: "⚡ Superfast delivery",
      title: "Groceries in<br>8 minutes",
      text: "From our single store to your doorstep — fresh, fast and always in stock.",
      cta: "Shop essentials →",
      cat: "all",
      art: "🛒",
      extras: ["🥛", "🍎"]
    },
    {
      cls: "slide-orange",
      tag: "🌅 Picked this morning",
      title: "Farm-fresh<br>fruits & veggies",
      text: "Hand-picked at dawn, checked twice, and delivered to you before lunch.",
      cta: "Shop fresh →",
      cat: "fruits",
      art: "🥦",
      extras: ["🍓", "🥕"]
    },
    {
      cls: "slide-purple",
      tag: "🌙 Cravings, solved",
      title: "Snacks for<br>every mood",
      text: "Chips, chocolates, cold drinks and midnight munchies — at your door in minutes.",
      cta: "Shop snacks →",
      cat: "snacks",
      art: "🍿",
      extras: ["🍫", "🥤"]
    }
  ];

  function renderSlides() {
    els.slides.innerHTML = SLIDES.map(
      (s) => `
      <div class="slide ${s.cls}">
        <div class="slide-copy">
          <span class="slide-tag">${s.tag}</span>
          <h2>${s.title}</h2>
          <p>${s.text}</p>
          <button class="slide-cta" data-slide-cat="${s.cat}">${s.cta}</button>
        </div>
        <div class="slide-art">${s.art}<span>${s.extras[0]}</span><span>${s.extras[1]}</span></div>
      </div>`
    ).join("");

    els.dots.innerHTML = SLIDES.map((_, i) => `<button class="dot ${i === 0 ? "active" : ""}" data-dot="${i}" aria-label="Go to slide ${i + 1}"></button>`).join("");
    goToSlide(0);
  }

  function goToSlide(i) {
    state.slide = (i + SLIDES.length) % SLIDES.length;
    els.slides.style.transform = `translateX(-${state.slide * 100}%)`;
    els.dots.querySelectorAll(".dot").forEach((d, idx) => d.classList.toggle("active", idx === state.slide));
  }

  let autoSlide = setInterval(() => goToSlide(state.slide + 1), 5500);

  function restartAutoSlide() {
    clearInterval(autoSlide);
    autoSlide = setInterval(() => goToSlide(state.slide + 1), 5500);
  }

  /* ---------- Events ---------- */
  function setCategory(id) {
    state.category = id;
    renderCategories();
    renderProducts();
  }

  document.addEventListener("click", (e) => {
    const catBtn = e.target.closest("[data-cat]");
    if (catBtn) {
      setCategory(catBtn.dataset.cat);
      if (catBtn.closest(".category-strip") || catBtn.closest(".filter-chips")) {
        document.getElementById("products").scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    const actionBtn = e.target.closest("[data-action]");
    if (actionBtn) {
      const id = actionBtn.dataset.id;
      if (actionBtn.dataset.action === "inc") addToCart(id);
      else removeFromCart(id);
      return;
    }

    const dot = e.target.closest("[data-dot]");
    if (dot) {
      goToSlide(Number(dot.dataset.dot));
      restartAutoSlide();
      return;
    }

    const promo = e.target.closest("[data-promo]");
    if (promo) {
      const cat = CATEGORIES.find((c) => c.name === promo.dataset.promo);
      if (cat) setTimeout(() => setCategory(cat.id), 150);
      return;
    }

    const slideCta = e.target.closest("[data-slide-cat]");
    if (slideCta) {
      setCategory(slideCta.dataset.slideCat);
      document.getElementById("products").scrollIntoView({ behavior: "smooth" });
    }
  });

  els.searchInput.addEventListener("input", (e) => {
    state.query = e.target.value;
    els.searchClear.hidden = !state.query;
    renderProducts();
  });

  els.searchClear.addEventListener("click", () => {
    state.query = "";
    els.searchInput.value = "";
    els.searchClear.hidden = true;
    els.searchInput.focus();
    renderProducts();
  });

  els.resetFilters.addEventListener("click", () => {
    state.query = "";
    els.searchInput.value = "";
    els.searchClear.hidden = true;
    setCategory("all");
  });

  els.cartBtnHeader.addEventListener("click", openDrawer);
  els.mobileCartBtn.addEventListener("click", openDrawer);
  els.drawerClose.addEventListener("click", closeDrawer);
  els.drawerOverlay.addEventListener("click", closeDrawer);
  els.startShopping.addEventListener("click", () => {
    closeDrawer();
    document.getElementById("products").scrollIntoView({ behavior: "smooth" });
  });

  els.checkoutBtn.addEventListener("click", openCheckout);
  els.checkoutForm.addEventListener("submit", submitCheckout);
  els.checkoutClose.addEventListener("click", closeCheckout);
  els.checkoutCancel.addEventListener("click", closeCheckout);
  els.checkoutOverlay.addEventListener("click", (e) => {
    if (e.target === els.checkoutOverlay) closeCheckout();
  });
  els.continueShopping.addEventListener("click", closeSuccess);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (els.cartDrawer.classList.contains("open")) closeDrawer();
      if (!els.checkoutOverlay.hidden) closeCheckout();
      if (!els.successOverlay.hidden) closeSuccess();
    }
  });

  els.dots.addEventListener("click", restartAutoSlide);
  const carouselEl = document.getElementById("carousel");
  carouselEl.addEventListener("mouseenter", () => clearInterval(autoSlide));
  carouselEl.addEventListener("mouseleave", restartAutoSlide);

  document.getElementById("nextSlide").addEventListener("click", () => {
    goToSlide(state.slide + 1);
    restartAutoSlide();
  });
  document.getElementById("prevSlide").addEventListener("click", () => {
    goToSlide(state.slide - 1);
    restartAutoSlide();
  });

  window.addEventListener("scroll", () => {
    els.header.classList.toggle("scrolled", window.scrollY > 8);
  });

  document.getElementById("locationBtn").addEventListener("click", () => {
    document.querySelector(".store-banner").scrollIntoView({ behavior: "smooth", block: "center" });
  });

  document.querySelectorAll(".footer-col a[href='#products'], .footer .footer-brand a[href='#']").forEach((a) => {
    if (a.getAttribute("href") === "#") a.addEventListener("click", (e) => e.preventDefault());
  });

  /* ---------- Remote data ---------- */
  async function fetchJSON(path) {
    const res = await fetch(path, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  function syncCartWithProducts() {
    let changed = false;
    Object.keys(state.cart).forEach((id) => {
      if (!PRODUCT_MAP[id]) {
        delete state.cart[id];
        changed = true;
      }
    });
    if (changed) saveCart();
  }

  function applySettings(s) {
    const eta = Number(s.etaMinutes) || 8;
    const title = document.querySelector(".location-title");
    if (title) title.innerHTML = `Delivery in <b>${eta} minutes</b>`;
    const sub = document.querySelector(".location-sub");
    if (sub) sub.textContent = s.storeName || "Insdel Store";
    if (els.checkoutEta) els.checkoutEta.textContent = `${eta} minutes`;
    const meta = document.querySelectorAll(".store-meta b");
    if (meta[0] && s.hours) meta[0].textContent = s.hours;
    if (meta[1]) meta[1].textContent = `Within ${s.serviceRadiusKm || 3} km`;
    const bannerStore = document.querySelector(".store-copy b");
    if (bannerStore) bannerStore.textContent = `${s.storeName || "Insdel Store"}, ${s.address || "MG Road"}`;
  }

  async function loadRemoteData() {
    if (typeof fetch !== "function") return;
    const [products, categories, settings] = await Promise.allSettled([
      fetchJSON("/api/products"),
      fetchJSON("/api/categories"),
      fetchJSON("/api/settings")
    ]);

    let catalogChanged = false;
    let settingsChanged = false;

    if (products.status === "fulfilled" && Array.isArray(products.value) && products.value.length) {
      PRODUCTS = products.value;
      catalogChanged = true;
    }
    if (categories.status === "fulfilled" && Array.isArray(categories.value) && categories.value.length) {
      CATEGORIES = categories.value;
      catalogChanged = true;
    }
    if (settings.status === "fulfilled" && settings.value && typeof settings.value === "object") {
      state.settings = Object.assign({}, DEFAULT_SETTINGS, settings.value);
      settingsChanged = true;
    }

    if (!catalogChanged && !settingsChanged) return;

    if (catalogChanged) {
      buildMaps();
      syncCartWithProducts();
      renderCategories();
      renderProducts();
    }
    if (settingsChanged) applySettings(state.settings);
    updateCartUI();
  }

  /* ---------- Init ---------- */
  renderCategories();
  renderSlides();
  renderProducts();
  updateCartUI();
  loadRemoteData();
})();
