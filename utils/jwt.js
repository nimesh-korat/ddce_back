const jwt = require('jsonwebtoken');
require('dotenv').config();

// Generate JWT token
const generateToken = (user) => {
    const payload = {
        id: user.Id,
        Batch: user.tbl_batch,
        name: user.Name,
        email: user.Email_Id,
        role: user.Role,
        Phone_Number: user.Phone_Number,
    };

    const secretKey = process.env.JWT_SECRET_KEY;
    // const options = { expiresIn: '1m' }; // Token expires in 1 minute

    return jwt.sign(payload, secretKey);
};

// Verify JWT token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET_KEY);
    } catch (error) {
        return null;
    }
};

module.exports = { generateToken, verifyToken };
