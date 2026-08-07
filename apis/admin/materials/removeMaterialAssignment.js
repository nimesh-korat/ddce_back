const pool = require("../../../db/dbConnect");

async function removeMaterialAssignment(req, res) {
  const { id } = req.params;
  try {
    await pool
      .promise()
      .query("DELETE FROM tbl_material_assigned WHERE id = ?", [id]);
    return res
      .status(200)
      .json({ success: true, message: "Assignment removed" });
  } catch (err) {
    console.error("Error removeMaterialAssignment:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { removeMaterialAssignment };
