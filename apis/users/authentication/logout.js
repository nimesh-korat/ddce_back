const pool = require("../../../db/dbConnect");

async function LogoutUser(req, res) {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    const { session } = req.body;

    // const tokenId = req.cookies.token_id; // Get token ID from cookie
    if (!session && !token) {
        return res.status(400).json({ success: false, message: "No active session" });
    }

    try {
        // Mark the session as revoked in the database
        const sqlUpdateSession = "UPDATE sessions SET status = 'revoked' WHERE token_id = ?";
        const [result] = await pool.promise().query(sqlUpdateSession, [session]); //changed from tokenId to token for temperory

        // // Remove the token_id cookie from the client
        // res.clearCookie("token_id", { httpOnly: true, secure: process.env.NODE_ENV === "production" });
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Session not found or already revoked" });
        }

        return res.status(200).json({ success: true, message: "Logout successful" });
    } catch (err) {
        console.error("Error during logout:", err.message);
        return res.status(500).json({ success: false, message: "Error during logout", details: err.message });
    }
}

module.exports = { LogoutUser };
