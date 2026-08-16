import express from "express";
import { db, bcrypt, uuidv4, now } from "../database/db.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const existing = db.users.findOne("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]);

    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const createdAt = now();
    const updatedAt = now();

    const user = db.users.insert({
      id,
      email: email.toLowerCase(),
      passwordHash,
      name: name || null,
      createdAt,
      updatedAt,
    });

    const deviceId = uuidv4();
    const sessionId = uuidv4();
    db.device_sessions.insert({
      id: sessionId,
      userId: id,
      deviceId,
      lastSyncAt: updatedAt,
      createdAt,
    });

    return res.status(201).json({
      user: { id, email: user.email, name: user.name },
      token: sessionId,
      deviceId,
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password, deviceId } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = db.users.findOne("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    let sessionId = uuidv4();
    const currentTime = now();

    if (deviceId) {
      const existing = db.device_sessions.findOne("SELECT * FROM device_sessions WHERE userId = ? AND deviceId = ?", [user.id, deviceId]);

      if (existing) {
        sessionId = existing.id;
        db.device_sessions.update(sessionId, { lastSyncAt: currentTime });
      } else {
        db.device_sessions.insert({
          id: sessionId,
          userId: user.id,
          deviceId,
          lastSyncAt: currentTime,
          createdAt: currentTime,
        });
      }
    } else {
      db.device_sessions.insert({
        id: sessionId,
        userId: user.id,
        deviceId: uuidv4(),
        lastSyncAt: currentTime,
        createdAt: currentTime,
      });
    }

    return res.json({
      user: { id: user.id, email: user.email, name: user.name },
      token: sessionId,
      deviceId: deviceId || uuidv4(),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed" });
  }
});

router.post("/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    db.device_sessions.delete(token);
  }

  return res.json({ success: true });
});

export default router;
