const pool = require("../../../db/dbConnect");

async function updateBatch(req, res) {
  const { id } = req.params;
  const { batch_title } = req.body;

  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "Batch ID is required" });
  }

  if (!batch_title || !batch_title.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Batch title is required" });
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

    await pool
      .promise()
      .query("UPDATE tbl_batch SET batch_title = ? WHERE id = ?", [
        batch_title.trim(),
        id,
      ]);

    return res.status(200).json({
      success: true,
      message: "Batch updated successfully",
    });
  } catch (err) {
    console.error("Error processing updateBatch:", err.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      details: err.message,
    });
  }
}

module.exports = { updateBatch };
