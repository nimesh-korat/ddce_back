const pool = require("../../../db/dbConnect");

async function deleteSession(req, res) {
  const { id } = req.params;

  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "Session ID is required" });
  }

  try {
    const [existing] = await pool
      .promise()
      .query(
        "SELECT Id FROM tbl_session WHERE Id = ? AND is_deleted = 0",
        [id]
      );

    if (existing.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    // Soft delete — also deactivate
    await pool
      .promise()
      .query(
        "UPDATE tbl_session SET is_deleted = 1, is_active = '0' WHERE Id = ?",
        [id]
      );

    return res.status(200).json({
      success: true,
      message: "Session deleted successfully",
    });
  } catch (err) {
    console.error("Error processing deleteSession:", err.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      details: err.message,
    });
  }
}

module.exports = { deleteSession };
