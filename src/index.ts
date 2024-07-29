import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import puppeteer from "puppeteer";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: "https://apply-frame.vercel.app/",
    credentials: true,
  })
);
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authenticate = (req: Request, res: Response, next: NextFunction) => {
  console.log("authenticating");

  const apiKey = req.headers["x-api-key"] as string;
  if (apiKey && apiKey === process.env.API_KEY) {
    next();
  } else {
    console.error("Authentication failed: Invalid API key");
    res.status(403).json({ error: "Forbidden" });
  }
};

const handleScreenshot = async (url: string): Promise<Buffer> => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--single-process",
      "--no-zygote",
    ],
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle0" });
  const screenshot = await page.screenshot({ fullPage: true });
  await browser.close();
  return screenshot;
};

app.post("/screenshot", authenticate, async (req: Request, res: Response) => {
  const { url } = req.body;

  // Basic URL validation
  if (!url || !url.startsWith("http")) {
    console.error("Validation failed: Invalid URL", url);
    return res.status(400).json({ error: "Invalid URL" });
  }

  try {
    const screenshot = await handleScreenshot(url);
    res.type("image/png").send(screenshot);
    console.log("Screenshot taken successfully");
  } catch (error) {
    console.error("Error taking screenshot:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
