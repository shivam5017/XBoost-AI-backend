import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";
import {
  getAdminModuleConfigs,
  getAdminPromptConfigs,
  getAdminTemplates,
  removeAdminTemplate,
  saveAdminModuleConfig,
  saveAdminPromptConfig,
  saveAdminTemplate,
} from "../controllers/admin.controller";

const router = Router();
router.use(authenticate, requireAdmin);

router.get("/templates", getAdminTemplates);
router.post("/templates", saveAdminTemplate);
router.delete("/templates/:slug", removeAdminTemplate);

router.get("/prompts", getAdminPromptConfigs);
router.put("/prompts/:key", saveAdminPromptConfig);

router.get("/modules", getAdminModuleConfigs);
router.put("/modules/:featureId", saveAdminModuleConfig);

export default router;
