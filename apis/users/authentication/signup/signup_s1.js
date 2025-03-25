const bcrypt = require("bcrypt");
const pool = require("../../../../db/dbConnect");
const { generateOTP } = require("../../../../utils/generateOtp");
const { sendEmail } = require("../../../../utils/send_email_otp");
const { sendSMS } = require("../../../../utils/send_mobile_otp");

async function SignupUser_s1(req, res) {
  const { Name, Email_Id, Phone_Number, Whatsapp_Number, Password } = req.body;

  // Validate input fields
  if (!Name || !Email_Id || !Phone_Number || !Password) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    // Check if email or phone number already exists
    const sqlCheck = `
            SELECT * FROM users WHERE Email_Id = ? OR Phone_Number = ?
        `;
    const [existingUser] = await pool
      .promise()
      .query(sqlCheck, [Email_Id, Phone_Number]);

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Email or Phone Number already exists. Please use a different one.",
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(Password, 10);

    // Generate OTPs
    // let Email_OTP = generateOTP();
    let Phone_OTP = generateOTP();

    // Ensure OTPs are different
    // while (Email_OTP === Phone_OTP) {
    //     Phone_OTP = generateOTP();
    // }

    // Set OTP expiration time
    const otpExpiresAt = new Date(Date.now() + 3 * 60 * 1000);

    // let emailSuccess = false;
    let smsSuccess = false;

    // Attempt to send OTPs
    try {
      // const emailResult = await sendEmail(Email_Id, "Your OTP for DDCET Registration", `Your OTP is: ${Email_OTP}`);
      // emailSuccess = emailResult.success;

      const smsResult = await sendSMS(
        `Your OTP is: ${Phone_OTP}`,
        Phone_Number
      );
      smsSuccess = !!smsResult;
    } catch (error) {
      console.error("Error during OTP delivery:", error.message);
    }

    // Update OTPs to null if delivery fails
    // if (!emailSuccess) Email_OTP = null;
    if (!smsSuccess) Phone_OTP = null;

    const sql = `
            INSERT INTO users 
            (tbl_phase, tbl_batch, Name, Email_Id, Role, Phone_Number, Whatsapp_Number, Password, Phone_OTP, Phone_otp_expire_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ? )
        `;
    const values = [
      1,
      2,
      Name,
      Email_Id,
      0,
      Phone_Number,
      Phone_Number, // Assuming Whatsapp_Number is the same as Phone_Number
      hashedPassword,
      // Email_OTP,
      // emailSuccess ? otpExpiresAt : null,
      Phone_OTP,
      smsSuccess ? otpExpiresAt : null,
    ];

    // Execute query using pool
    const [result] = await pool.promise().query(sql, values);

    // const message =
    //     emailSuccess && smsSuccess
    //         ? "User registered successfully. OTPs sent."
    //         : emailSuccess
    //             ? "User registered successfully. Email OTP sent, SMS delivery failed."
    //             : smsSuccess
    //                 ? "User registered successfully. SMS OTP sent, Email delivery failed."
    //                 : "User registered successfully, but OTP delivery failed.";

    const message = smsSuccess ? "SMS OTP sent." : "OTP delivery failed.";

    return res.status(201).json({
      success: true,
      message,
      userId: result.insertId,
    });
  } catch (error) {
    console.error("Error processing SignupUser_s1:", error.message);
    return res.status(500).json({
      success: false,
      message: "Error processing request",
      details: error.message,
    });
  }
}

module.exports = { SignupUser_s1 };
