const pool = require("../../../db/dbConnect");

async function deleteBatch(req, res) {
  const { id } = req.params;

  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "Batch ID is required" });
  }

  try {
    const [existing] = await pool
      .promise()
      .query("SELECT id FROM tbl_batch WHERE id = ? AND is_deleted = 0", [id]);

    if (existing.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Batch not found" });
    }

    // Check if batch is assigned to any test
    const [testAssigned] = await pool
      .promise()
      .query(
        "SELECT id FROM tbl_test_assigned WHERE tbl_batch = ? LIMIT 1",
        [id]
      );

    if (testAssigned.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete: this batch is assigned to one or more tests. Remove assignments first.",
      });
    }

    // Check if batch has students assigned
    const [studentCheck] = await pool
      .promise()
      .query("SELECT Id FROM users WHERE tbl_batch = ? LIMIT 1", [id]);

    if (studentCheck.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete: students are assigned to this batch. Reassign them first.",
      });
    }

    await pool
      .promise()
      .query("UPDATE tbl_batch SET is_deleted = 1 WHERE id = ?", [id]);

    return res.status(200).json({
      success: true,
      message: "Batch deleted successfully",
    });
  } catch (err) {
    console.error("Error processing deleteBatch:", err.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      details: err.message,
    });
  }
}

module.exports = { deleteBatch };
