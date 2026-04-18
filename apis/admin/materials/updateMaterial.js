const pool = require("../../../db/dbConnect");
const { uploadFileToS3 } = require("../../../utils/uploadFileToS3");

async function updateMaterial(req, res) {
  const { id } = req.params;
  const { title, description, subject_id, material_type } = req.body;

  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "Material ID is required" });
  }

  if (!title) {
    return res
      .status(400)
      .json({ success: false, message: "Title is required" });
  }

  try {
    const [existing] = await pool
      .promise()
      .query("SELECT * FROM tbl_materials WHERE id = ? AND status = 1", [id]);

    if (existing.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Material not found" });
    }

    let file_url = existing[0].file_url; // keep existing
    let solution_url = existing[0].solution_url; // keep existing

    // Upload new material PDF if provided
    if (req.files?.["material_file"]?.[0]) {
      const file = req.files["material_file"][0];
      const fileKey = `materials/${Date.now()}-${file.originalname}`;
      await uploadFileToS3(
        process.env.AWS_BUCKET_NAME,
        fileKey,
        file.buffer,
        file.mimetype,
      );
      file_url = fileKey;
    }

    // Upload new solution PDF if provided
    if (req.files?.["solution_file"]?.[0]) {
      const file = req.files["solution_file"][0];
      const fileKey = `materials/solutions/${Date.now()}-${file.originalname}`;
      await uploadFileToS3(
        process.env.AWS_BUCKET_NAME,
        fileKey,
        file.buffer,
        file.mimetype,
      );
      solution_url = fileKey;
    }

    const sql = `
      UPDATE tbl_materials
      SET title = ?, description = ?, file_url = ?, solution_url = ?,
          subject_id = ?, material_type = ?
      WHERE id = ?
    `;
    const values = [
      title,
      description || null,
      file_url,
      solution_url,
      subject_id || null,
      material_type || null,
      id,
    ];

    await pool.promise().query(sql, values);

    return res.status(200).json({
      success: true,
      message: "Material updated successfully",
    });
  } catch (err) {
    console.error("Error processing updateMaterial:", err.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      details: err.message,
    });
  }
}

module.exports = { updateMaterial };
