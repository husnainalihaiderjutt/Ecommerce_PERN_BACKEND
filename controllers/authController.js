import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import database from "../database/db.js";
import bcrypt, { hash } from "bcrypt"
import { sendToken } from "../utils/jwtToken.js";
import { generateResetPasswordToken } from "../utils/generateResetPasswordToken.js";
import { generateEmailTemplate } from "../utils/generateForgetPasswordEmailTemplate.js";
import { sendEmail } from "../utils/sendEmail.js";


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
    if(password.length < 8)
    {
        return next(new ErrorHandler("Password must have at least 8 character",400))
    }
    const hashPassword = await bcrypt.hash(password,10);
    const normalizedEmail = email.toLowerCase().trim();
    const user = await database.query(
        "INSERT INTO users (name, email, password) VALUES ($1,$2,$3) RETURNING *",
        [name,normalizedEmail,hashPassword]
    );
    sendToken(user.rows[0],201,"User Registered Successfully",res);
});

export const login = catchAsyncErrors(async(req,res,next)=>{
    const {email,password} = req.body;
    if(!email || !password){
        return next(new ErrorHandler("Please provide email and password",400));
    }
    const normalizedEmail = email.toLowerCase().trim();
    const user = await database.query(`SELECT * FROM users where email = $1`,
        [normalizedEmail]
    );
    if(user.rows.length === 0){
        return next(new ErrorHandler("Invalid email or password",401));
    }
    const isPasswordMatch = await bcrypt.compare(password,user.rows[0].password);
    if(!isPasswordMatch){
        return next(new ErrorHandler("Invalid email or password",401));
    } 
    sendToken(user.rows[0],201,"Login Successfully",res)
});

export const getUser = catchAsyncErrors(async(req,res,next)=>{
    const {user} = req;
    res.status(200).json({
        success:true,
        user
    });
});

export const logout = catchAsyncErrors(async(req,res,next)=>{
    res.status(200).cookie("token","",{
        expires: new Date(Date.now()),
        httpOnly:true
    }).json({
        success:true,
        message:"Logged out Successfully"
    });
});

export const forgotPassword = catchAsyncErrors(async(req,res,next)=>{
   const {email} = req.body;
   const {frontendUrl} = req.query;
   const normalizedEmail = email.toLowerCase().trim();
   let userResult = await database.query(`
      SELECT * FROM users WHERE email = $1`,
      [normalizedEmail]
    );
   if(userResult.rows.length===0){
    return next(new ErrorHandler("User not found with this email",404));
   }
   const user = userResult.rows[0];
   const {hashedToken , resetToken , ResetPasswordExpireTime} = generateResetPasswordToken();

   await database.query(`
          UPDATE users SET reset_password_token = $1 , reset_password_expire = to_timestamp($2) WHERE email = $3`,
          [hashedToken,ResetPasswordExpireTime/1000,normalizedEmail]
    );
    const resetPasswordUrl = `${frontendUrl}/password/reset/${resetToken}`;
    const message = generateEmailTemplate(resetPasswordUrl);
    try {
        await sendEmail({
            email:user.email,
            subject: "Ecommerce Password Recovery",
            message,
        });
        res.status(200).json({
            success:true,
            message: `Email sent to ${user.email} successfully`,
        });
    } 
    catch (error) {
        await database.query(`
            UPDATE users SET reset_password_token = NULL , reset_password_expire = NULL WHERE email = $1`,
            [email]
        );
        return next(new ErrorHandler("Email could not be sent",500));
    };
});