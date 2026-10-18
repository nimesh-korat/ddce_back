const mysql = require("mysql2");
require("dotenv").config();

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true, // Queue queries if no connection is available
  connectionLimit: 10, // Maximum number of connections in the pool
  queueLimit: 0, // Unlimited queue length
  // Return DATETIME/DATE/TIMESTAMP columns as plain strings ("2026-10-27 23:59:00")
  // instead of JS Date objects. Without this, mysql2 serialises them to UTC ISO strings
  // in JSON responses, causing a +5:30 hour shift when the frontend displays them as
  // local IST time.
  dateStrings: true,
});

// Test the connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error("Error connecting to MySQL:", err.message);
    return;
  }
  console.log("Connected to MySQL database!");
  connection.release(); // Release the connection back to the pool
});

// Export the pool for use in other files
module.exports = pool;
