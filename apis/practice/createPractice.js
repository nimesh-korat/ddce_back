const pool = require("../../db/dbConnect");
const { uploadFileToS3 } = require("../../utils/uploadFileToS3");

async function createPractice(req, res) {
  const added_by = req?.user?.id;
  if (!added_by) return res.status(401).json({ success: false, message: "Unauthorized" });

  const { title, description } = req.body;
  if (!title?.trim())
    return res.status(400).json({ success: false, message: "Title is required" });

  try {
    let image_url = null;
    if (req.file) {
      const fileKey = `practice_images/${Date.now()}-${req.file.originalname}`;
      await uploadFileToS3(process.env.AWS_BUCKET_NAME, fileKey, req.file.buffer, req.file.mimetype);
      image_url = fileKey;
    }

    const [result] = await pool.promise().query(
      `INSERT INTO tbl_practice (title, description, image_url, added_by) VALUES (?, ?, ?, ?)`,
      [title.trim(), description || null, image_url, added_by]
    );

    return res.status(201).json({
      success: true,
      message: "Practice created successfully",
      data: { id: result.insertId },
    });
  } catch (err) {
    console.error("Error createPractice:", err.message);
    return res.status(500).json({ success: false, message: "Something went wrong", details: err.message });
  }
}

module.exports = { createPractice };
