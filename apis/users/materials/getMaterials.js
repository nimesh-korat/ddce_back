const pool = require("../../../db/dbConnect");
const { generateSignedUrl } = require("../../../utils/generateSignedUrl");

async function getUserMaterials(req, res) {
  const cf       = process.env.AWS_CLOUDFRONT_DOMAIN;
  const batch_id = req?.user?.Batch;
  const phase_id = req?.user?.Phase;

  try {
    const [results] = await pool.promise().query(
      `SELECT DISTINCT
         m.id, m.title, m.description, m.file_url, m.solution_url,
         m.material_type, m.added_on, s.Sub_Name,
         ma.is_visible,
         ma.solution_visible AS solution_visible
       FROM tbl_materials m
       JOIN tbl_material_assigned ma ON ma.material_id = m.id
         AND ma.is_visible = 1
         AND (ma.tbl_batch = ? OR ma.tbl_batch IS NULL)
         AND (ma.tbl_phase = ? OR ma.tbl_phase IS NULL)
       LEFT JOIN tbl_subject s ON s.id = m.subject_id
       WHERE m.status = 1 AND m.file_url IS NOT NULL
       ORDER BY ma.assigned_on DESC`,
      [batch_id, phase_id]
    );

    const expiry = new Date(Date.now() + 4 * 60 * 60 * 1000);
    const sign   = (p) => p ? generateSignedUrl(`${cf}/${p}`, expiry) : null;

    const data = results.map(m => ({
      id:            m.id,
      title:         m.title,
      description:   m.description,
      material_type: m.material_type,
      subject_name:  m.Sub_Name,
      added_on:      m.added_on,
      material_url:  sign(m.file_url),
      // solution_available: solution exists AND this batch/phase has solution_visible=1
      solution_available: m.solution_visible === 1 && !!m.solution_url
        ? sign(m.solution_url)
        : null,
      // No lock icon — if solution not available just hide the button completely
    }));

    return res.status(200).json({ success: true, message: "Materials fetched successfully", data });
  } catch (err) {
    console.error("Error fetching user materials:", err.message);
    return res.status(500).json({ success: false, message: "Database error", details: err.message });
  }
}
module.exports = { getUserMaterials };