// const twilio = require('twilio');
// require("dotenv").config();

// // Your Twilio credentials
// const accountSid = process.env.TWILIO_ACCOUNT_SID;  // Replace with your Twilio Account SID
// const authToken = process.env.TWILIO_AUTH_TOKEN;    // Replace with your Twilio Auth Token
// const client = new twilio(accountSid, authToken);

// // Function to send OTP or any message
// async function sendSMS(body, toPhoneNumber) {
//     try {
//         const message = await client.messages.create({
//             body: `Your OTP is: ${body}`,                   // The message body (dynamic)
//             from: process.env.TWILIO_PHONE_NUMBER,          // Your Twilio phone number
//             to: `+91${toPhoneNumber}`             // Recipient's phone number
//         });

//         return message.sid; // Return the message SID for further use or logging
//     } catch (error) {
//         console.error('Error sending SMS:', error);
//         throw new Error('Failed to send SMS');
//     }
// }

// module.exports = { sendSMS };

const axios = require("axios");
require("dotenv").config();

async function sendSMS(otp, toPhoneNumber) {
  try {
    const message = `Dear User,\n\n${otp}  is your One Time Password for mobile number verification of Unity Training Academy. Please do not share it with anyone.\nDeveloped by,\n\n- INFOLABZ`;

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

    // The API usually returns a success or error message
    console.log("SMS API Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw new Error("Failed to send SMS via HTTP API");
  }
}

module.exports = { sendSMS };
