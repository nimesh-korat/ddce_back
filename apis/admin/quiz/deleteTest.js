const pool = require("../../../db/dbConnect");

async function deleteTest(req, res) {
  const { id } = req.params;

  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "Test ID is required" });
  }

  try {
    // Check if test exists
    const [existing] = await pool
      .promise()
      .query(
        "SELECT id FROM tbl_test WHERE id = ? AND is_deleted = 0",
        [id]
      );

    if (existing.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Test not found" });
    }

    // Check if any student has already submitted this test
    const [submittedCheck] = await pool
      .promise()
      .query("SELECT id FROM tbl_final_result WHERE test_id = ? LIMIT 1", [id]);

    if (submittedCheck.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete: students have already submitted this test. Deleting would corrupt result data.",
      });
    }

    // Soft delete the test
    await pool
      .promise()
      .query(
        "UPDATE tbl_test SET is_deleted = 1, status = '0' WHERE id = ?",
        [id]
      );

    return res.status(200).json({
      success: true,
      message: "Test deleted successfully",
    });
  } catch (err) {
    console.error("Error processing deleteTest:", err.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      details: err.message,
    });
  }
}

module.exports = { deleteTest };
