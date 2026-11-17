const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
  const authorization = req.get("authorization") ?? "";
  const tokenMatch = authorization.match(/^Bearer\s+(\S+)$/i);

  if (!tokenMatch) {
    return res.status(401).json({
      status: "error",
      message: "Authorization token is required.",
    });
  }

  const secret = process.env.AUTH_KEY;
  if (!secret) {
    return res.status(500).json({
      status: "error",
      message: "Authentication is not configured.",
    });
  }

  let tokenData;
  try {
    tokenData = jwt.verify(tokenMatch[1], secret, {
      algorithms: ["HS256"],
    });
  } catch {
    return res.status(401).json({
      status: "error",
      message: "Invalid or expired token.",
    });
  }

  if (
    typeof tokenData !== "object" ||
    tokenData === null ||
    typeof tokenData.user !== "object" ||
    tokenData.user === null ||
    tokenData.user.id === undefined ||
    tokenData.user.id === null
  ) {
    return res.status(401).json({
      status: "error",
      message: "Invalid or expired token.",
    });
  }

  req.user = tokenData;
  return next();
}

module.exports = authenticate;
