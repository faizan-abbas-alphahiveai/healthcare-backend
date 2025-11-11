
const setRefreshTokenCookie = (res, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';
    
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,                  // prevents client-side JS access
    secure: isProduction,            // only send cookie over HTTPS in production
    sameSite: isProduction ? 'none' : 'lax', // 'none' needed for cross-site cookies (e.g., frontend & backend on different domains)
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

const clearRefreshTokenCookie = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  });
};

module.exports = {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
};
