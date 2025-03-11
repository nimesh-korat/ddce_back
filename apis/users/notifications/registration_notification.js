const pool = require("../../../db/dbConnect"); // Adjust the path to your dbConnect file

async function registrationNotification(req, res) {
  try {
    // SQL query to fetch users registered in the last 20 minutes, ordered by minutes_ago in ascending order (recent first)
    const sql = `
      SELECT  
        Name,  
        College_Name,  
        DATE_FORMAT(registration_time, '%Y-%m-%d %H:%i:%s') AS registration_time 
      FROM users  
      WHERE College_Name IS NOT NULL
      ORDER BY registration_time DESC
    `;

    // Execute the query using the connection pool
    const [results] = await pool.promise().query(sql);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No users registered in the last 20 minutes.",
      });
    }

    // Process results to format the time (e.g., "12 minutes ago")
    const formattedResults = results.map(user => ({
      name: user.Name,
      collegeName: user.College_Name,
      timeAgo: `${user.registration_time}`,
    }));

    // Send the response with the formatted results
    return res.status(200).json({
      success: true,
      data: formattedResults,
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
