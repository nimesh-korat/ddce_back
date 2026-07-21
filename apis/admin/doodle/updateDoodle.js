const pool = require("../../../db/dbConnect");
const { uploadFileToS3 } = require("../../../utils/uploadFileToS3");

async function updateDoodle(req, res) {
  const { id } = req.params;
  const { title, start_date, end_date, is_featured } = req.body;
  try {
    const [[existing]] = await pool.promise().query("SELECT * FROM tbl_doodle WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ success: false, message: "Doodle not found" });

    let image_url = existing.image_url;
    if (req.file) {
      const fileKey = `doodles/${Date.now()}-${req.file.originalname.replace(/\s/g, "_")}`;
      await uploadFileToS3(process.env.AWS_BUCKET_NAME, fileKey, req.file.buffer, req.file.mimetype);
      image_url = fileKey;
    }

    await pool.promise().query(
      `UPDATE tbl_doodle SET title=?, image_url=?, start_date=?, end_date=?, is_featured=? WHERE id=?`,
      [title || existing.title, image_url, start_date || existing.start_date, end_date || existing.end_date, is_featured !== undefined ? is_featured : existing.is_featured, id]
    );
    return res.status(200).json({ success: true, message: "Doodle updated" });
  } catch (err) {
    console.error("Error updateDoodle:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { updateDoodle };