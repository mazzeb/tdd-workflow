function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } });
  }

  const token = authHeader.slice(7);

  // Simple token validation — in production, verify JWT
  try {
    // For now, token is just base64-encoded user ID
    const userId = Buffer.from(token, 'base64').toString('utf-8');
    req.user = { id: parseInt(userId, 10) };
    next();
  } catch {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
  }
}

module.exports = { authenticate };
