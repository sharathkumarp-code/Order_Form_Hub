import { Router, type Request, type Response } from "express";
import fs from "fs/promises";
import path from "path";
import { logger } from "../lib/logger";

const router = Router();

// Path to the credential file relative to the project root
// The server runs from artifacts/api-server, so the file is in ../order-app/Credential/credential
const CREDENTIAL_FILE_PATH = path.resolve(process.cwd(), "..", "order-app", "Credential", "credential");

async function getCredentials() {
  try {
    const content = await fs.readFile(CREDENTIAL_FILE_PATH, "utf-8");
    const lines = content.split("\n");
    let username = "";
    let password = "";

    for (const line of lines) {
      if (line.startsWith("UserName:")) {
        username = line.split(":")[1].trim().replace(/"/g, "");
      } else if (line.startsWith("Password:")) {
        password = line.split(":")[1].trim().replace(/"/g, "");
      }
    }
    return { username, password };
  } catch (error) {
    logger.error({ error, path: CREDENTIAL_FILE_PATH }, "Error reading credential file");
    // Default if file doesn't exist or error
    return { username: "Admin", password: "Admin123" };
  }
}

async function saveCredentials(username: string, password: string) {
  const content = `UserName: "${username}"\nPassword: "${password}"`;
  try {
    // Ensure directory exists
    await fs.mkdir(path.dirname(CREDENTIAL_FILE_PATH), { recursive: true });
    await fs.writeFile(CREDENTIAL_FILE_PATH, content, "utf-8");
  } catch (error) {
    logger.error({ error, path: CREDENTIAL_FILE_PATH }, "Error writing credential file");
    throw error;
  }
}

router.post("/auth/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;
  const stored = await getCredentials();

  if (username === stored.username && password === stored.password) {
    // In a real app, we'd issue a JWT. Here we just return success.
    return res.json({ success: true, user: { username: stored.username } });
  }

  return res.status(401).json({ success: false, message: "Invalid Credentials" });
});

router.post("/auth/change-password", async (req: Request, res: Response) => {
  const { newPassword } = req.body;
  
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ success: false, message: "Password too short" });
  }

  try {
    const stored = await getCredentials();
    await saveCredentials(stored.username, newPassword);
    return res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update password" });
  }
});

export default router;
