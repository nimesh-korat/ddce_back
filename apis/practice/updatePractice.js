const pool = require("../../db/dbConnect");
const { uploadFileToS3 } = require("../../utils/uploadFileToS3");

async function updatePractice(req, res) {
  const { id }   = req.params;
  const user_id  = req?.user?.id;
  const role     = req?.user?.role;
  if (!user_id) return res.status(401).json({ success: false, message: "Unauthorized" });

  const { title, description } = req.body;
  if (!title?.trim())
    return res.status(400).json({ success: false, message: "Title is required" });

  try {
    const [existing] = await pool.promise().query(
      "SELECT id, added_by, image_url FROM tbl_practice WHERE id = ? AND is_active = 1", [id]
    );
    if (existing.length === 0)
      return res.status(404).json({ success: false, message: "Practice not found" });
    // Mentor can only edit own; admin can edit all
    if (role === 2 && existing[0].added_by !== user_id)
      return res.status(403).json({ success: false, message: "You can only edit your own practices" });

    let image_url = existing[0].image_url;
    if (req.file) {
      const fileKey = `practice_images/${Date.now()}-${req.file.originalname}`;
      await uploadFileToS3(process.env.AWS_BUCKET_NAME, fileKey, req.file.buffer, req.file.mimetype);
      image_url = fileKey;
    }

    await pool.promise().query(
      `UPDATE tbl_practice SET title = ?, description = ?, image_url = ?, updated_by = ? WHERE id = ?`,
      [title.trim(), description || null, image_url, user_id, id]
    );

    return res.status(200).json({ success: true, message: "Practice updated successfully" });
  } catch (err) {
    console.error("Error updatePractice:", err.message);
    return res.status(500).json({ success: false, message: "Something went wrong", details: err.message });
  }
}

module.exports = { updatePractice };
