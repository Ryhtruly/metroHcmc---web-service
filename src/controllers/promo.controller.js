import { redeemGiftcodeService } from "../services/promo.service.js";

export async function redeemGiftcodeController(req, res) {
  try {
    const userId = req.user.user_id;
    const { code } = req.body;

    const result = await redeemGiftcodeService(userId, code);

    return res.json(result);

  } catch (err) {
    console.error("redeemGiftcodeController error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}
