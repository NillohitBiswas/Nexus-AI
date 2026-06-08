export function tierFromRazorpayPlan(planId: string): string {
  if (planId === process.env.RAZORPAY_AGENCY_PLAN_ID) return "AGENCY";
  if (planId === process.env.RAZORPAY_GROWTH_PLAN_ID) return "GROWTH";
  return "CREATOR";
}

export function tierFromDodoPlan(planId: string): string {
  if (planId === process.env.DODO_AGENCY_PLAN_ID) return "AGENCY";
  if (planId === process.env.DODO_GROWTH_PLAN_ID) return "GROWTH";
  return "CREATOR";
}
