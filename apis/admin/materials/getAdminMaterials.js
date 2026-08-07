const pool = require("../../../db/dbConnect");
const { generateSignedUrl } = require("../../../utils/generateSignedUrl");

async function getAdminMaterials(req, res) {
  const cf = process.env.AWS_CLOUDFRONT_DOMAIN;
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const sign = (p) => (p ? generateSignedUrl(`${cf}/${p}`, expiry) : null);

  try {
    const [materials] = await pool.promise().query(
      `SELECT m.id, m.title, m.description, m.file_url, m.solution_url,
         m.solution_visible, m.subject_id, m.material_type,
         m.added_by, m.added_on, m.status, s.Sub_Name
       FROM tbl_materials m
       LEFT JOIN tbl_subject s ON s.id = m.subject_id
       WHERE m.status = 1
       ORDER BY m.added_on DESC`,
    );

    for (const m of materials) {
      m.file_url = sign(m.file_url);
      m.solution_url = sign(m.solution_url);

      const [assignments] = await pool.promise().query(
        `SELECT ma.id AS assignment_id, ma.tbl_batch, ma.tbl_phase,
           ma.is_visible, ma.solution_visible, ma.assigned_on,
           b.batch_title, p.title AS phase_title
         FROM tbl_material_assigned ma
         LEFT JOIN tbl_batch b ON b.id  = ma.tbl_batch
         LEFT JOIN tbl_phase p ON p.Id  = ma.tbl_phase
         WHERE ma.material_id = ?
         ORDER BY ma.assigned_on DESC`,
        [m.id],
      );
      m.assignments = assignments;
    }

    return res.status(200).json({ success: true, data: materials });
  } catch (err) {
    console.error("Error getAdminMaterials:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { getAdminMaterials };
