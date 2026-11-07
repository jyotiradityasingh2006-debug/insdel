let CATEGORIES = [
  { id: "fruits", name: "Fruits & Vegetables", emoji: "🥬", bg: "#e9f7e6", color: "#2f8f3e" },
  { id: "dairy", name: "Dairy & Breakfast", emoji: "🥛", bg: "#eaf3ff", color: "#3a7bd5" },
  { id: "snacks", name: "Snacks & Munchies", emoji: "🍪", bg: "#fff3e2", color: "#d9822b" },
  { id: "drinks", name: "Cold Drinks & Juices", emoji: "🥤", bg: "#e8f8f8", color: "#1a9e9e" },
  { id: "bakery", name: "Bakery & Biscuits", emoji: "🍞", bg: "#fdf0e6", color: "#b9783f" },
  { id: "instant", name: "Instant & Frozen", emoji: "🍜", bg: "#fdeaea", color: "#d64545" },
  { id: "personal", name: "Personal Care", emoji: "🧴", bg: "#f3ecfd", color: "#8e5bd8" },
  { id: "home", name: "Home & Cleaning", emoji: "🧹", bg: "#eafcf1", color: "#1f8a5b" }
];

let PRODUCTS = [
  // Fruits & Vegetables
  { id: "f1", name: "Banana Robusta", unit: "6 pcs (approx. 700g)", price: 45, mrp: 58, emoji: "🍌", cat: "fruits", tag: "bestseller" },
  { id: "f2", name: "Tomato Hybrid", unit: "500 g", price: 22, mrp: 32, emoji: "🍅", cat: "fruits" },
  { id: "f3", name: "Onion", unit: "1 kg", price: 35, mrp: 46, emoji: "🧅", cat: "fruits" },
  { id: "f4", name: "Shimla Apple", unit: "4 pcs (approx. 600g)", price: 118, mrp: 150, emoji: "🍎", cat: "fruits", tag: "fresh" },
  { id: "f5", name: "Baby Spinach", unit: "250 g", price: 28, mrp: 35, emoji: "🥬", cat: "fruits", tag: "fresh" },
  { id: "f6", name: "Alphonso Mango", unit: "1 kg", price: 179, mrp: 220, emoji: "🥭", cat: "fruits", tag: "bestseller" },
  { id: "f7", name: "Broccoli", unit: "1 pc (approx. 300g)", price: 48, mrp: 62, emoji: "🥦", cat: "fruits" },
  { id: "f8", name: "Green Capsicum", unit: "250 g", price: 24, mrp: 30, emoji: "🫑", cat: "fruits" },

  // Dairy & Breakfast
  { id: "d1", name: "Amul Taaza Toned Milk", unit: "500 ml", price: 27, mrp: 28, emoji: "🥛", cat: "dairy", tag: "bestseller" },
  { id: "d2", name: "Amul Butter", unit: "100 g", price: 58, mrp: 62, emoji: "🧈", cat: "dairy" },
  { id: "d3", name: "Britannia Cheese Slices", unit: "200 g (10 slices)", price: 145, mrp: 165, emoji: "🧀", cat: "dairy" },
  { id: "d4", name: "Farm Fresh Eggs", unit: "6 pcs", price: 48, mrp: 58, emoji: "🥚", cat: "dairy", tag: "fresh" },
  { id: "d5", name: "Greek Yogurt Blueberry", unit: "400 g", price: 89, mrp: 105, emoji: "🥣", cat: "dairy" },
  { id: "d6", name: "Kellogg's Corn Flakes", unit: "475 g", price: 195, mrp: 230, emoji: "🥣", cat: "dairy" },
  { id: "d7", name: "Amul Masti Dahi", unit: "400 g", price: 38, mrp: 42, emoji: "🍶", cat: "dairy" },
  { id: "d8", name: "Peanut Butter Creamy", unit: "340 g", price: 175, mrp: 199, emoji: "🥜", cat: "dairy" },

  // Snacks & Munchies
  { id: "s1", name: "Lay's Magic Masala", unit: "52 g", price: 20, mrp: 20, emoji: "🍟", cat: "snacks", tag: "bestseller" },
  { id: "s2", name: "Kurkure Masala Munch", unit: "90 g", price: 20, mrp: 20, emoji: "🌽", cat: "snacks" },
  { id: "s3", name: "Oreo Original Cookies", unit: "120 g", price: 30, mrp: 35, emoji: "🍪", cat: "snacks" },
  { id: "s4", name: "Haldiram's Bhujia", unit: "200 g", price: 55, mrp: 65, emoji: "🥨", cat: "snacks" },
  { id: "s5", name: "Cadbury Dairy Milk Silk", unit: "60 g", price: 80, mrp: 90, emoji: "🍫", cat: "snacks", tag: "bestseller" },
  { id: "s6", name: "Cheese Popcorn", unit: "70 g", price: 35, mrp: 45, emoji: "🍿", cat: "snacks" },
  { id: "s7", name: "Bingo Mad Angles", unit: "66 g", price: 20, mrp: 20, emoji: "🔺", cat: "snacks" },
  { id: "s8", name: "Pringles Sour Cream", unit: "107 g", price: 120, mrp: 135, emoji: "🥔", cat: "snacks", tag: "deal" },

  // Cold Drinks & Juices
  { id: "c1", name: "Coca-Cola", unit: "750 ml", price: 40, mrp: 45, emoji: "🥤", cat: "drinks" },
  { id: "c2", name: "Sprite", unit: "750 ml", price: 40, mrp: 45, emoji: "🍋", cat: "drinks" },
  { id: "c3", name: "Real Mixed Fruit Juice", unit: "1 L", price: 110, mrp: 125, emoji: "🧃", cat: "drinks", tag: "bestseller" },
  { id: "c4", name: "Red Bull Energy Drink", unit: "250 ml", price: 125, mrp: 125, emoji: "⚡", cat: "drinks" },
  { id: "c5", name: "Tender Coconut Water", unit: "1 pc", price: 50, mrp: 65, emoji: "🥥", cat: "drinks", tag: "fresh" },
  { id: "c6", name: "Amul Kool Kesar", unit: "180 ml", price: 20, mrp: 22, emoji: "🍶", cat: "drinks" },
  { id: "c7", name: "Minute Maid Pulpy Orange", unit: "600 ml", price: 55, mrp: 65, emoji: "🍊", cat: "drinks" },
  { id: "c8", name: "Bisleri Mineral Water", unit: "1 L", price: 20, mrp: 22, emoji: "💧", cat: "drinks" },

  // Bakery & Biscuits
  { id: "b1", name: "Modern White Bread", unit: "400 g", price: 40, mrp: 45, emoji: "🍞", cat: "bakery", tag: "bestseller" },
  { id: "b2", name: "Britannia Good Day Cashew", unit: "200 g", price: 40, mrp: 45, emoji: "🍪", cat: "bakery" },
  { id: "b3", name: "Chocolate Truffle Pastry", unit: "1 pc", price: 65, mrp: 80, emoji: "🍰", cat: "bakery", tag: "fresh" },
  { id: "b4", name: "Butter Croissant", unit: "2 pcs", price: 70, mrp: 85, emoji: "🥐", cat: "bakery" },
  { id: "b5", name: "Whole Wheat Bread", unit: "400 g", price: 50, mrp: 55, emoji: "🥖", cat: "bakery" },
  { id: "b6", name: "Rusk Toast", unit: "300 g", price: 45, mrp: 55, emoji: "🍞", cat: "bakery" },
  { id: "b7", name: "Choco Chip Muffin", unit: "2 pcs", price: 60, mrp: 75, emoji: "🧁", cat: "bakery" },
  { id: "b8", name: "Parle-G Gold Biscuits", unit: "300 g", price: 35, mrp: 40, emoji: "🍪", cat: "bakery" },

  // Instant & Frozen
  { id: "i1", name: "Maggi 2-Minute Noodles", unit: "70 g", price: 14, mrp: 14, emoji: "🍜", cat: "instant", tag: "bestseller" },
  { id: "i2", name: "Sunfeast Yippee Noodles", unit: "60 g", price: 12, mrp: 12, emoji: "🍜", cat: "instant" },
  { id: "i3", name: "McCain French Fries", unit: "420 g", price: 110, mrp: 130, emoji: "🍟", cat: "instant" },
  { id: "i4", name: "Knorr Classic Soup", unit: "44 g", price: 55, mrp: 62, emoji: "🥣", cat: "instant" },
  { id: "i5", name: "Frozen Green Peas", unit: "500 g", price: 75, mrp: 90, emoji: "🫛", cat: "instant" },
  { id: "i6", name: "Idli Dosa Batter", unit: "1 kg", price: 65, mrp: 80, emoji: "🍚", cat: "instant", tag: "fresh" },
  { id: "i7", name: "Frozen Veg Momos", unit: "10 pcs", price: 99, mrp: 120, emoji: "🥟", cat: "instant", tag: "deal" },
  { id: "i8", name: "Cup Noodles Chicken", unit: "70 g", price: 45, mrp: 50, emoji: "🍥", cat: "instant" },

  // Personal Care
  { id: "p1", name: "Dove Cream Beauty Bar", unit: "100 g", price: 55, mrp: 65, emoji: "🧼", cat: "personal" },
  { id: "p2", name: "Colgate Strong Teeth", unit: "200 g", price: 95, mrp: 110, emoji: "🪥", cat: "personal", tag: "bestseller" },
  { id: "p3", name: "Head & Shoulders Shampoo", unit: "180 ml", price: 165, mrp: 190, emoji: "🧴", cat: "personal" },
  { id: "p4", name: "Gillette Mach3 Razor", unit: "1 pc", price: 195, mrp: 215, emoji: "🪒", cat: "personal" },
  { id: "p5", name: "Nivea Body Lotion", unit: "200 ml", price: 199, mrp: 230, emoji: "🧴", cat: "personal" },
  { id: "p6", name: "Dettol Original Handwash", unit: "200 ml", price: 75, mrp: 90, emoji: "🧴", cat: "personal" },

  // Home & Cleaning
  { id: "h1", name: "Surf Excel Easy Wash", unit: "1 kg", price: 135, mrp: 155, emoji: "🧺", cat: "home", tag: "bestseller" },
  { id: "h2", name: "Vim Dishwash Bar", unit: "300 g", price: 30, mrp: 35, emoji: "🧽", cat: "home" },
  { id: "h3", name: "Harpic Toilet Cleaner", unit: "500 ml", price: 85, mrp: 99, emoji: "🚽", cat: "home" },
  { id: "h4", name: "Colin Glass Cleaner", unit: "500 ml", price: 90, mrp: 105, emoji: "🪟", cat: "home" },
  { id: "h5", name: "Good Knight Gold Flash", unit: "45 ml refill", price: 65, mrp: 75, emoji: "🦟", cat: "home" },
  { id: "h6", name: "Garbage Bags Medium", unit: "30 pcs", price: 60, mrp: 75, emoji: "🗑️", cat: "home" }
];

const TAG_LABELS = {
  bestseller: { text: "Bestseller", cls: "tag-bestseller" },
  fresh: { text: "Fresh", cls: "tag-fresh" },
  deal: { text: "Deal", cls: "tag-deal" }
};
