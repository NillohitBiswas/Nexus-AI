import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { analyzeVideoFn } from "../../../inngest/functions";
import { dodoUsageSyncFn } from "../../../inngest/dodo-sync";
import { autoResponderDrafterFn, replyFlusherFn } from "../../../inngest/auto-responder";
import { newsroomFn, newsroomScanFn } from "../../../inngest/newsroom";
import { monthlyQuotaResetFn } from "../../../inngest/monthly-reset";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    analyzeVideoFn,
    dodoUsageSyncFn,
    autoResponderDrafterFn,
    replyFlusherFn,
    newsroomFn,
    newsroomScanFn,
    monthlyQuotaResetFn,
  ],
});
