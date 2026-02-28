import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  cancelSubscription,
  createCheckout,
  createPortal,
  getPaymentHistory,
  getPlanCatalog,
  getSubscription,
  handleWebhook,
  syncCheckout,
} from "../controllers/billing.controller";

const router = Router();

router.post("/webhook", handleWebhook);

router.use(authenticate);
router.get("/plans", getPlanCatalog);
router.get("/subscription", getSubscription);
router.get("/payments", getPaymentHistory);
router.post("/checkout", createCheckout);
router.post("/sync-checkout", syncCheckout);
router.post("/portal", createPortal);
router.post("/cancel", cancelSubscription);

export default router;
