const userService = require("../app/services/user.service.js");
const { RESPONSE_MESSAGES, API_STATUS_CODES } = require("../constants/apiStatus.js");
const AppError = require("../utils/AppError.util.js");
const { setRefreshTokenCookie, clearRefreshTokenCookie } = require("../utils/cookie.util.js");
const OTPUtils = require("../utils/otp.util.js");

class UserController {



    async registerUser(req, res, next) {
        try {
            let { name, email, password } = req.body;

            if (!name || !email || !password) {
                throw new AppError(RESPONSE_MESSAGES.FIELD_REQUIRED, API_STATUS_CODES.ERROR_CODE);
            }

            // ✅ Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new AppError(RESPONSE_MESSAGES.INVALID_EMAIL, API_STATUS_CODES.ERROR_CODE);
            }

            // ✅ Validate password strength
            if (password.length < 6) {
                throw new AppError(RESPONSE_MESSAGES.INVALID_PASSWORD, API_STATUS_CODES.ERROR_CODE);
            }

           
            // ✅ Check if user already exists
            const existingUser = await userService.getUserByEmail(email);
            if (existingUser) {
                throw new AppError(RESPONSE_MESSAGES.USER_ALREADY_EXISTS, API_STATUS_CODES.CONFLICT);
            }

            // ✅ Prepare user data (set isVerified: false)
            const userData = {
                name,
                email,
                password,
                isVerified: false,
            };

            // ✅ Register user in the DB
            const newUser = await userService.registerUser(userData);

            // ✅ Generate OTP & expiry
            const otp = OTPUtils.generateOTP();
            const expiry = OTPUtils.setOTPExpiry();
            OTPUtils.storeOTP(email, otp, expiry);

            // ✅ Send OTP via email
            await OTPUtils.sendOtpEmail(email, otp);

            console.log(`OTP for ${email}: ${otp}`); // For testing purposes only


            // ✅ Respond to client (without revealing OTP in production)
            res.status(API_STATUS_CODES.CREATED).json({
                success: true,
                message: "User registered successfully. Please verify the OTP sent to your email.",
                // otp, // ⚠️ Only for development — REMOVE in production
            });

        } catch (error) {
            next(error);
        }
    }


    async loginUser(req, res, next) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                throw new AppError(RESPONSE_MESSAGES.EMAIL_AND_PASSWORD_REQUIRED, API_STATUS_CODES.ERROR_CODE);
            }




            const result = await userService.loginUser(email, password);
        

            // res.cookies('authToken', result.accessToken);
            // res.cookies('refreshToken', result.refreshToken);

            // respond success
            res.status(API_STATUS_CODES.SUCCESS).json({
                success: true,
                message: RESPONSE_MESSAGES.LOGIN_SUCCESS,
                data: {
                    user: result.user,
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken,
                },
            });
        } catch (error) {
            console.error('Login error:', error);
            next(error);
        }
    }

    async refreshToken(req, res, next) {
        try {
          
          const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
            console.log('Received refresh token:', refreshToken);

            if (!refreshToken) {
                throw new AppError(RESPONSE_MESSAGES.INVALID_REFRESH_TOKEN, API_STATUS_CODES.UNAUTHORIZED);
            }

            const result = await userService.refreshAccessToken(refreshToken);

            res.status(API_STATUS_CODES.SUCCESS).json({
                success: true,
                message: RESPONSE_MESSAGES.TOKEN_REFRESHED_SUCCESS,
                data: {
                    user: result.user,
                    accessToken: result.accessToken
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async logoutUser(req, res, next) {
        try {
            clearRefreshTokenCookie(res);

            res.status(API_STATUS_CODES.SUCCESS).json({
                success: true,
                message: RESPONSE_MESSAGES.LOGOUT_SUCCESS
            });
        } catch (error) {
            next(error);
        }
    }

    async getUserById(req, res, next) {
        try {
            const id = req.user.userId;
            const user = await userService.getUserById(id);

            res.status(API_STATUS_CODES.SUCCESS).json({
                success: true,
                data: user
            });
        } catch (error) {
            next(error);
        }
    }
    async updateUser(req, res, next) {
        upload(req, res, async (err) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message || "File upload error"
                });
            }

            try {
                const { id } = req.params;
                const { name } = req.body;
            

                // Prepare an updateData object with only the fields that are present
                const updateData = {};

                if (name) updateData.name = name;

                // Get the existing user
                const existingUser = await userService.getUserById(id);
                if (!existingUser) {
                    throw new AppError(RESPONSE_MESSAGES.USER_NOT_FOUND, API_STATUS_CODES.NOT_FOUND);
                }

                // If updateData is empty (no fields to update)
                if (Object.keys(updateData).length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: "No valid fields provided for update."
                    });
                }

                // Update user in DB
                const updatedUser = await userService.updateUser(id, updateData);

                res.status(API_STATUS_CODES.SUCCESS).json({
                    success: true,
                    message: RESPONSE_MESSAGES.USER_UPDATED_SUCCESS,
                    data: updatedUser,

                });

            } catch (error) {
                next(error);
            }
        });
    }




    async getAllUsers(req, res, next) {
        try {
            const users = await userService.getAllUsers();

            res.status(API_STATUS_CODES.SUCCESS).json({
                success: true,
                count: users.length,
                data: users
            });
        } catch (error) {
            next(error);
        }
    }

    async resetPassword(req, res, next) {
        try {
            const { email } = req.body;
            console.log("email recieved for forgot password", email);


            if (!email) {
                throw new AppError(RESPONSE_MESSAGES.EMAIL_REQUIRED, API_STATUS_CODES.ERROR_CODE);
            }

            const result = await userService.sendPasswordResetOTP(email);

            res.status(API_STATUS_CODES.SUCCESS).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            next(error);
        }
    }

    async verifySignupOTP(req, res, next) {
        try {
            const { email, otp } = req.body;

            console.log('Verifying OTP for:', email, otp);

            if (!email) throw new AppError(RESPONSE_MESSAGES.EMAIL_REQUIRED, API_STATUS_CODES.ERROR_CODE);
            if (!otp) throw new AppError(RESPONSE_MESSAGES.OTP_REQUIRED, API_STATUS_CODES.ERROR_CODE);
            if (!OTPUtils.validateOTPFormat(otp)) throw new AppError(RESPONSE_MESSAGES.INVALID_OTP, API_STATUS_CODES.BAD_REQUEST);

            const isValid = OTPUtils.verifyOTP(email, otp);
            console.log('OTP valid:', isValid);

            if (!isValid) throw new AppError(RESPONSE_MESSAGES.INVALID_OR_EXPIRED_OTP, API_STATUS_CODES.UNAUTHORIZED);

            OTPUtils.markOTPVerified(email);

            let user = await userService.getUserByEmail(email);
            console.log('User fetched:', user);

            if (!user) throw new AppError(RESPONSE_MESSAGES.USER_NOT_FOUND, API_STATUS_CODES.NOT_FOUND);

            // ✅ Update user status
            user = await userService.updateUserStatus(user._id, true);

            const { accessToken, refreshToken } = await userService.generateTokens(user);

            setRefreshTokenCookie(res, refreshToken);

            res.status(API_STATUS_CODES.SUCCESS).json({
                success: true,
                message: "Signup OTP verified successfully",
                data: { user, accessToken, refreshToken },
            });

        } catch (error) {
            console.error('Error in verifySignupOTP:', error);
            next(error);
        }
    }


    async verifyOTP(req, res, next) {
        try {
            const { email, otp } = req.body;

            if (!email) {
                throw new AppError(RESPONSE_MESSAGES.EMAIL_REQUIRED, API_STATUS_CODES.ERROR_CODE);
            }

            if (!otp) {
                throw new AppError(RESPONSE_MESSAGES.OTP_REQUIRED, API_STATUS_CODES.ERROR_CODE);
            }

            const result = await userService.verifyPasswordResetOTP(email, otp);

            res.status(API_STATUS_CODES.SUCCESS).json({
                success: true,
                message: result.message,
            });
        } catch (error) {
            next(error);
        }
    }

    async setNewPassword(req, res, next) {
        try {
            const { email, newPassword, confirmPassword } = req.body;

            if (!email) {
                throw new AppError(RESPONSE_MESSAGES.EMAIL_REQUIRED, API_STATUS_CODES.ERROR_CODE);
            }

            if (!newPassword) {
                throw new AppError(RESPONSE_MESSAGES.NEW_PASSWORD_REQUIRED, API_STATUS_CODES.ERROR_CODE);
            }

            if (!confirmPassword) {
                throw new AppError(RESPONSE_MESSAGES.CONFIRM_PASSWORD_REQUIRED, API_STATUS_CODES.ERROR_CODE);
            }

            const result = await userService.resetPassword(email, newPassword, confirmPassword);

            res.status(API_STATUS_CODES.SUCCESS).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            next(error);
        }
    }


    async generateOtp(req, res, next) {
        try {
            const userId = req.user.userId;


            const User = await userService.getUserById(userId);

            const email = User.email;

            console.log("------------email------------", email)

            if (!email) {
                throw new AppError('Email is required', API_STATUS_CODES.BAD_REQUEST);
            }

            // Generate and store OTP
            const otp = OTPUtils.generateOTP();
            const expiry = OTPUtils.setOTPExpiry();
            OTPUtils.storeOTP(email, otp, expiry);

            // For demo or test, send OTP via email (or SMS if implemented)
            await OTPUtils.sendOtpEmail(email, otp);

            res.status(API_STATUS_CODES.SUCCESS).json({
                success: true,
                message: 'OTP sent successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    async resendOtp(req, res, next) {
        try {
            const { email } = req.body;

            if (!email) {
                throw new AppError(RESPONSE_MESSAGES.EMAIL_REQUIRED, API_STATUS_CODES.ERROR_CODE);
            }

            const user = await userService.getUserByEmail(email);
            if (!user) {
                throw new AppError(RESPONSE_MESSAGES.USER_NOT_FOUND, API_STATUS_CODES.NOT_FOUND);
            }

            // Generate and store OTP
            const otp = OTPUtils.generateOTP();
            const expiry = OTPUtils.setOTPExpiry();
            OTPUtils.storeOTP(email, otp, expiry);

            // For demo or test, send OTP via email (or SMS if implemented)
            await OTPUtils.sendOtpEmail(email, otp);

            res.status(API_STATUS_CODES.SUCCESS).json({
                success: true,
                message: 'OTP resent successfully',
            });
        } catch (error) {
            next(error);
        }

    }







}

module.exports = new UserController();