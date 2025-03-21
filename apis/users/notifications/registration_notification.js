const pool = require("../../../db/dbConnect");
const { generateSignedUrl } = require("../../../utils/generateSignedUrl");

async function registrationNotification(req, res) {
  try {
    const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;

    // SQL query to fetch users ordered by registration_time
    const sql = `
      SELECT  
        Name,  
        College_Name,
        Gender,
        User_DP,
        DATE_FORMAT(registration_time, '%Y-%m-%d %H:%i:%s') AS registration_time 
      FROM users  
      WHERE College_Name IS NOT NULL
      ORDER BY registration_time DESC
    `;

    // Execute the query
    const [results] = await pool.promise().query(sql);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No recent user registrations found.",
      });
    }

    // Map results and generate signed URL for user_dp
    const formattedResults = await Promise.all(
      results.map(async (user) => {
        const userDpPath = user.User_DP;
        const signedUserDpUrl = userDpPath
          ? generateSignedUrl(
              `${cloudfrontDomain}/${userDpPath}`,
              new Date(Date.now() + 1000 * 60 * 60 * 24) // 1-day expiry
            )
          : null;

        return {
          name: user.Name,
          gender: user.Gender,
          collegeName: user.College_Name,
          timeAgo: user.registration_time,
          userDp: signedUserDpUrl,
        };
      })
    );

    // Get total users count
    const [usersResult] = await pool
      .promise()
      .query(
        "SELECT COUNT(*) AS total_users FROM users WHERE College_Name IS NOT NULL"
      );

    // Send response
    return res.status(200).json({
      success: true,
      data: formattedResults,
      totalUsers: usersResult[0].total_users + 1111,
    });
  } catch (err) {
    console.error("Error fetching recent users:", err.message);
    return res.status(500).json({
      success: false,
      message: "Error processing request",
      details: err.message,
    });
  }
}

module.exports = { registrationNotification };
