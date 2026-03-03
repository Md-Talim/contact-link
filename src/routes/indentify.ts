import { Request, Response, Router } from "express";
import { identify } from "../services/contact.service";

const router: Router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { email, phoneNumber } = req.body;

  try {
    const result = await identify({ email, phoneNumber });
    res.status(200).json(result);
  } catch (err) {
    console.error("Error in /identify:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
