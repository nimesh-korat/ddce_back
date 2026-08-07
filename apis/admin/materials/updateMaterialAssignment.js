const pool = require("../../../db/dbConnect");

async function updateMaterialAssignment(req, res) {
  const { id } = req.params;
  const { is_visible, solution_visible } = req.body;

  try {
    if (is_visible !== undefined) {
      await pool
        .promise()
        .query("UPDATE tbl_material_assigned SET is_visible = ? WHERE id = ?", [
          is_visible,
          id,
        ]);
    }
    if (solution_visible !== undefined) {
      await pool
        .promise()
        .query(
          "UPDATE tbl_material_assigned SET solution_visible = ? WHERE id = ?",
          [solution_visible, id],
        );
    }
    return res
      .status(200)
      .json({ success: true, message: "Updated successfully" });
  } catch (err) {
    console.error("Error updateMaterialAssignment:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { updateMaterialAssignment };
