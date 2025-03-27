const pool = require("../../../../db/dbConnect");
const { generateOTP } = require("../../../../utils/generateOtp");
const { sendSMS } = require("../../../../utils/send_mobile_otp");

async function resendMobileOTP(req, res) {
  const { Phone_Number } = req.body;

  // Validate input fields
  if (!Phone_Number) {
    return res
      .status(400)
      .json({ success: false, message: "Phone number is required" });
  }

  try {
    // Check if phone number is already verified
    const sqlCheck = `
            SELECT Phone_Verified FROM users WHERE Phone_Number = ?
        `;
    const [user] = await pool.promise().query(sqlCheck, [Phone_Number]);

    if (user.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Phone number not found" });
    }

    // If phone number is already verified, do not resend OTP
    if (user[0].Phone_Verified === 1) {
      return res
        .status(400)
        .json({ success: false, message: "Phone Number Is Already Verified." });
    }

    // Generate a new OTP
    const newMobileOTP = generateOTP();

    // Set OTP expiration time (e.g., 3 minutes from now)
    const otpExpiresAt = new Date(Date.now() + 3 * 60 * 1000);

    // Send the new OTP via SMS
    const smsResult = await sendSMS(newMobileOTP, Phone_Number);

    // Only update OTP in the database if SMS is sent successfully
    if (smsResult) {
      // SQL query to update the new OTP and expiration time
      const sqlUpdate = `
                UPDATE users 
                SET Phone_OTP = ?, Phone_otp_expire_at = ? 
                WHERE Phone_Number = ?
            `;

      // Execute query using the connection pool
      const [results] = await pool
        .promise()
        .query(sqlUpdate, [newMobileOTP, otpExpiresAt, Phone_Number]);

      if (results.affectedRows === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Phone Number Not Found" });
      }

      return res.status(200).json({
        success: true,
        message: "OTP resent successfully. Please check your SMS.",
      });
    } else {
      return res
        .status(500)
        .json({ success: false, message: "Failed to send OTP SMS" });
    }
  } catch (err) {
    console.error("Error processing resendMobileOTP:", err.message);
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to process request",
        details: err.message,
      });
  }
}

module.exports = { resendMobileOTP };
