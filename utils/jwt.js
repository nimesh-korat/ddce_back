const e = require("express");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { v4: uuidv4 } = require("uuid");

// Generate JWT token
const generateToken = (user) => {
  const tokenId = uuidv4();

  const payload = {
    id: user.Id,
    tokenId: tokenId,
    Batch: user.tbl_batch,
    Phase: user.tbl_phase,
    name: user.Name,
    email: user.Email_Id,
    role: user.Role,
    Phone_Number: user.Phone_Number,
  };

  const secretKey = process.env.JWT_SECRET_KEY;
  const options = { expiresIn: "4h" }; //  Token expires in 4 hours

  return { token: jwt.sign(payload, secretKey, options), tokenId };
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
