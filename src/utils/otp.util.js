const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { RESPONSE_MESSAGES, API_STATUS_CODES } = require('../constants/apiStatus');
const AppError = require('./AppError.util');

// In-memory storage for OTPs
const otpStorage = new Map();

class OTPUtils {

    

    static generateOTP() {
        return crypto.randomInt(1000, 9999).toString();
    }


    static isOTPExpired(expiryTime) {
        return new Date() > new Date(expiryTime);
    }


    static setOTPExpiry() {
        return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    }


    static storeOTP(email, otp, expiryTime) {
        otpStorage.set(email, {
            otp,
            expiryTime,
            isVerified: false
        });

        // Clean up expired OTPs
        this.cleanupExpiredOTPs();
    }


    static getOTP(email) {
        const otpData = otpStorage.get(email);
        if (!otpData) return null;

        // Check if OTP is expired
        if (this.isOTPExpired(otpData.expiryTime)) {
            otpStorage.delete(email);
            return null;
        }

        return otpData;
    }


    static verifyOTP(email, otp) {
        const otpData = this.getOTP(email);
        if (!otpData) return false;

        return otpData.otp === otp;
    }


    static markOTPVerified(email) {
        const otpData = otpStorage.get(email);
        if (otpData) {
            otpData.isVerified = true;
            otpStorage.set(email, otpData);
        }
    }


    static isOTPVerified(email) {
        const otpData = this.getOTP(email);
        return otpData ? otpData.isVerified : false;
    }


    static removeOTP(email) {
        otpStorage.delete(email);
    }


    static cleanupExpiredOTPs() {
        const now = new Date();
        for (const [email, otpData] of otpStorage.entries()) {
            if (this.isOTPExpired(otpData.expiryTime)) {
                otpStorage.delete(email);
            }
        }
    }



    static sendOtpEmail = async (email, otp) => {

        try {
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.EMAIL_USER, // Email address from environment variables
                    pass: process.env.EMAIL_PASS, // Email password from environment variables
                },
            });
            console.log('process.env.EMAIL_USER:', process.env.EMAIL_USER , 'process.env.EMAIL_PASS:', process.env.EMAIL_PASS);
            console.log('Nodemailer transporter created');
            console.warn("Sending OTP to:", email);

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: "Password Reset OTP",
                text: `Your OTP for password reset is: ${otp}`,
            };

            await transporter.sendMail(mailOptions);
            return RESPONSE_MESSAGES.EMAIL_SEND_SUCCESS;
        }
        catch (error) {
            console.error('Error sending OTP email:', error);
            throw new AppError(RESPONSE_MESSAGES.EMAIL_SEND_FAILED, API_STATUS_CODES.ERROR_CODE);
        }
    };


    static validateOTPFormat(otp) {
        return /^\d{4}$/.test(otp);
    }
}

// Clean up expired OTPs every 5 minutes
setInterval(() => {
    OTPUtils.cleanupExpiredOTPs();
}, 5 * 60 * 1000);

module.exports = OTPUtils;
