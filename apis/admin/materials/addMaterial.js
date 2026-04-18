const pool = require("../../../db/dbConnect");
const { uploadFileToS3 } = require("../../../utils/uploadFileToS3");

async function addMaterial(req, res) {
  const { title, description, subject_id, material_type } = req.body;

  const added_by = req?.user?.id;
  if (!added_by) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  if (!title) {
    return res
      .status(400)
      .json({ success: false, message: "Title is required" });
  }

  try {
    let material_url = null;
    let solution_url = null;

    // Upload material PDF to S3
    if (req.files?.["material_file"]?.[0]) {
      const file = req.files["material_file"][0];
      const fileKey = `materials/${Date.now()}-${file.originalname}`;
      await uploadFileToS3(
        process.env.AWS_BUCKET_NAME,
        fileKey,
        file.buffer,
        file.mimetype,
      );
      material_url = fileKey;
    }

    // Upload solution PDF to S3
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
      INSERT INTO tbl_materials 
        (title, description, file_url, file_type, solution_url, solution_visible, subject_id, material_type, added_by)
      VALUES (?, ?, ?, 'pdf', ?, 0, ?, ?, ?)
    `;
    const values = [
      title,
      description || null,
      material_url,
      solution_url,
      subject_id || null,
      material_type || null,
      added_by,
    ];

    const [result] = await pool.promise().query(sql, values);

    return res.status(201).json({
      success: true,
      message: "Material added successfully",
      data: { id: result.insertId },
    });
  } catch (err) {
    console.error("Error processing addMaterial:", err.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      details: err.message,
    });
  }
}

module.exports = { addMaterial };
