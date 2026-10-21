const { auth, requiredScopes } = require('express-oauth2-jwt-bearer');

const validateAccessToken = auth({
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  audience: process.env.AUTH0_AUDIENCE,
  tokenSigningAlg: 'RS256'
});

function requireScope(scope) {
  return [validateAccessToken, requiredScopes(scope)];
}

function requireApiKey(req, res, next) {
  const apiKey = req.header('x-api-key');
  const expectedApiKey = process.env.INTERNAL_API_KEY;

  if (!expectedApiKey) {
    return res.status(500).json({ error: 'API key interna no configurada' });
  }

  if (!apiKey || apiKey !== expectedApiKey) {
    return res.status(401).json({ error: 'API key inválida o ausente' });
  }

  next();
}

module.exports = {
  validateAccessToken,
  requireScope,
  requireApiKey
};
