
const { RESPONSE_MESSAGES, API_STATUS_CODES } = require('../constants/apiStatus.js');
const AppError = require('../utils/AppError.util.js');
const JWTUtils = require('../utils/jwt.util.js');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        throw new AppError(RESPONSE_MESSAGES.ACCESS_DENIED, API_STATUS_CODES.UNAUTHORIZED);
    }
    try {
       
        const decoded = JWTUtils.verifyAccessToken(token);
        req.user = decoded;
    console.log("Authenticated user:", req.user.userId);
        next();
    } catch (error) {
        throw new AppError(RESPONSE_MESSAGES.TOKEN_EXPIRED, API_STATUS_CODES.UNAUTHORIZED);
    }
};

module.exports = {
    authenticateToken
};
