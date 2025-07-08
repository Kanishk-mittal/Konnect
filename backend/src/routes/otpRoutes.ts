import { Router } from "express";
import { sendOTPEmail } from "../controller/api_controller/otpController";

const otpRoutes = Router(); 

otpRoutes.post("/",sendOTPEmail)

export default otpRoutes;