const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect()
  .then(client => {
    console.log("✅ Connected to PostgreSQL with SSL");
    client.release();
  })
  .catch(err => console.error("❌ PostgreSQL connection error:", err));

module.exports = pool;
