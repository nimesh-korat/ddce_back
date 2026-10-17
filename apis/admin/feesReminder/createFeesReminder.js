const pool = require("../../../db/dbConnect");
const { uploadFileToS3 } = require("../../../utils/uploadFileToS3");

async function createFeesReminder(req, res) {
  try {
    const { title, description, amount, payment_link } = req.body;
    if (!title) return res.status(400).json({ success: false, message: "Title is required" });

    let qr_code = null;
    if (req.file) {
      const key = `fees-qr/${Date.now()}-${req.file.originalname.replace(/\s/g, "_")}`;
      await uploadFileToS3(process.env.AWS_BUCKET_NAME, key, req.file.buffer, req.file.mimetype);
      qr_code = key; // store key only, not full URL
    }

    const [result] = await pool.promise().query(
      `INSERT INTO tbl_fees_reminder (title, description, amount, qr_code, payment_link, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        title,
        description || null,
        amount || null,
        qr_code,
        payment_link || null,
        req.user.id,
      ]
    );
    res.json({ success: true, id: result.insertId, message: "Reminder created" });
  } catch (err) {
    console.error("createFeesReminder:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { createFeesReminder };