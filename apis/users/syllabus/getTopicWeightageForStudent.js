const pool = require("../../../db/dbConnect");

async function getTopicWeightageForStudent(req, res) {
  const { topic_id, range } = req.query;
  if (!topic_id)
    return res
      .status(400)
      .json({ success: false, message: "topic_id required" });

  try {
    const currentYear = new Date().getFullYear();
    let yearCondition = "";
    let params = [topic_id];

    if (range && range !== "all") {
      const fromYear = currentYear - parseInt(range) + 1;
      yearCondition = "AND year >= ?";
      params.push(fromYear);
    }

    const [rows] = await pool.promise().query(
      `SELECT year, weightage FROM tbl_topic_weightage
       WHERE topic_id = ? ${yearCondition} ORDER BY year ASC`,
      params,
    );

    const total = rows.reduce(
      (sum, r) => sum + (parseFloat(r.weightage) || 0),
      0,
    );
    return res
      .status(200)
      .json({ success: true, data: rows, total: parseFloat(total.toFixed(2)) });
  } catch (err) {
    console.error("Error getTopicWeightageForStudent:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { getTopicWeightageForStudent };
