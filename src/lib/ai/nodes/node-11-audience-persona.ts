import { groqChatCompletion, type GroqUsageContext } from "../groq-client";
import { GROQ_MODEL_LARGE } from "../groq-models";

export async function runAudiencePersonaEngine(
  executiveSummary: unknown,
  usageCtx?: GroqUsageContext,
) {
  const prompt = `Based on the following executive summary of YouTube comments, identify 3-5 distinct audience personas.
For each persona, extract these signals if possible: skill level, context, motivation, lifecycle, outcome.
Provide a percentage estimate for each persona's representation in the audience.

Summary: 
${JSON.stringify(executiveSummary)}

Return ONLY valid JSON in the following exact format:
{
  "personas": [
    {
      "name": "string",
      "skillSignal": "string",
      "contextSignal": "string",
      "motivationSignal": "string",
      "lifecycleSignal": "string",
      "outcomeSignal": "string",
      "percentage": number
    }
  ]
}`;

  try {
    const completion = await groqChatCompletion(
      {
        messages: [{ role: "user", content: prompt }],
        model: GROQ_MODEL_LARGE,
        temperature: 0.2,
        response_format: { type: "json_object" },
      },
      { ...usageCtx, operation: usageCtx?.operation ?? "persona.engine" },
    );

    const responseContent = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(responseContent);
    const personas = parsed.personas || [];

    // AudienceHealthScore (returning% * 0.6 + doer% * 0.4)
    // Here we make a simple heuristic based on 'lifecycle' and 'motivation'
    let doerPercentage = 0;
    let returningPercentage = 0;

    for (const p of personas) {
      const motivation = (p.motivationSignal || "").toLowerCase();
      const lifecycle = (p.lifecycleSignal || "").toLowerCase();
      
      if (motivation.includes("do") || motivation.includes("build") || motivation.includes("action")) {
        doerPercentage += p.percentage || 0;
      }
      if (lifecycle.includes("return") || lifecycle.includes("loyal") || lifecycle.includes("subscriber")) {
        returningPercentage += p.percentage || 0;
      }
    }

    const healthScore = (returningPercentage * 0.6) + (doerPercentage * 0.4);

    const skillBreakdown = { beginner: 0, mid: 0, expert: 0 };
    for (const p of personas) {
      const skill = (p.skillSignal || "").toLowerCase();
      const pct = p.percentage || 0;
      if (skill.includes("begin") || skill.includes("new")) skillBreakdown.beginner += pct;
      else if (skill.includes("expert") || skill.includes("advanced")) skillBreakdown.expert += pct;
      else skillBreakdown.mid += pct;
    }

    return {
      personas,
      healthScore,
      skillBreakdown,
    };
  } catch (e) {
    console.error("AudiencePersonaEngine error:", e);
    return {
      personas: [],
      healthScore: 0,
      skillBreakdown: { beginner: 0, mid: 0, expert: 0 },
    };
  }
}
