// Helper function to generate a 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
}

module.exports = { generateOTP }