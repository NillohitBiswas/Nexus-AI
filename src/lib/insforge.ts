import { createClient } from "@insforge/sdk";
import { insforgeConfig } from "@/lib/insforge/config";

export const insforge = createClient({
  baseUrl: insforgeConfig.url,
  anonKey: insforgeConfig.anonKey,
});
