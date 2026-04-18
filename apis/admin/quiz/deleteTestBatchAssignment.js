const pool = require("../../../db/dbConnect");

async function deleteTestBatchAssignment(req, res) {
  const { id } = req.params;

  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "Assignment ID is required" });
  }

  try {
    const [existing] = await pool
      .promise()
      .query("SELECT id FROM tbl_test_assigned WHERE id = ?", [id]);

    if (existing.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Assignment not found" });
    }

    await pool
      .promise()
      .query("DELETE FROM tbl_test_assigned WHERE id = ?", [id]);

    return res.status(200).json({
      success: true,
      message: "Batch assignment removed successfully",
    });
  } catch (err) {
    console.error("Error processing deleteTestBatchAssignment:", err.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      details: err.message,
    });
  }
}

module.exports = { deleteTestBatchAssignment };
