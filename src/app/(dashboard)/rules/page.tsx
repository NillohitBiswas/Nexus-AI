"use client";

import React, { useState, useEffect, startTransition } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  Sparkles,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Clock,
  CheckCircle2,
  AlertOctagon,
  ShieldAlert,
  Loader2,
  Edit3,
  Bot,
  MessageSquare,
  FileText,
  HelpCircle
} from "lucide-react";
import {
  getRules,
  createRule,
  updateRule,
  deleteRule,
  getResponseLogs
} from "../../actions/rules";

export default function RulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states for creating rule
  const [showAddForm, setShowAddForm] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [intents, setIntents] = useState("");
  const [template, setTemplate] = useState("");
  const [minIntensity, setMinIntensity] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Error/Success
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [fetchedRules, fetchedLogs] = await Promise.all([
        getRules(),
        getResponseLogs()
      ]);
      setRules(fetchedRules);
      setLogs(fetchedLogs);
    } catch (err) {
      console.error("Failed to load rules page data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startTransition(() => {
      void loadData();
    });
  }, []);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) {
      setErrorMsg("Reply template is required");
      return;
    }

    setActionLoading(true);
    setErrorMsg(null);

    const parsedKeywords = keywords
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    const parsedIntents = intents
      .split(",")
      .map((i) => i.trim())
      .filter((i) => i.length > 0);

    try {
      await createRule({
        keywords: parsedKeywords,
        intents: parsedIntents,
        template,
        minIntensity: Number(minIntensity),
        isActive
      });

      // Reset form
      setKeywords("");
      setIntents("");
      setTemplate("");
      setMinIntensity(0);
      setIsActive(true);
      setShowAddForm(false);
      
      // Reload
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(message || "Failed to create rule");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleRule = async (ruleId: string, currentStatus: boolean) => {
    try {
      await updateRule(ruleId, { isActive: !currentStatus });
      await loadData();
    } catch (err) {
      console.error("Failed to toggle rule:", err);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this rule? This will also remove associated response logs.")) return;

    try {
      await deleteRule(ruleId);
      await loadData();
    } catch (err) {
      console.error("Failed to delete rule:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-red-500" />
          <p className="text-zinc-500">Loading auto-responder workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Main Content */}
      <div className="mx-auto max-w-7xl w-full flex-1 px-4 py-8 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Rules List Section (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
                <Bot className="h-7 w-7 text-red-500" />
                Response Automation Rules
              </h1>
              <p className="text-sm text-zinc-500 mt-1">
                Configure smart auto-replies matching keywords, user intents, and gap signals.
              </p>
            </div>

            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              variant="primary"
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>New Rule</span>
            </Button>
          </div>

          {/* New Rule Creation Drawer/Box */}
          {showAddForm && (
            <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6 backdrop-blur-md space-y-4 animate-in slide-in-from-top-4 duration-300">
              <h2 className="text-md font-bold text-zinc-900 flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-red-500" />
                Create Auto-Response Rule
              </h2>

              <form onSubmit={handleCreateRule} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-500 font-semibold block mb-1.5">Keywords (comma-separated)</label>
                    <Input
                      type="text"
                      placeholder="e.g. bug, error, slow, tutorial"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-semibold block mb-1.5">Target Intents (comma-separated)</label>
                    <Input
                      type="text"
                      placeholder="e.g. pricing, signup, support"
                      value={intents}
                      onChange={(e) => setIntents(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 font-semibold mb-1.5 flex justify-between">
                    <span>Reply Template</span>
                    <span className="text-[10px] text-zinc-500">Supports tone mirroring & empathy</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Hi {{authorName}}, thanks for the feedback! We are actively working on improving the platform. Let us know if you need anything else!"
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-red-500"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <label className="text-xs text-zinc-500 font-semibold block mb-1">Min Intensity</label>
                      <select
                        value={minIntensity}
                        onChange={(e) => setMinIntensity(Number(e.target.value))}
                        className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs outline-none focus:border-red-500 text-zinc-900"
                      >
                        {[0, 2, 4, 6, 8].map((v) => (
                          <option key={v} value={v}>
                            Level {v}+
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="rounded border-zinc-200 bg-zinc-50 text-red-650 focus:ring-red-500"
                      />
                      <label htmlFor="isActive" className="text-xs text-zinc-700 font-semibold cursor-pointer">
                        Enable immediately
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      variant="ghost"
                      className="rounded-xl px-4 py-2 text-xs font-semibold"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={actionLoading}
                      variant="primary"
                      className="rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1"
                      isLoading={actionLoading}
                    >
                      <span>Save Rule</span>
                    </Button>
                  </div>
                </div>

                {errorMsg && <p className="text-xs text-red-400 font-semibold mt-2">{errorMsg}</p>}
              </form>
            </div>
          )}

          {/* Active Rules List */}
          {rules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 p-12 text-center space-y-4">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-50 text-zinc-600 border border-zinc-200">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">No response rules found</h3>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-1">
                  Create your first automation rule using keywords, user intents, or semantic templates to draft replies instantly.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`rounded-2xl border p-5 backdrop-blur-md flex flex-col justify-between gap-4 transition-all hover:bg-zinc-900/10 ${
                    rule.isActive ? "border-zinc-200 bg-white animate-in fade-in" : "border-zinc-200 bg-zinc-50 opacity-60"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] text-red-500 font-bold tracking-wider uppercase bg-red-500/10 border border-red-100 px-2 py-0.5 rounded">
                        Active Rule
                      </span>
                      
                      <div className="flex items-center gap-1.5">
                        <Button
                          onClick={() => handleToggleRule(rule.id, rule.isActive)}
                          variant="ghost"
                          className="text-zinc-500 hover:text-white transition-colors h-8 w-8 flex items-center justify-center"
                        >
                          {rule.isActive ? (
                            <ToggleRight className="h-6 w-6 text-red-500" />
                          ) : (
                            <ToggleLeft className="h-6 w-6 text-zinc-600" />
                          )}
                        </Button>
                        <Button
                          onClick={() => handleDeleteRule(rule.id)}
                          variant="ghost"
                          className="text-zinc-500 hover:text-red-400 p-1 rounded transition-colors h-8 w-8 flex items-center justify-center"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-zinc-500 font-bold block mb-1">Reply Template:</span>
                        <p className="text-xs text-zinc-800 bg-zinc-100 p-2.5 rounded-xl border border-zinc-200 leading-relaxed italic">
                        &quot;{rule.template}&quot;
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-[10px]">
                      {rule.keywords.length > 0 && (
                        <div className="bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded text-zinc-500">
                          <strong>KWs:</strong> {rule.keywords.join(", ")}
                        </div>
                      )}
                      {rule.intents.length > 0 && (
                        <div className="bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded text-zinc-500">
                          <strong>Intents:</strong> {rule.intents.join(", ")}
                        </div>
                      )}
                      <div className="bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded text-zinc-500">
                        <strong>Min Intensity:</strong> Level {rule.minIntensity}+
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Response Logs & Jitter Queue Stream (Right 1 col) */}
        <div className="lg:col-span-1 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-red-500 animate-pulse" />
              Jitter Queue & Logs
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Watch real-time auto-responder queue, drafts, posted events, and safety blocks.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 backdrop-blur-sm space-y-4 max-h-150 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-8">No response history recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 space-y-2.5 transition-all hover:bg-zinc-50/70"
                  >
                    <div className="flex justify-between items-center text-[10px]">
                      {log.status === "PENDING" && (
                        <span className="flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold">
                          <Clock className="h-3 w-3 animate-pulse" />
                          <span>PENDING (JITTER)</span>
                        </span>
                      )}
                      {log.status === "POSTING" && (
                        <span className="flex items-center gap-1 text-red-400 bg-red-50 border border-red-500/15 px-2 py-0.5 rounded font-bold">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>POSTING...</span>
                        </span>
                      )}
                      {log.status === "POSTED" && (
                        <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>POSTED</span>
                        </span>
                      )}
                      {log.status === "BLOCKED_BY_GUARD" && (
                        <span className="flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded font-bold">
                          <ShieldAlert className="h-3 w-3" />
                          <span>BLOCKED (SAFETY)</span>
                        </span>
                      )}
                      {log.status === "FAILED" && (
                        <span className="flex items-center gap-1 text-red-500 bg-red-500/10 border border-red-500/15 px-2 py-0.5 rounded font-bold">
                          <AlertOctagon className="h-3 w-3" />
                          <span>FAILED</span>
                        </span>
                      )}

                      <span className="text-zinc-500">
                        {new Date(log.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-500 block mb-0.5">Drafted Reply:</span>
                      <p className="text-xs text-zinc-700 bg-zinc-100 p-2 rounded-lg border border-zinc-200 leading-relaxed italic">
                        &quot;{log.draftText}&quot;
                      </p>
                    </div>

                    <div className="flex justify-between items-center text-[9px] text-zinc-500">
                      <span>Rule template match</span>
                      {log.postedAt && (
                        <span className="text-[8px] text-zinc-600">Posted at: {new Date(log.postedAt).toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
