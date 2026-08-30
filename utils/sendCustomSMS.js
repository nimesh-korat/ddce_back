const axios = require("axios");
require("dotenv").config();

async function sendCustomSMS(message, toPhoneNumber) {
  try {
    const response = await axios.get("http://sms.hspsms.com/sendSMS", {
      params: {
        username: process.env.SMS_USERNAME,
        message: message,
        sendername: process.env.SMS_SENDERNAME,
        smstype: "TRANS",
        numbers: toPhoneNumber,
        apikey: process.env.SMS_API_KEY,
      },
    });
    console.log("Custom SMS sent:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error sending custom SMS:", error.message);
    return null; // Don't throw — SMS failure shouldn't break the main flow
  }
}

module.exports = { sendCustomSMS };
