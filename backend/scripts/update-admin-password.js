// One-time script: rotates the live admin password to the new strong password
// Run: node scripts/update-admin-password.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const newHash = await bcrypt.hash('K@mpSt0ck#Admin!2026', 12);
  const result = await pool.query(
    "UPDATE users SET password_hash = $1 WHERE username = 'admin'",
    [newHash],
  );
  console.log('Updated rows:', result.rowCount);
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
