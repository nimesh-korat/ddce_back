const pool = require("../../../db/dbConnect");
const { generateSignedUrl } = require("../../../utils/generateSignedUrl");

async function getMaterials(req, res) {
  const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;

  try {
    const sql = `
      SELECT 
        m.id,
        m.title,
        m.description,
        m.file_url,
        m.solution_url,
        m.solution_visible,
        m.subject_id,
        m.material_type,
        m.added_by,
        m.added_on,
        m.status,
        s.Sub_Name
      FROM tbl_materials m
      LEFT JOIN tbl_subject s ON s.id = m.subject_id
      WHERE m.status = 1
      ORDER BY m.added_on DESC
    `;

    const [results] = await pool.promise().query(sql);

    const expiry = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    const materialsWithUrls = results.map((m) => ({
      ...m,
      // Material PDF signed URL (admin always sees it)
      file_url: m.file_url
        ? generateSignedUrl(`${cloudfrontDomain}/${m.file_url}`, expiry)
        : null,
      // Solution PDF signed URL (admin always sees it)
      solution_url: m.solution_url
        ? generateSignedUrl(`${cloudfrontDomain}/${m.solution_url}`, expiry)
        : null,
    }));

    return res.status(200).json({
      success: true,
      message: "Materials fetched successfully",
      data: materialsWithUrls,
    });
  } catch (err) {
    console.error("Error fetching materials:", err.message);
    return res.status(500).json({
      success: false,
      message: "Database error",
      details: err.message,
    });
  }
}

module.exports = { getMaterials };
