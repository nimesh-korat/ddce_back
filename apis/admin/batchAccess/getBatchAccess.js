const pool = require("../../../db/dbConnect");

const ALL_FEATURES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "syllabus", label: "Syllabus" },
  { key: "weightage", label: "Topic & Weightage" },
  { key: "schedule", label: "Schedule" },
  { key: "exams", label: "Exam / Quiz" },
  { key: "accuracy_matrix", label: "Accuracy Matrix" },
  { key: "analytics", label: "Analytics" },
  { key: "training", label: "Training" },
  { key: "solutions", label: "Materials & Solutions" },
  { key: "practice", label: "Practice" },
  { key: "doubts", label: "Doubts" },
];

async function getBatchAccess(req, res) {
  const { batch_id } = req.params;
  const phase_id = req.query.phase_id || 1; // default phase 1

  if (!batch_id)
    return res
      .status(400)
      .json({ success: false, message: "batch_id is required" });

  try {
    const [rows] = await pool
      .promise()
      .query(
        "SELECT feature_key, visibility FROM tbl_batch_access WHERE tbl_batch = ? AND tbl_phase = ?",
        [batch_id, phase_id],
      );

    const savedMap = {};
    rows.forEach((r) => {
      savedMap[r.feature_key] = r.visibility;
    });

    const features = ALL_FEATURES.map((f) => ({
      key: f.key,
      label: f.label,
      visibility: savedMap[f.key] !== undefined ? savedMap[f.key] : 0,
    }));

    return res.status(200).json({ success: true, data: features });
  } catch (err) {
    console.error("Error getBatchAccess:", err.message);
    return res
      .status(500)
      .json({
        success: false,
        message: "Something went wrong",
        details: err.message,
      });
  }
}

module.exports = { getBatchAccess, ALL_FEATURES };
