import { db, now } from "../database/db.js";

export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  const session = db.device_sessions.findOne("SELECT * FROM device_sessions WHERE id = ?", [token]);

  if (!session) {
    return res.status(401).json({ error: "Invalid token" });
  }

  const user = db.users.findOne("SELECT id, email, name, createdAt, updatedAt FROM users WHERE id = ?", [session.userId]);

  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  req.user = user;
  req.deviceId = session.deviceId;
  next();
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return next();
  }

  try {
    const session = db.device_sessions.findOne("SELECT * FROM device_sessions WHERE id = ?", [token]);

    if (session) {
      const user = db.users.findOne("SELECT id, email, name, createdAt, updatedAt FROM users WHERE id = ?", [session.userId]);

      if (user) {
        req.user = user;
        req.deviceId = session.deviceId;
      }
    }
  } catch (error) {
    console.error("Optional auth error:", error);
  }

  next();
}
