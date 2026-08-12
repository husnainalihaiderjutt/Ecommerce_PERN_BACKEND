import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import database from "../database/db.js";
import bcrypt, { hash } from "bcrypt"
import { sendToken } from "../utils/jwtToken.js";


export const register = catchAsyncErrors(async(req,res,next)=>{
    const {name,email,password} = req.body;
    if(!name || !email ||!password){
        return next(new ErrorHandler("Please provide all required fields",400));
    }
    if (!email.includes("@")) {
    return next(new ErrorHandler("Please provide a valid email", 400));
    }
    const isAlreadyRegistered = await database.query(
        `SELECT * FROM users WHERE email = $1`,
        [email]
    );

    if(isAlreadyRegistered.rows.length > 0){
        return next(new ErrorHandler("User Already registered with this email",400));
    }

    const hashPassword = await bcrypt.hash(password,10);
    const normalizedEmail = email.toLowerCase().trim();
    const user = await database.query(
        "INSERT INTO users (name, email, password) VALUES ($1,$2,$3) RETURNING *",
        [name,normalizedEmail,hashPassword]
    );
    sendToken(user.rows[0],201,"User Registered Successfully",res);
});


export const login = catchAsyncErrors(async(req,res,next)=>{});
export const getUser = catchAsyncErrors(async(req,res,next)=>{});
export const logout = catchAsyncErrors(async(req,res,next)=>{});