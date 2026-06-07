const pool = require("../../db/dbConnect");

async function getMentorsList(req, res) {
  try {
    const [results] = await pool.promise().query(
      "SELECT Id, Name, Email FROM admin WHERE Role = 2 ORDER BY Name ASC"
    );
    return res.status(200).json({ success: true, data: results });
  } catch (err) {
    console.error("Error getMentorsList:", err.message);
    return res.status(500).json({ success: false, message: "Something went wrong", details: err.message });
  }
}

module.exports = { getMentorsList };
