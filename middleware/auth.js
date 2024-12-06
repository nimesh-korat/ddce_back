const pool = require("../db/dbConnect");
const { verifyToken } = require('../utils/jwt');

// Middleware to check JWT token
const checkAuth = async (req, res, next) => {
    const token = req.header("Authorization")?.replace("Bearer ", ""); // Get token from Authorization header

    if (!token) {
        return res.status(401).json({ success: false, message: "Unauthorized access" });
    }

    try {
        // Verify the JWT token
        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({ success: false, message: "Invalid or expired token" });
        }

        // // Check if the token ID exists and is still active in the database
        // const sql = "SELECT * FROM sessions WHERE token_id = ? AND status = 'active' AND expires_at > UTC_TIMESTAMP()";
        // const [session] = await pool.promise().query(sql, [token]); //changed from tokenId to token for temperory

        // if (session.length === 0) {
        //     return res.status(401).json({ success: false, message: "Session expired or revoked" });
        // }

        req.user = decoded; // Attach user info to the request object
        next(); // Proceed to the next middleware or route handler
    } catch (err) {
        console.error("Error during session verification:", err.message);
        return res.status(500).json({ success: false, message: "Internal server error", details: err.message });
    }
};

module.exports = checkAuth;
