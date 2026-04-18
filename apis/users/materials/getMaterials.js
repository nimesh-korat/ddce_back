const pool = require("../../../db/dbConnect");
const { generateSignedUrl } = require("../../../utils/generateSignedUrl");

async function getUserMaterials(req, res) {
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
        m.added_on,
        s.Sub_Name
      FROM tbl_materials m
      LEFT JOIN tbl_subject s ON s.id = m.subject_id
      WHERE m.status = 1
        AND m.file_url IS NOT NULL
      ORDER BY m.added_on DESC
    `;

    const [results] = await pool.promise().query(sql);

    const expiry = new Date(Date.now() + 1000 * 60 * 60 * 4); // 4h — shorter for security

    const materialsWithUrls = results.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      material_type: m.material_type,
      subject_name: m.Sub_Name,
      added_on: m.added_on,
      // Always return signed material URL (material is always visible)
      material_url: m.file_url
        ? generateSignedUrl(`${cloudfrontDomain}/${m.file_url}`, expiry)
        : null,
      // Only return solution URL if admin has made it visible
      solution_url:
        m.solution_visible === 1 && m.solution_url
          ? generateSignedUrl(`${cloudfrontDomain}/${m.solution_url}`, expiry)
          : null,
      solution_available: m.solution_visible === 1 && !!m.solution_url,
    }));

    return res.status(200).json({
      success: true,
      message: "Materials fetched successfully",
      data: materialsWithUrls,
    });
  } catch (err) {
    console.error("Error fetching user materials:", err.message);
    return res.status(500).json({
      success: false,
      message: "Database error",
      details: err.message,
    });
  }
}

module.exports = { getUserMaterials };
