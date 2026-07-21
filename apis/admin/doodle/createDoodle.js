const pool = require("../../../db/dbConnect");
const { uploadFileToS3 } = require("../../../utils/uploadFileToS3");

async function createDoodle(req, res) {
  const added_by = req?.user?.id;
  if (!added_by) return res.status(401).json({ success: false, message: "Unauthorized" });

  const { title, start_date, end_date, is_featured } = req.body;
  if (!title || !start_date || !end_date)
    return res.status(400).json({ success: false, message: "title, start_date, end_date are required" });
  if (!req.file)
    return res.status(400).json({ success: false, message: "Image is required" });

  try {
    const fileKey = `doodles/${Date.now()}-${req.file.originalname.replace(/\s/g, "_")}`;
    await uploadFileToS3(process.env.AWS_BUCKET_NAME, fileKey, req.file.buffer, req.file.mimetype);

    const [result] = await pool.promise().query(
      `INSERT INTO tbl_doodle (title, image_url, start_date, end_date, is_featured, added_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title.trim(), fileKey, start_date, end_date, is_featured !== undefined ? is_featured : 1, added_by]
    );
    return res.status(201).json({ success: true, message: "Doodle created", data: { id: result.insertId } });
  } catch (err) {
    console.error("Error createDoodle:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { createDoodle };