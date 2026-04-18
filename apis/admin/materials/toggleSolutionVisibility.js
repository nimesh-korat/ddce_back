const pool = require("../../../db/dbConnect");

async function toggleSolutionVisibility(req, res) {
  const { id } = req.params;

  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "Material ID is required" });
  }

  try {
    // Fetch current state
    const [existing] = await pool
      .promise()
      .query(
        "SELECT solution_url, solution_visible FROM tbl_materials WHERE id = ? AND status = 1",
        [id]
      );

    if (existing.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Material not found" });
    }

    // Cannot show solution if no solution has been uploaded yet
    if (!existing[0].solution_url && existing[0].solution_visible === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload a solution PDF before making it visible",
      });
    }

    // Toggle
    const newValue = existing[0].solution_visible === 1 ? 0 : 1;

    await pool
      .promise()
      .query(
        "UPDATE tbl_materials SET solution_visible = ? WHERE id = ?",
        [newValue, id]
      );

    return res.status(200).json({
      success: true,
      message: newValue === 1 ? "Solution is now visible to students" : "Solution hidden from students",
      data: { solution_visible: newValue },
    });
  } catch (err) {
    console.error("Error processing toggleSolutionVisibility:", err.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      details: err.message,
    });
  }
}

module.exports = { toggleSolutionVisibility };
