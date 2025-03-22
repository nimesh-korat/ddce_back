const jwt = require("jsonwebtoken");
require("dotenv").config();

// Generate JWT token
const generateToken = (user) => {
  const payload = {
    id: user.Id,
    Batch: user.tbl_batch,
    Phase: user.tbl_phase,
    name: user.Name,
    email: user.Email_Id,
    role: user.Role,
    Phone_Number: user.Phone_Number,
  };

  const secretKey = process.env.JWT_SECRET_KEY;
  const options = { expiresIn: "1d" }; // Token expires in 1 day

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
