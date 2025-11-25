const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/user.repository.js');
const { RESPONSE_MESSAGES, API_STATUS_CODES } = require('../../constants/apiStatus.js');
const JWTUtils = require('../../utils/jwt.util.js');
const OTPUtils = require('../../utils/otp.util.js');
const AppError = require('../../utils/AppError.util.js');

class UserService {
    async registerUser(userData) {

        // Check if user already exists
        const existingUser = await userRepository.findUserByEmail(userData.email);
        if (existingUser) {
            throw new AppError(RESPONSE_MESSAGES.USER_ALREADY_EXISTS, API_STATUS_CODES.CONFLICT);
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

        // Create user object with hashed password
        const userToCreate = {
            ...userData,
            password: hashedPassword,
        };

        // Create user in repository
        const newUser = await userRepository.createUser(userToCreate);

        // Return user without password
        const { password, ...userWithoutPassword } = newUser.toObject();
        return userWithoutPassword;

    }


    
    async loginUser(email, password) {
        // Find user by email
        const user = await userRepository.findUserByEmail(email);
        if (!user) {
            throw new AppError(RESPONSE_MESSAGES.USER_NOT_FOUND, API_STATUS_CODES.UNAUTHORIZED);
        }

        // Check if user has a password (social login users might not have one)
        if (!user.password) {
            throw new AppError(
                "This account was created using Google/Facebook. Please login with Google/Facebook.",
                API_STATUS_CODES.BAD_REQUEST
            );
        }

        // Validate password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log("Password valid:", isPasswordValid); // Debugging line to check password validity   
        if (!isPasswordValid) {
            throw new AppError(RESPONSE_MESSAGES.INVALID_EMAIL_OR_PASSWORD, API_STATUS_CODES.UNAUTHORIZED);
        }

        // If user is not verified → generate OTP & send it
        if (!user.isVerified) {
            const otp = OTPUtils.generateOTP();
            const expiryTime = OTPUtils.setOTPExpiry();
            OTPUtils.storeOTP(email, otp, expiryTime);

            await OTPUtils.sendOtpEmail(email, otp);

            throw new AppError(
                RESPONSE_MESSAGES.USER_NOT_VERIFIED,
                API_STATUS_CODES.USER_NOT_VERIFIED
            );
            
        }

        // If verified → proceed to generate tokens
        const accessToken = JWTUtils.generateAccessToken(user._id);
        const refreshToken = JWTUtils.generateRefreshToken(user._id);

        const { password: userPassword, ...userWithoutPassword } = user.toObject();
        return {
            user: userWithoutPassword,
            accessToken,
            refreshToken
        };
    }


    async refreshAccessToken(refreshToken) {

        // Verify refresh token
        const decoded = JWTUtils.verifyRefreshToken(refreshToken);

        // Find user by ID
        const user = await userRepository.findUserById(decoded.userId);
        if (!user) {
            throw new AppError(RESPONSE_MESSAGES.USER_NOT_FOUND, API_STATUS_CODES.NOT_FOUND);
        }

        // Generate new access token
        const newAccessToken = JWTUtils.generateAccessToken(user._id);

        return {
            accessToken: newAccessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                onboarding: user.onboarding,
                favourites: user.favourites
            }
        };

    }

    async getUserById(id) {

        const user = await userRepository.findUserById(id);
        if (!user) {
            throw new AppError(RESPONSE_MESSAGES.USER_NOT_FOUND, API_STATUS_CODES.NOT_FOUND);
        }

        // Return user without password
        const { password, ...userWithoutPassword } = user.toObject();
        return userWithoutPassword;

    }


    async generateTokens(user) {
        const accessToken = JWTUtils.generateAccessToken(user._id);
        const refreshToken = JWTUtils.generateRefreshToken(user._id);
        return { accessToken, refreshToken };
    }
    
    async updateUser(id, updateData) {

        // If password is being updated, hash it
        if (updateData.password) {
            const saltRounds = 10;
            updateData.password = await bcrypt.hash(updateData.password, saltRounds);
        }

        const user = await userRepository.findUserById(id);
        if (!user) {
            throw new AppError(RESPONSE_MESSAGES.USER_NOT_FOUND, API_STATUS_CODES.NOT_FOUND);
        }

        // Use the new updateUserImages method for better Cloudinary handling
        if (updateData.userPicture) {
            return await this.updateUserImages(id, updateData);
        }

        const updatedUser = await userRepository.updateUser(id, updateData);

        // Return user without password
        const { password, ...userWithoutPassword } = updatedUser.toObject();
        return userWithoutPassword;

    }


    async getAllUsers() {

        return await userRepository.getAllUsers();

    }

    async getUserByEmail(email) {

        return await userRepository.findUserByEmail(email);

    }

    // Password reset functionality
    async sendPasswordResetOTP(email) {
        // Check if user exists
        const user = await userRepository.findUserByEmail(email);
        if (!user) {
            throw new AppError(RESPONSE_MESSAGES.USER_NOT_FOUND, API_STATUS_CODES.NOT_FOUND);
        }

        // Generate OTP
        const otp = OTPUtils.generateOTP();
        const expiryTime = OTPUtils.setOTPExpiry();

        // Store OTP in memory
        OTPUtils.storeOTP(email, otp, expiryTime);

        // Send OTP via email
        const emailSent = await OTPUtils.sendOtpEmail(email, otp);
        if (!emailSent) {
            throw new AppError('Failed to send OTP email', API_STATUS_CODES.INTERNAL_SERVER_ERROR);
        }

        return { message: RESPONSE_MESSAGES.OTP_SENT_SUCCESS };
    }

    async verifyPasswordResetOTP(email, otp) {
        // Validate OTP format
        if (!OTPUtils.validateOTPFormat(otp)) {
            throw new AppError(RESPONSE_MESSAGES.INVALID_OTP, API_STATUS_CODES.ERROR_CODE);
        }

        // Check if user exists
        const user = await userRepository.findUserByEmail(email);
        if (!user) {
            throw new AppError(RESPONSE_MESSAGES.USER_NOT_FOUND, API_STATUS_CODES.NOT_FOUND);
        }

        // Verify OTP from memory
        const isValidOTP = OTPUtils.verifyOTP(email, otp);
        if (!isValidOTP) {
            throw new AppError(RESPONSE_MESSAGES.INVALID_OTP, API_STATUS_CODES.ERROR_CODE);
        }

        // Mark OTP as verified
        OTPUtils.markOTPVerified(email);

        return { message: RESPONSE_MESSAGES.OTP_VERIFIED_SUCCESS };
    }

    async resetPassword(email, newPassword, confirmPassword) {
        // Validate passwords
        if (!newPassword) {
            throw new AppError(RESPONSE_MESSAGES.NEW_PASSWORD_REQUIRED, API_STATUS_CODES.ERROR_CODE);
        }

        if (!confirmPassword) {
            throw new AppError(RESPONSE_MESSAGES.CONFIRM_PASSWORD_REQUIRED, API_STATUS_CODES.ERROR_CODE);
        }

        if (newPassword !== confirmPassword) {
            throw new AppError(RESPONSE_MESSAGES.PASSWORDS_DO_NOT_MATCH, API_STATUS_CODES.ERROR_CODE);
        }

        if (newPassword.length < 6) {
            throw new AppError(RESPONSE_MESSAGES.INVALID_PASSWORD, API_STATUS_CODES.ERROR_CODE);
        }

        // Check if user exists and OTP is verified
        const user = await userRepository.findUserByEmail(email);
        if (!user) {
            throw new AppError(RESPONSE_MESSAGES.USER_NOT_FOUND, API_STATUS_CODES.NOT_FOUND);
        }

        if (!OTPUtils.isOTPVerified(email)) {
            throw new AppError(RESPONSE_MESSAGES.INVALID_OTP, API_STATUS_CODES.ERROR_CODE);
        }

        // Hash new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password in database
        await userRepository.updatePassword(email, hashedPassword);

        // Remove OTP from memory
        OTPUtils.removeOTP(email);

        return { message: RESPONSE_MESSAGES.PASSWORD_RESET_SUCCESS };
    }


    async updateUserStatus(userId, status) {
        return await userRepository.updateStatus(userId, status);
    }

}

module.exports = new UserService();