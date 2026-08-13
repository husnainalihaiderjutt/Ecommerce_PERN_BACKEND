import crypto, { hash } from "crypto";

export const generateResetPasswordToken = ()=>{
    const resetToken = crypto.randomBytes(20).toString("hex");

    const hashedToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

    const ResetPasswordExpireTime = Date.now() + 15 * 60 * 1000;
    return {resetToken , hashedToken , ResetPasswordExpireTime};
}