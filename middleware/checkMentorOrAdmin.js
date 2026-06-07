// Middleware: allows admin (Role=1) OR mentor (Role=2)
const checkMentorOrAdmin = (req, res, next) => {
  const role = req?.user?.role;
  if (role !== 1 && role !== 2) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin or Mentor only.",
    });
  }
  next();
};

module.exports = checkMentorOrAdmin;
