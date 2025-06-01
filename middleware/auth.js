const pool = require("../db/dbConnect");
const { verifyToken } = require("../utils/jwt");

// Middleware to check JWT token
const checkAuth = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized access" });
  }

  try {
    const decoded = verifyToken(token);

    if (!decoded || !decoded.tokenId) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired token" });
    }

    // Check session in database using only tokenId
    const [session] = await pool.promise().query(
      `SELECT 1 FROM sessions 
       WHERE token_id = ? 
       AND status = 'active' 
       AND expires_at > UTC_TIMESTAMP()`,
      [decoded.tokenId]
    );

    if (!session.length) {
      return res
        .status(401)
        .json({ success: false, message: "Session expired or revoked" });
    }

    // Verify token expiration from payload
    if (decoded.exp < Date.now() / 1000) {
      return res
        .status(401)
        .json({ success: false, message: "Session expired" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.error("Error during session verification:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      details: err.message,
    });
  }
};

module.exports = checkAuth;
