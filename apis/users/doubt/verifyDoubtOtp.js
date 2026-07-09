const pool = require("../../../db/dbConnect");

async function verifyDoubtOtp(req, res) {
  const student_id = req?.user?.id;
  const { otp } = req.body;

  if (!student_id)
    return res.status(401).json({ success: false, message: "Unauthorized" });
  if (!otp)
    return res.status(400).json({ success: false, message: "OTP is required" });

  try {
    const [[user]] = await pool
      .promise()
      .query("SELECT Phone_OTP, Phone_otp_expire_at FROM users WHERE Id = ?", [
        student_id,
      ]);

    if (!user || !user.Phone_OTP)
      return res
        .status(400)
        .json({
          success: false,
          message: "No OTP found. Please request again.",
        });

    if (new Date() > new Date(user.Phone_otp_expire_at))
      return res
        .status(400)
        .json({
          success: false,
          message: "OTP has expired. Please request a new one.",
        });

    if (String(user.Phone_OTP) !== String(otp).trim())
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP. Please try again." });

    // Clear OTP after successful verification
    await pool
      .promise()
      .query(
        "UPDATE users SET Phone_OTP = NULL, Phone_otp_expire_at = NULL WHERE Id = ?",
        [student_id],
      );

    return res
      .status(200)
      .json({ success: true, message: "OTP verified successfully" });
  } catch (err) {
    console.error("Error verifyDoubtOtp:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { verifyDoubtOtp };
