/**
 * Paper Custom - Backend Server
 * Node.js + Express + SQLite
 * Handles product management, image uploads, contact inquiries
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend files
app.use(express.static(path.join(__dirname, '../frontend')));
// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Database Setup ───────────────────────────────────────────────────────────
const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_en TEXT,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    cover_image TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    name TEXT NOT NULL,
    name_en TEXT,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    short_desc TEXT,
    specifications TEXT,
    moq TEXT,
    lead_time TEXT,
    materials TEXT,
    tags TEXT,
    featured INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS product_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    image_path TEXT NOT NULL,
    alt_text TEXT,
    is_primary INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    product_interest TEXT,
    quantity TEXT,
    message TEXT,
    status TEXT DEFAULT 'new',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Seed default categories if empty
const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get();
if (catCount.c === 0) {
  const insertCat = db.prepare(
    'INSERT INTO categories (name, name_en, slug, description, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  [
    ['笔记本 / 记事本', 'Notebooks', 'notebooks', '各类定制笔记本，适合企业礼品及个人定制', 1],
    ['规划手册', 'Planners', 'planners', '年度、月度规划手册，支持全定制封面与内页', 2],
    ['贴纸 / 标签', 'Stickers & Labels', 'stickers', '定制贴纸、封口贴、标签系列', 3],
    ['信纸 / 信封', 'Letter Sets', 'letter-sets', '高品质信纸信封套装，适合品牌包装', 4],
    ['便利贴', 'Sticky Notes', 'sticky-notes', '定制便利贴，多规格可选', 5],
    ['书签 / 配件', 'Bookmarks & Accessories', 'accessories', '书签、夹子等笔记本配件', 6],
  ].forEach(([name, name_en, slug, description, sort_order]) => {
    insertCat.run(name, name_en, slug, description, sort_order);
  });
}

// ─── File Upload Config ───────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  destination(req, file, cb) {
    const dir = path.join(uploadDir, 'products');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) cb(null, true);
  else cb(new Error('仅支持图片格式: jpeg, jpg, png, gif, webp'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// ─── Helper ───────────────────────────────────────────────────────────────────
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── API: Categories ──────────────────────────────────────────────────────────
app.get('/api/categories', (req, res) => {
  const cats = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();
  res.json({ success: true, data: cats });
});

app.post('/api/categories', upload.single('cover_image'), (req, res) => {
  try {
    const { name, name_en, description, sort_order } = req.body;
    const slug = slugify(name_en || name);
    const cover_image = req.file ? `/uploads/products/${req.file.filename}` : null;
    const result = db
      .prepare('INSERT INTO categories (name, name_en, slug, description, cover_image, sort_order) VALUES (?,?,?,?,?,?)')
      .run(name, name_en, slug, description, cover_image, sort_order || 0);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

app.put('/api/categories/:id', upload.single('cover_image'), (req, res) => {
  try {
    const { name, name_en, description, sort_order } = req.body;
    const cover_image = req.file ? `/uploads/products/${req.file.filename}` : undefined;
    const updates = { name, name_en, description, sort_order };
    if (cover_image) updates.cover_image = cover_image;
    const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE categories SET ${sets} WHERE id = ?`).run(...Object.values(updates), req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

app.delete('/api/categories/:id', (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── API: Products ────────────────────────────────────────────────────────────
app.get('/api/products', (req, res) => {
  const { category, featured, limit, offset, search } = req.query;
  let sql = `
    SELECT p.*, c.name as category_name, c.slug as category_slug,
           (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE 1=1
  `;
  const params = [];
  if (category) { sql += ' AND c.slug = ?'; params.push(category); }
  if (featured) { sql += ' AND p.featured = 1'; }
  if (search) { sql += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.tags LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  sql += ' ORDER BY p.featured DESC, p.sort_order ASC, p.created_at DESC';
  if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }
  if (offset) { sql += ' OFFSET ?'; params.push(parseInt(offset)); }

  const products = db.prepare(sql).all(...params);
  const total = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  res.json({ success: true, data: products, total });
});

app.get('/api/products/:slug', (req, res) => {
  const product = db
    .prepare(`SELECT p.*, c.name as category_name, c.slug as category_slug
              FROM products p LEFT JOIN categories c ON p.category_id = c.id
              WHERE p.slug = ?`)
    .get(req.params.slug);
  if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

  const images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC').all(product.id);
  product.images = images;
  res.json({ success: true, data: product });
});

app.post('/api/products', upload.array('images', 20), (req, res) => {
  try {
    const { category_id, name, name_en, description, short_desc, specifications, moq, lead_time, materials, tags, featured, sort_order } = req.body;
    const slug = slugify(name_en || name) + '-' + Date.now();
    const result = db
      .prepare(`INSERT INTO products (category_id, name, name_en, slug, description, short_desc, specifications, moq, lead_time, materials, tags, featured, sort_order)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(category_id, name, name_en, slug, description, short_desc, specifications, moq, lead_time, materials, tags, featured ? 1 : 0, sort_order || 0);

    const productId = result.lastInsertRowid;
    if (req.files && req.files.length > 0) {
      const insertImg = db.prepare('INSERT INTO product_images (product_id, image_path, alt_text, is_primary, sort_order) VALUES (?,?,?,?,?)');
      req.files.forEach((file, idx) => {
        insertImg.run(productId, `/uploads/products/${file.filename}`, name, idx === 0 ? 1 : 0, idx);
      });
    }
    res.json({ success: true, id: productId, slug });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

app.put('/api/products/:id', upload.array('images', 20), (req, res) => {
  try {
    const { category_id, name, name_en, description, short_desc, specifications, moq, lead_time, materials, tags, featured, sort_order } = req.body;
    db.prepare(`UPDATE products SET category_id=?, name=?, name_en=?, description=?, short_desc=?, specifications=?, moq=?, lead_time=?, materials=?, tags=?, featured=?, sort_order=? WHERE id=?`)
      .run(category_id, name, name_en, description, short_desc, specifications, moq, lead_time, materials, tags, featured ? 1 : 0, sort_order || 0, req.params.id);

    if (req.files && req.files.length > 0) {
      const existing = db.prepare('SELECT COUNT(*) as c FROM product_images WHERE product_id = ?').get(req.params.id).c;
      const insertImg = db.prepare('INSERT INTO product_images (product_id, image_path, alt_text, is_primary, sort_order) VALUES (?,?,?,?,?)');
      req.files.forEach((file, idx) => {
        insertImg.run(req.params.id, `/uploads/products/${file.filename}`, name, existing === 0 && idx === 0 ? 1 : 0, existing + idx);
      });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

app.delete('/api/products/:id', (req, res) => {
  const images = db.prepare('SELECT image_path FROM product_images WHERE product_id = ?').all(req.params.id);
  images.forEach(img => {
    const filePath = path.join(__dirname, '..', img.image_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.delete('/api/product-images/:id', (req, res) => {
  const img = db.prepare('SELECT * FROM product_images WHERE id = ?').get(req.params.id);
  if (img) {
    const filePath = path.join(__dirname, img.image_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare('DELETE FROM product_images WHERE id = ?').run(req.params.id);
  }
  res.json({ success: true });
});

app.patch('/api/product-images/:id/primary', (req, res) => {
  const img = db.prepare('SELECT * FROM product_images WHERE id = ?').get(req.params.id);
  if (img) {
    db.prepare('UPDATE product_images SET is_primary = 0 WHERE product_id = ?').run(img.product_id);
    db.prepare('UPDATE product_images SET is_primary = 1 WHERE id = ?').run(req.params.id);
  }
  res.json({ success: true });
});

// ─── API: Inquiries ───────────────────────────────────────────────────────────
app.post('/api/inquiries', (req, res) => {
  try {
    const { name, company, email, phone, product_interest, quantity, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ success: false, error: '请填写必填项' });
    db.prepare('INSERT INTO inquiries (name, company, email, phone, product_interest, quantity, message) VALUES (?,?,?,?,?,?,?)')
      .run(name, company, email, phone, product_interest, quantity, message);
    res.json({ success: true, message: '询价成功，我们将尽快与您联系！' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/inquiries', (req, res) => {
  const list = db.prepare('SELECT * FROM inquiries ORDER BY created_at DESC').all();
  res.json({ success: true, data: list });
});

app.patch('/api/inquiries/:id/status', (req, res) => {
  db.prepare('UPDATE inquiries SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
  res.json({ success: true });
});

// ─── Sitemap (AI/SEO) ─────────────────────────────────────────────────────────
app.get('/sitemap.xml', (req, res) => {
  const base = process.env.SITE_URL || `http://localhost:${PORT}`;
  const products = db.prepare('SELECT slug, created_at FROM products').all();
  const cats = db.prepare('SELECT slug FROM categories').all();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${base}/</loc><priority>1.0</priority><changefreq>weekly</changefreq></url>
  <url><loc>${base}/products.html</loc><priority>0.9</priority><changefreq>daily</changefreq></url>
  <url><loc>${base}/about.html</loc><priority>0.7</priority></url>
  <url><loc>${base}/contact.html</loc><priority>0.7</priority></url>`;

  cats.forEach(c => {
    xml += `\n  <url><loc>${base}/products.html?category=${c.slug}</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>`;
  });
  products.forEach(p => {
    xml += `\n  <url><loc>${base}/product.html?slug=${p.slug}</loc><priority>0.7</priority><lastmod>${p.created_at.split('T')[0]}</lastmod></url>`;
  });
  xml += '\n</urlset>';
  res.set('Content-Type', 'application/xml');
  res.send(xml);
});

// ─── robots.txt ───────────────────────────────────────────────────────────────
app.get('/robots.txt', (req, res) => {
  const base = process.env.SITE_URL || `http://localhost:${PORT}`;
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${base}/sitemap.xml\n`);
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  Paper Custom Server running at http://localhost:${PORT}`);
  console.log(`📦  Admin Panel: http://localhost:${PORT}/admin/`);
});
