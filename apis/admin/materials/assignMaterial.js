const pool = require("../../../db/dbConnect");

async function assignMaterial(req, res) {
  const { material_id, tbl_batch, tbl_phase, is_visible = 1 } = req.body;
  const assigned_by = req?.user?.id;

  if (!material_id || !tbl_batch)
    return res
      .status(400)
      .json({ success: false, message: "material_id and tbl_batch required" });

  try {
    await pool.promise().query(
      `INSERT INTO tbl_material_assigned (material_id, tbl_batch, tbl_phase, is_visible, assigned_by)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE is_visible = VALUES(is_visible)`,
      [material_id, tbl_batch, tbl_phase || null, is_visible, assigned_by],
    );
    return res
      .status(200)
      .json({ success: true, message: "Material assigned successfully" });
  } catch (err) {
    console.error("Error assignMaterial:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { assignMaterial };
