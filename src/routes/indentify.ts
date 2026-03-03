import { Request, Response, Router } from "express";
import { identify } from "../services/contact.service";
import { AppError } from "../utils/AppError";

const router: Router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    throw new AppError("At least one of email or phoneNumber must be provided", 400);
  }

  const result = await identify({ email, phoneNumber });
  res.status(200).json(result);
});

export default router;
