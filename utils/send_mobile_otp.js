const twilio = require('twilio');
require("dotenv").config();

// Your Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;  // Replace with your Twilio Account SID
const authToken = process.env.TWILIO_AUTH_TOKEN;    // Replace with your Twilio Auth Token
const client = new twilio(accountSid, authToken);

// Function to send OTP or any message
async function sendSMS(body, toPhoneNumber) {
    try {
        const message = await client.messages.create({
            body: `Your OTP is: ${body}`,                   // The message body (dynamic)
            from: process.env.TWILIO_PHONE_NUMBER,          // Your Twilio phone number
            to: `+91${toPhoneNumber}`             // Recipient's phone number
        });

        console.log(`Message sent successfully. SID: ${message.sid}`);
        return message.sid; // Return the message SID for further use or logging
    } catch (error) {
        console.error('Error sending SMS:', error);
        throw new Error('Failed to send SMS');
    }
}

module.exports = { sendSMS };
