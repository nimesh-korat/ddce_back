const pool = require("../../../db/dbConnect");

async function deleteMaterial(req, res) {
  const { id } = req.params;

  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "Material ID is required" });
  }

  try {
    // Check if the material exists
    const [existing] = await pool
      .promise()
      .query("SELECT id FROM tbl_materials WHERE id = ? AND status = 1", [id]);

    if (existing.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Material not found" });
    }

    // Soft delete — set status to 0
    await pool
      .promise()
      .query("UPDATE tbl_materials SET status = 0 WHERE id = ?", [id]);

    return res.status(200).json({
      success: true,
      message: "Material deleted successfully",
    });
  } catch (err) {
    console.error("Error processing deleteMaterial:", err.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      details: err.message,
    });
  }
}

module.exports = { deleteMaterial };
