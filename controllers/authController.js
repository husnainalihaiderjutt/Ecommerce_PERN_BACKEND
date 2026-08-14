import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import database from "../database/db.js";
import bcrypt, { hash } from "bcrypt"
import { sendToken } from "../utils/jwtToken.js";
import { generateResetPasswordToken } from "../utils/generateResetPasswordToken.js";
import { generateEmailTemplate } from "../utils/generateForgetPasswordEmailTemplate.js";
import { sendEmail } from "../utils/sendEmail.js";
import crypto from "crypto";
import {v2 as cloudinary} from "cloudinary";
 
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

export const resetPassword = catchAsyncErrors(async(req,res,next)=>{
    const {token} = req.params;
    const {password,confirmPassword} = req.body;
    if(!password || !confirmPassword){
       return next(new ErrorHandler("Please fill all the required fields",400))
    }
    const resetPasswordToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await database.query(`
        SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expire > NOW()`,
        [resetPasswordToken]);
    if(user.rows.length === 0){
        return next(new ErrorHandler("Invalid or expired reset Token",400));
    }
    if(req.body.password !== req.body.confirmPassword){
        return next(new ErrorHandler("Password do not match",400));
    }
    if(req.body.password.length < 8 || req.body.password.length > 16 || req.body.confirmPassword.length < 8 || req.body.confirmPassword.length > 16){
        return next(new ErrorHandler("Password length must be between 8 and 16 character",400));
    }
    const hashPassword = await bcrypt.hash(req.body.password,10);

    const updatedUser = await database.query(`
            UPDATE users SET password = $1 , reset_password_token = NULL, reset_password_expire = NULL
            WHERE id = $2 RETURNING *`,
            [hashPassword,user.rows[0].id]
        );
    sendToken(updatedUser.rows[0],200,"Password reset successfully",res);
});

export const updatePassword = catchAsyncErrors(async(req,res,next)=>{
    const {currentPassword , newPassword , confirmNewPassword} = req.body;
    if(!currentPassword || !newPassword || !confirmNewPassword){
        return next(new ErrorHandler("Please fill all the fields",400));
    }
    const isPasswordMatch = await bcrypt.compare(currentPassword , req.user.password);
    if(!isPasswordMatch){
        return next(new ErrorHandler("Current password is incorrect",400));
    }
    if(newPassword !== confirmNewPassword){
        return next(new ErrorHandler("New password and Confirm password doesn't match",400));
    }
    if( newPassword.length < 8 || 
          newPassword.length > 16 || 
          confirmNewPassword.length < 8 || 
          confirmNewPassword.length > 16){
        return next(new ErrorHandler("Password length must be between 8 and 16 character",400));
    }
    const hashedPassword = await bcrypt.hash(newPassword,10);
    await database.query(`
           UPDATE users SET password = $1 WHERE id = $2 `,
           [hashedPassword,req.user.id] 
        );
    res.status(200).json({
        success: true,
        message: "Password updated successfully",
    });
});

export const updateProfile = catchAsyncErrors(async(req,res,next)=>{
    const {name , email } = req.body;
    
    if (!name?.trim() || !email?.trim()) {
    return next(new ErrorHandler("Name and email are required", 400));
    }
    let avatarData = {};
    if(req.files && req.files.avatar){
       const {avatar} = req.files;
       if(req.user?.avatar?.public_id){
          await cloudinary.uploader.destroy(req.user.avatar.public_id);
       }

       const newProfileImage = await cloudinary.uploader.upload(avatar.tempFilePath,{
            folder: "Ecommerce_Avatar",
            width: 150,
            crop:"scale",
       });
       avatarData = {
        public_id: newProfileImage.public_id,
        url: newProfileImage.secure_url,
       };
    }

    let user;
    if(Object.keys(avatarData).length === 0){
        user = await database.query(`
               UPDATE users SET name = $1 , email = $2 WHERE id = $3 RETURNING * `,
               [name,email,req.user.id]
            );
    }
    else{
        user = await database.query(`
               UPDATE users SET name = $1 , email = $2 , avatar = $3  WHERE id = $4 RETURNING *`,
               [name,email,JSON.stringify(avatarData),req.user.id]
        );
    }
    res.status(200).json(
        { succes: true,
          message:"Profile updated Successfully",
          user : user.rows[0],
        }); 

});