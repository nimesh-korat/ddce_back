const express = require("express");
const cors = require("cors");
const { SignupUser_s1 } = require("./apis/users/authentication/signup/signup_s1");
const { SignupUser_s2 } = require("./apis/users/authentication/signup/signup_s2");
const { LoginUser } = require("./apis/users/authentication/login");
const { verifyEmail } = require("./apis/users/authentication/signup/verify_email");
const { verifyPhone } = require("./apis/users/authentication/signup/verify_phone");
const { resendEmailOTP } = require("./apis/users/authentication/resend_otps/resend_email_otp");
const { resendMobileOTP } = require("./apis/users/authentication/resend_otps/resend_mobile_otp");
const checkAuth = require("./middleware/auth");
const { LogoutUser } = require("./apis/users/authentication/logout");
const cookieParser = require("cookie-parser");
const { send_reset_pass_otp } = require("./apis/users/authentication/reset_password/send_reset_pass_otp");
const { verifyResetPassOtp } = require("./apis/users/authentication/reset_password/verify_reset_pass_otp");
const { resetPassword } = require("./apis/users/authentication/reset_password/reset_password");
const Session = require("./apis/session");
const { registrationNotification } = require("./apis/users/notifications/registration_notification");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

//?Middlewares
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({
    origin: ["http://localhost:3000", "http://192.168.0.15:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"]
}));


app.post("/signup_s1", SignupUser_s1);
app.post("/signup_s2", SignupUser_s2);
app.post("/login", LoginUser);
app.post("/verify_phone", verifyPhone);
app.post("/verify_email", verifyEmail);
app.post("/resend_email_otp", resendEmailOTP);
app.post("/resend_mobile_otp", resendMobileOTP);
app.post("/send_reset_pass_otp", send_reset_pass_otp);
app.post("/verify_reset_pass_otp", verifyResetPassOtp);
app.post("/reset_password", resetPassword);
app.post("/logout", checkAuth, LogoutUser);
app.post("/session", checkAuth, Session);

app.get("/getRecentRegNotifications", registrationNotification)


//?activate server
app.listen(PORT,'0.0.0.0', () => {
    console.log("Server Started on port: ", PORT);
});