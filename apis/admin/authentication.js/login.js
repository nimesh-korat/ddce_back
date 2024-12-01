const pool = require("../../../db/dbConnect"); // Adjust the path to your dbConnect file
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { generateToken } = require("../../../utils/jwt");

async function LoginAdmin(req, res) {
    const { Email, Password } = req.body;

    if (!Email || !Password) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const sql = "SELECT * FROM admin WHERE Email = ?"; // Query to fetch user by email
    console.log(req.body);


    try {

        const [results] = await pool.promise().query(sql, [Email]);

        // If no user found with the provided email
        if (results.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }


        // User exists, now check verification and compare password
        const admin = results[0];
        // Compare the provided password with the hashed password in the database

        const isPasswordValid = await bcrypt.compare(Password, admin.Password);

        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        // Update expired sessions
        const sqlUpdateExpiredSessions = `
        UPDATE sessions 
        SET status = 'revoked'
        WHERE admin_id = ? 
        AND status = 'active' 
        AND expires_at <= UTC_TIMESTAMP()`;
        await pool.promise().query(sqlUpdateExpiredSessions, [admin.Id]);

        // Check how many active sessions the user already has
        const sqlCheckActiveSessions = "SELECT * FROM sessions WHERE admin_id = ? AND status = 'active' AND expires_at > UTC_TIMESTAMP()";
        const [activeSessions] = await pool.promise().query(sqlCheckActiveSessions, [admin.Id]);

        if (activeSessions.length >= 1) {

            return res.status(403).json({
                success: false,
                message: "You can only be logged in on one devices simultaneously. Please log out from one device to log in to a new device.",
            });
        }

        // Generate a JWT token
        const token = generateToken(admin);

        // Store the token in the sessions table
        const tokenId = uuidv4();
        const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // Token expires in 12 hours 12 * 60 * 60 * 1000

        const sqlInsertSession = "INSERT INTO sessions (token_id, admin_id, expires_at) VALUES (?, ?, UTC_TIMESTAMP() + INTERVAL 12 HOUR)";
        await pool.promise().query(sqlInsertSession, [token, admin.Id, expiresAt]); //changed from tokenId to token for temperory

        // Send JWT token and tokenId as cookie
        res.cookie("token_id", tokenId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // Set to true in production for HTTPS
            maxAge: 12 * 60 * 60 * 1000, // Same expiration as JWT (12 hours)
        });

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                id: admin.Id,
                name: admin.Name,
                phone: admin.Phone,
                email: admin.Email,
                role: "1"
            },
            token: token, // Send the token in the response if needed
        });

    } catch (err) {
        console.error("Error processing login:", err.message);
        return res.status(500).json({ success: false, message: "Error processing request", details: err.message });
    }
}

module.exports = { LoginAdmin }; 