const jwt = require('jsonwebtoken');
require('dotenv').config();

// Generate JWT token
const generateToken = (user) => {
    const payload = {
        id: user.Id,
        name: user.Name,
        email: user.Email_Id,
    };

    const secretKey = process.env.JWT_SECRET_KEY;
    const options = { expiresIn: '12h' }; // Token expires in 1 hour

    return jwt.sign(payload, secretKey, options);
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
