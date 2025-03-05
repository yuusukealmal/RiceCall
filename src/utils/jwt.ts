export const parseJwt = (sessionId: string) => {
  try {
    return JSON.parse(atob(sessionId.split('.')[1]));
  } catch (e) {
    return null;
  }
};

export const isTokenExpired = (sessionId: string) => {
  const decoded = parseJwt(sessionId);
  if (!decoded) return true;

  const currentTime = Date.now() / 1000;
  return decoded.exp < currentTime;
};
