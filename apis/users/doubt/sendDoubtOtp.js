const pool = require("../../../db/dbConnect");
const { generateOTP } = require("../../../utils/generateOtp");
const { sendSMS } = require("../../../utils/send_mobile_otp");

async function sendDoubtOtp(req, res) {
  const student_id = req?.user?.id;
  if (!student_id)
    return res.status(401).json({ success: false, message: "Unauthorized" });

  try {
    const [[user]] = await pool
      .promise()
      .query("SELECT Id, Name, Phone_Number FROM users WHERE Id = ?", [
        student_id,
      ]);
    if (!user || !user.Phone_Number)
      return res
        .status(400)
        .json({
          success: false,
          message: "Phone number not found for your account",
        });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

    // Store OTP in users table (reuse Phone_OTP column)
    await pool
      .promise()
      .query(
        "UPDATE users SET Phone_OTP = ?, Phone_otp_expire_at = ? WHERE Id = ?",
        [otp, expiresAt, student_id],
      );

    // Send SMS
    const smsResult = await sendSMS(otp, user.Phone_Number);
    if (!smsResult)
      return res
        .status(500)
        .json({ success: false, message: "Failed to send OTP" });

    // Return masked phone number
    const phone = String(user.Phone_Number);
    const maskedPhone = phone.slice(0, 2) + "******" + phone.slice(-2);

    return res.status(200).json({
      success: true,
      message: `OTP sent to ${maskedPhone}`,
      masked_phone: maskedPhone,
    });
  } catch (err) {
    console.error("Error sendDoubtOtp:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { sendDoubtOtp };
