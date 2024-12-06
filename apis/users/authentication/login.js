const pool = require("../../../db/dbConnect"); // Adjust the path to your dbConnect file
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { generateToken } = require("../../../utils/jwt");

async function LoginUser(req, res) {
  const { Phone_Number, Password } = req.body;

  if (!Phone_Number || !Password) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const sql = "SELECT * FROM users WHERE Phone_Number = ? AND Role = '0'"; // Query to fetch user by email

  try {
    // Use the connection pool to execute the query
    const [results] = await pool.promise().query(sql, [Phone_Number]);

    // If no user found with the provided email
    if (results.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // User exists, now check verification and compare password
    const user = results[0];

    // Ensure both Email and Phone are verified
    if (!user.Phone_Verified) {
      return res.status(403).json({
        success: false,
        message: "Account not verified. Please verify your phone number.",
      });
    }

    // Compare the provided password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(Password, user.Password);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid Phone or password" });
    }
    // Update expired sessions
    const sqlUpdateExpiredSessions = `
    UPDATE sessions 
    SET status = 'revoked'
    WHERE user_id = ? 
    AND status = 'active' 
    AND expires_at <= UTC_TIMESTAMP()`;
    await pool.promise().query(sqlUpdateExpiredSessions, [user.Id]);

    // Check how many active sessions the user already has
    const sqlCheckActiveSessions = `
  SELECT * 
  FROM sessions 
  WHERE user_id = ? 
  AND status = 'active' 
  AND expires_at > UTC_TIMESTAMP()
`;
    const [activeSessions] = await pool.promise().query(sqlCheckActiveSessions, [user.Id]);

    if (activeSessions.length >= 2) {

      return res.status(403).json({
        success: false,
        message: "You can only be logged in on two devices simultaneously.",
      });
    }

    // Generate a JWT token
    const token = generateToken(user);

    // Store the token in the sessions table
    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // Token expires in 12 hours 12 * 60 * 60 * 1000

    const sqlInsertSession = "INSERT INTO sessions (token_id, user_id,  expires_at) VALUES (?, ?,  UTC_TIMESTAMP() + INTERVAL 12 HOUR)";
    await pool.promise().query(sqlInsertSession, [tokenId, user.Id, expiresAt]);

    // res.cookie("token_id", tokenId, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production", // Set to true in production for HTTPS
    //   maxAge: 12 * 60 * 60 * 1000, // Same expiration as JWT (12 hours)
    // });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user.Id,
        name: user.Name,
        email: user.Email_Id,
        role: user.Role,
        phone: user.Phone_Number,
        whatsapp: user.Whatsapp_Number,
        enrollment_no: user.Enrollment_No,
        college_name: user.College_Name,
        branch_name: user.Branch_Name,
        semester: user.Semester,
        user_dp: user.User_DP,
        dob: user.DOB,
        address: user.Address,
        email_otp: user.Email_OTP,
        email_otp_expire_at: user.Email_otp_expire_at,
        phone_otp: user.Phone_OTP,
        phone_otp_expire_at: user.Phone_otp_expire_at,
        email_verified: user.Email_Verified,
        phone_verified: user.Phone_Verified,
        registration_time: user.registration_time
      },
      auth: {
        token,
        session: tokenId
      },
    });

  } catch (err) {
    console.error("Error processing login:", err.message);
    return res.status(500).json({ success: false, message: "Error processing request", details: err.message });
  }
}

module.exports = { LoginUser }; 