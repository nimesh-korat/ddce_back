const pool = require("../../../db/dbConnect");
const { uploadFileToS3 } = require("../../../utils/uploadFileToS3");

async function updateFeesReminder(req, res) {
  try {
    const { id } = req.params;
    const { title, description, amount, payment_link, clear_qr } = req.body;

    const [[existing]] = await pool
      .promise()
      .query("SELECT * FROM tbl_fees_reminder WHERE id = ?", [id]);
    if (!existing)
      return res.status(404).json({ success: false, message: "Not found" });

    let qr_code = existing.qr_code;
    if (clear_qr === "1") qr_code = null;
    if (req.file) {
      const key = `fees-qr/${Date.now()}-${req.file.originalname.replace(/\s/g, "_")}`;
      qr_code = await uploadFileToS3(
        process.env.AWS_BUCKET_NAME,
        key,
        req.file.buffer,
        req.file.mimetype,
      );
    }

    await pool.promise().query(
      `UPDATE tbl_fees_reminder
       SET title=?, description=?, amount=?, qr_code=?, payment_link=?
       WHERE id=?`,
      [
        title || existing.title,
        description ?? existing.description,
        amount ?? existing.amount,
        qr_code,
        payment_link ?? existing.payment_link,
        id,
      ],
    );
    res.json({ success: true, message: "Reminder updated" });
  } catch (err) {
    console.error("updateFeesReminder:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { updateFeesReminder };
