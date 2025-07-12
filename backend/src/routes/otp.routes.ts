import { Router } from "express";
import { sendOTPEmail } from "../controller/api_controller/otp.controller";

const otpRoutes = Router(); 

otpRoutes.post("/",sendOTPEmail)

export default otpRoutes;