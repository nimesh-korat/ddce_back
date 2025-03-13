const pool = require("../../../db/dbConnect");
const { format, parseISO } = require("date-fns");

async function assignBatchToSession(req, res) {
  const {
    tbl_batch,
    tbl_phase,
    tbl_session,
    start_date,
    end_date,
    is_featured,
  } = req.body;

  // Validate input fields
  if (
    !tbl_batch ||
    !tbl_phase ||
    !tbl_session ||
    !start_date ||
    !end_date ||
    is_featured === undefined
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    // Step 1: Check if the test is already assigned to the batch
    const checkSql = `
            SELECT * FROM tbl_session_assigned 
            WHERE tbl_batch = ? AND tbl_session = ?
        `;

    const [existingRecords] = await pool
      .promise()
      .query(checkSql, [tbl_batch, tbl_session]);

    if (existingRecords.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This session is already assigned to the batch.",
      });
    }

    // Convert date strings to ISO format
    const isoStartDate = new Date(start_date).toISOString();
    const isoEndDate = new Date(end_date).toISOString();

    // Format dates using date-fns
    const formattedStartDate = format(
      parseISO(isoStartDate),
      "yyyy-MM-dd HH:mm:ss"
    );
    const formattedEndDate = format(
      parseISO(isoEndDate),
      "yyyy-MM-dd HH:mm:ss"
    );

    // Step 2: Insert the new record if no existing assignment is found
    const insertSql = `
            INSERT INTO tbl_session_assigned (tbl_phase, tbl_batch, tbl_session, start_date, end_date, is_featured)
            VALUES (?,?, ?, ?, ?, ?)
        `;

    const values = [
      tbl_phase,
      tbl_batch,
      tbl_session,
      formattedStartDate,
      formattedEndDate,
      is_featured,
    ];

    const [result] = await pool.promise().query(insertSql, values);

    return res
      .status(201)
      .json({ success: true, message: "Session assigned successfully" });
  } catch (err) {
    console.error("Error processing assignBatchToSession:", err.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      details: err.message,
    });
  }
}

module.exports = { assignBatchToSession };
