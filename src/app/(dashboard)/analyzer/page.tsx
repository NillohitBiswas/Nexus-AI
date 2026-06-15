"use client";

import React, { useState, useEffect, useTransition, startTransition } from "react";
import { useRouter } from "next/navigation";
import { getDashboardData, getYoutubeOAuthUrl } from "../../actions/youtube";
import { retryScanAction } from "../../actions/scans";
import {
  AlertCircle,
  Loader2,
  TrendingUp,
  Activity,
  Play,
  CheckCircle2,
  ListFilter,
  Frown,
  Meh,
  Smile,
  ArrowRight,
  Database,
  Download,
  Users,
  Target,
  ShieldAlert,
  Star,
  Lightbulb,
  FileText,
  Copy,
  Check,
  Zap
} from "lucide-react";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

// Inline Youtube Icon to bypass package version differences
const Youtube = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.53 3.5 12 3.5 12 3.5s-7.53 0-9.388.555A3.003 3.003 0 0 0 .502 6.163C0 8.07 0 12 0 12s0 3.93.502 5.837a3.003 3.003 0 0 0 2.11 2.108C4.47 20.5 12 20.5 12 20.5s7.53 0 9.388-.555a3.003 3.003 0 0 0 2.11-2.108C24 15.93 24 12 24 12s0-3.93-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);


type Comment = {
  id?: string;
  rawText: string;
  category?: string;
  authorName?: string;
};

type Scan = {
  id: string;
  status?: string;
  progress?: number;
  completedAt?: string | Date | null;
  emergencyAlert?: boolean | string | null;
  deltaReport?: unknown | null;
  video?: { comments?: Comment[]; title?: string; url?: string };
  executiveSummary?: unknown | null;
  [key: string]: any;
};

type Channel = {
  id?: string;
  name?: string;
  thumbnail?: string | null;
  subCount?: number;
};

type Usage = {
  scansThisMonth: number;
  maxScansPerMonth: number;
  canScan: boolean;
  scanGateReason: string | null;
};

type User = {
  tier?: string;
};

export default function AnalyzerPage() {
  const router = useRouter();
  
  // Data states
  const [user, setUser] = useState<User | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);

  function scanFailureMessage(scan: any): string | null {
    const summary = scan?.executiveSummary;
    if (summary && typeof summary === "object" && "error" in summary) {
      return String((summary as { error?: string }).error || "");
    }
    return null;
  }

  // Scan states
  const [urlInput, setUrlInput] = useState("");
  const [isCompetitorScan, setIsCompetitorScan] = useState(false);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [activeScan, setActiveScan] = useState<Scan | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("Initializing scan...");

  // Interactive UI states
  const [activeTab, setActiveTab] = useState("overview");
  const [draftingCommentId, setDraftingCommentId] = useState<string | null>(null);
  const [replyDraftText, setReplyDraftText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleDraftReply = (c: Comment) => {
    let draft = "";
    const lower = c.rawText.toLowerCase();
    if (c.category === "BUG" || c.category === "COMPLAINT") {
      draft = `Hey ${c.authorName}! Thanks for pointing this out. We're looking into this issue right now to see how we can get a fix rolled out. Realize it's a blocker!`;
    } else if (c.category === "FEATURE" || c.category === "QUESTION") {
      draft = `Hi ${c.authorName}, that's an excellent suggestion! We've added this content gap / request to our developmental backlog to explore in our upcoming releases. Thanks for sharing!`;
    } else {
      draft = `Thanks so much for the feedback, ${c.authorName}! We're thrilled to hear you are enjoying the content. Keep commenting!`;
    }
    setReplyDraftText(draft);
    setDraftingCommentId(c.id ?? null);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Comments filter
  const [commentFilter, setCommentFilter] = useState("ALL");
  const [isPending, startTransition] = useTransition();

  // Load dashboard data
  const loadData = async () => {
    try {
      const data = await getDashboardData();
      if (data && 'error' in data) {
        if (data.error === "Unauthorized") {
          router.push("/login");
        }
        return;
      }
      setUser(data.user);
      setChannels(data.channels);
      setScans(data.scans);
      setUsage(data.usage);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadPastScan = async (scanId: string) => {
    setScanLoading(true);
    setScanError(null);
    setActiveScanId(null);
    try {
      const res = await fetch(`/api/analyze?scanId=${scanId}`, { credentials: "include" });
      if (res.status === 401) {
        router.push("/login?redirectTo=/analyzer");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setActiveScan(data);
        if (data.status === "COMPLETE" && typeof window !== "undefined") {
          sessionStorage.setItem("nexus_activeScanId", scanId);
        }
      } else {
        setScanError("Failed to fetch scan results");
      }
    } catch (err) {
      setScanError("Error loading scan details");
    } finally {
      setScanLoading(false);
    }
  };

  useEffect(() => {
    startTransition(() => {
      void loadData();
    });
  }, []);

  // After refresh: resume in-progress scans or reload last completed report
  useEffect(() => {
    if (loading) return;

    const running = scans.find(
      (s) => s.status === "PENDING" || s.status === "RUNNING",
    );
    if (running) {
      startTransition(() => {
        setActiveScanId(running.id);
        setScanLoading(true);
      });
      return;
    }

    const queryId = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("scanId")
      : null;

    const savedId = queryId || (
      typeof window !== "undefined"
        ? sessionStorage.getItem("nexus_activeScanId")
        : null
    );
    if (savedId && scans.some((s) => s.id === savedId)) {
      void handleLoadPastScan(savedId);
      return;
    }

    const latestComplete = scans.find((s) => s.status === "COMPLETE");
    if (latestComplete && !activeScan) {
      void handleLoadPastScan(latestComplete.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when scans load after refresh
  }, [loading, scans]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeScanId) {
      sessionStorage.setItem("nexus_activeScanId", activeScanId);
    }
  }, [activeScanId]);

  // Poll scan status if activeScanId is set
  useEffect(() => {
    if (!activeScanId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/analyze?scanId=${activeScanId}`, {
          credentials: "include",
        });
        if (res.status === 401) {
          setActiveScanId(null);
          setScanLoading(false);
          router.push("/login?redirectTo=/analyzer");
          return;
        }
        if (!res.ok) {
          throw new Error("Failed to check status");
        }
        const data = await res.json();
        setActiveScan(data);
        
        // Update progress messages based on progress value
        if (data.progress < 0.3) {
          setProgressMsg("Ingesting YouTube comment threads...");
        } else if (data.progress < 0.5) {
          setProgressMsg("Deduplicating and storing comments...");
        } else if (data.progress < 0.7) {
          setProgressMsg("Running AI classifications (checking semantic cache & map-reduce critique loops)...");
        } else if (data.progress < 0.8) {
          setProgressMsg("Applying like-weight computations (Node 10)...");
        } else if (data.progress < 1.0) {
          setProgressMsg("Generating executive summaries & pain-point reducers (Groq Llama 70B)...");
        }

        if (data.status === "COMPLETE") {
          if (typeof window !== "undefined") {
            sessionStorage.setItem("nexus_activeScanId", activeScanId);
          }
          setActiveScan(data);
          setActiveScanId(null);
          setScanLoading(false);
          loadData(); // refresh list
        } else if (data.status === "FAILED") {
          setActiveScan(data);
          setActiveScanId(null);
          setScanLoading(false);
          loadData();
          setScanError(
            scanFailureMessage(data) ||
              "Analysis pipeline failed. Open Scan History for details, then try a new scan."
          );
        }
      } catch (err: any) {
        console.error("Polling error:", err);
        setActiveScanId(null);
        setScanLoading(false);
        setScanError(err.message || "An error occurred during polling.");
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeScanId]);

  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput) return;

    setScanError(null);
    setScanLoading(true);
    setActiveScan(null);
    setProgressMsg("Queuing scan in background pipeline...");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: urlInput, isCompetitor: isCompetitorScan }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "UPGRADE_REQUIRED") {
          setScanError("Limit reached: You have run out of FREE tier scans this month. Upgrade at /pricing");
        } else {
          setScanError(data.error || "Failed to start scan");
        }
        setScanLoading(false);
        return;
      }

      setActiveScanId(data.scanId);
    } catch (err: any) {
      setScanError(err.message || "An unexpected error occurred");
      setScanLoading(false);
    }
  };

  const handleConnectYoutube = async () => {
    try {
      const result = await getYoutubeOAuthUrl();
      if (result.error) {
        alert(result.error);
      } else if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error(err);
      alert("Failed to initiate YouTube connection");
    }
  };

  const handleRetryScan = async (scanId: string) => {
    setScanError(null);
    setScanLoading(true);
    try {
      const result = await retryScanAction(scanId);
      if (result?.error) {
        setScanError(result.error);
        setScanLoading(false);
        return;
      }
      setActiveScan(null);
      setActiveScanId(scanId);
      setProgressMsg("Retrying analysis pipeline...");
    } catch {
      setScanError("Could not retry scan. Check that Inngest dev is running.");
      setScanLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-red-500" />
          <p className="text-zinc-500">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Parse Executive Summary JSON if complete
  const summaryData = activeScan?.executiveSummary && typeof activeScan.executiveSummary === "string"
    ? JSON.parse(activeScan.executiveSummary)
    : (activeScan?.executiveSummary as object) || null;

  // Filtered comments if we have any loaded inside activeScan.video.comments
  const comments: Comment[] = (activeScan?.video?.comments as Comment[] | undefined) || [];
  const filteredComments = commentFilter === "ALL"
    ? comments
    : comments.filter((c) => String(c.category || "").toUpperCase() === commentFilter);

  return (
    <div className="min-h-screen text-zinc-900">
      {/* Main Content Layout */}
      <div className="mx-auto max-w-7xl w-full flex-1 px-4 py-8 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left column: Controls & Connection */}
        <div className="lg:col-span-1 space-y-6">
          {/* Workspace Info */}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-5">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Workspace Info</h3>
            <div className="space-y-4">
              <div>
                <span className="text-[11px] text-zinc-500 block font-medium uppercase tracking-wider">Subscription Plan</span>
                <span className="text-sm font-bold text-zinc-900 flex items-center gap-2 mt-0.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                  {user?.tier} Plan
                </span>
              </div>
              <div>
                <span className="text-[11px] text-zinc-500 block font-medium uppercase tracking-wider">Scans This Month</span>
                <span className="text-sm font-bold text-zinc-900 mt-0.5 block">
                  {usage?.maxScansPerMonth === Infinity
                    ? `${usage?.scansThisMonth ?? scans.length} used (unlimited)`
                    : `${usage?.scansThisMonth ?? 0} / ${usage?.maxScansPerMonth ?? 2} used`}
                </span>
                {usage && usage.maxScansPerMonth !== Infinity && (
                  <div className="mt-2 h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-1.5 rounded-full bg-red-500 transition-all"
                      style={{ width: `${Math.min(100, ((usage.scansThisMonth ?? 0) / (usage.maxScansPerMonth ?? 1)) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <div>
                <span className="text-[11px] text-zinc-500 block font-medium uppercase tracking-wider">Scan History</span>
                <div className="flex gap-3 mt-1">
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">{scans.filter((s) => s.status === "COMPLETE").length} done</span>
                  <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">{scans.filter((s) => s.status === "FAILED").length} failed</span>
                  <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">{scans.filter((s) => s.status === "PENDING" || s.status === "RUNNING").length} running</span>
                </div>
              </div>
            </div>
          </div>

          {/* YouTube Connection */}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-5">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Channel Connection</h3>
            {channels.length === 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                  <p className="text-xs font-semibold text-amber-700">Not Connected</p>
                </div>
                <p className="text-xs text-zinc-500 mb-4">Link your YouTube channel to start scanning audience signals.</p>
                <Button
                  onClick={handleConnectYoutube}
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-red-600 hover:bg-red-500 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors active:scale-[0.98]"
                  variant="primary"
                >
                  <Youtube className="h-4 w-4" />
                  Connect YouTube
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {channels.map((chan) => (
                  <div key={chan.id} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                    {chan.thumbnail ? (
                      <img src={chan.thumbnail} alt={chan.name} className="h-10 w-10 rounded-full border border-zinc-200" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 border border-red-100 text-red-500">
                        <Youtube className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-zinc-900 block truncate">{chan.name}</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span className="text-xs text-zinc-500">{(chan.subCount || 0).toLocaleString()} subscribers</span>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={handleConnectYoutube}
                  className="text-xs text-red-600 hover:text-red-500 font-semibold block text-center w-full py-1.5 border border-red-100 hover:border-red-200 rounded-xl transition-colors outline-none"
                >
                  Reconnect Channel
                </button>
              </div>
            )}
          </div>

          {/* Past Scans History */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 backdrop-blur-md">
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">Scan History</h3>
            {scans.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">No scans ran yet.</p>
            ) : (
              <div className="space-y-2 max-h-75 overflow-y-auto overflow-x-hidden pr-1">
                {scans.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => handleLoadPastScan(sc.id)}
                    className={`w-full overflow-hidden text-left p-3 rounded-xl border transition-all text-xs flex flex-col gap-1 justify-start outline-none ${
                      activeScan?.id === sc.id
                        ? "border-red-500 bg-red-50/50 text-red-650"
                        : sc.status === "FAILED"
                          ? "border-red-100 bg-red-500/5 text-red-700 hover:bg-red-500/10 hover:border-red-200"
                          : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 bg-zinc-50/50 text-zinc-700"
                    }`}
                  >
                    <span className="font-semibold text-zinc-800 truncate block w-full">{sc.video?.title || "Scan results"}</span>
                    <div className="flex justify-between items-center text-[10px] text-zinc-500 w-full">
                      <span className={sc.status === "FAILED" ? "text-red-500" : ""}>Status: {sc.status}</span>
                      <span>{sc.completedAt ? new Date(sc.completedAt).toLocaleDateString() : ""}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Columns: Scanning Console & Results Display */}
        <div className="lg:col-span-3 space-y-8">
          
          {/* Scanning Input Box */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 backdrop-blur-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-[-50%] right-[10%] w-75 h-75 rounded-full bg-red-600/5 blur-[80px]" />
            <h2 className="text-lg font-bold text-zinc-900 mb-2 flex items-center gap-2">
              <Activity className="h-5 w-5 text-red-500" />
              Scan Video Audience Signals
            </h2>
            <p className="text-sm text-zinc-500 mb-6">
              Enter any YouTube video URL or ID. We will run map-reduce classification, execute like-weighting, run the Llama-3 critique loop, and extract product intelligence.
            </p>

            <label className="flex items-center gap-2 mb-4 text-sm text-zinc-500 cursor-pointer">
              <input
                type="checkbox"
                checked={isCompetitorScan}
                onChange={(e) => setIsCompetitorScan(e.target.checked)}
                className="rounded border-zinc-200 accent-red-650"
              />
              Competitor scan (uses Apify for large comment threads)
            </label>

            <form onSubmit={handleStartScan} className="flex flex-col sm:flex-row gap-3">
              <Input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                disabled={scanLoading}
                className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-500 outline-none transition-all focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:opacity-50"
              />
              <Button
                type="submit"
                disabled={scanLoading || !urlInput}
                variant="primary"
                className="flex items-center justify-center gap-2 px-6 py-3"
                isLoading={scanLoading}
              >
                {!scanLoading && <Play className="h-4 w-4 fill-current" />}
                <span>Analyze Video</span>
              </Button>
            </form>

            {scanError && (
              <div className="mt-4 rounded-xl border border-red-100 bg-red-500/10 p-4 text-sm text-red-400 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{scanError}</span>
              </div>
            )}
          </div>

          {/* Processing / Progress State */}
          {scanLoading && activeScanId && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center space-y-6">
              <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 border border-red-100">
                <Loader2 className="h-7 w-7 animate-spin text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-md font-bold text-zinc-900">Running Analysis Pipeline</h3>
                <p className="text-sm text-zinc-500 max-w-md mx-auto">{progressMsg}</p>
              </div>

              {/* Fake Progress Bar */}
              <div className="w-full max-w-md mx-auto bg-zinc-50 rounded-full h-2 overflow-hidden border border-zinc-200">
                <div 
                  className="bg-linear-to-r from-red-600 to-red-800 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${(activeScan?.progress || 0) * 100}%` }}
                />
              </div>
              <span className="text-xs text-zinc-500 font-medium">Progress: {Math.round((activeScan?.progress || 0) * 100)}%</span>
            </div>
          )}

          {/* Results dashboard display */}
          {activeScan && activeScan.status === "FAILED" && (
            <div className="rounded-2xl border border-red-200 bg-red-500/10 p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-red-300 mb-2">Scan failed</h3>
                <p className="text-sm text-red-200/90">
                  {scanFailureMessage(activeScan) ||
                    "This scan failed before detailed errors were saved (common after the old Groq model was retired). Your API keys are fine now — retry this scan without using another monthly slot."}
                </p>
                <p className="text-xs text-zinc-500 mt-3">
                  Listed in Scan History and already counted toward your monthly limit.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => handleRetryScan(activeScan.id)}
                disabled={isPending || scanLoading}
                variant="danger"
                className="rounded-xl px-4 py-2.5 text-sm font-semibold"
              >
                Retry this scan
              </Button>
            </div>
          )}          {activeScan && activeScan.status === "COMPLETE" && (
            <div className="space-y-8 animate-in fade-in duration-500">
              
              {/* Emergency Alert Banner */}
              {activeScan.emergencyAlert && (
                <div className="rounded-2xl border border-red-200 bg-linear-to-r from-red-950/60 to-black p-5 relative overflow-hidden animate-pulse">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-650/10 rounded-full blur-xl pointer-events-none" />
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600/20 text-red-500 border border-red-150">
                      <ShieldAlert className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Critical Sentiment Delta Alert</h3>
                      <p className="text-sm text-zinc-700 leading-relaxed">
                        A sudden, severe surge in bug reports or complaints has been flagged in comment ingestion!
                      </p>
                      {activeScan.deltaReport != null && (
                        <p className="text-xs text-red-400 font-semibold mt-1">
                          Report details: {typeof activeScan.deltaReport === "string" ? activeScan.deltaReport : JSON.stringify((activeScan.deltaReport as any).message || activeScan.deltaReport)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Scan Info Header */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-5 rounded-2xl border border-zinc-200 bg-white relative overflow-hidden">
                <div className="absolute top-[-50%] left-[20%] w-50 h-50 rounded-full bg-red-600/5 blur-[50px] pointer-events-none" />
                <div>
                  <span className="text-[10px] text-red-500 font-bold tracking-widest uppercase block mb-1">Active Scan Results</span>
                  <h2 className="text-xl font-bold text-zinc-900">{activeScan.video?.title || "Video scan"}</h2>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 items-center mt-1">
                    <a 
                      href={activeScan.video?.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-xs text-zinc-500 hover:text-white underline"
                    >
                      View on YouTube
                    </a>
                    <span className="text-zinc-700">•</span>
                    <span className="text-xs text-zinc-500">Scan ID: {activeScan.id}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {/* PDF Download Button */}
                  <button
                    onClick={() => window.open(`/api/analyze/pdf?scanId=${activeScan.id}`, "_blank")}
                    className="flex items-center gap-1.5 text-zinc-700 hover:text-white transition-all text-xs font-semibold border border-zinc-200 bg-zinc-50 hover:bg-zinc-900 rounded-xl px-4 py-2 outline-none"
                    title="Download PDF report for clients"
                  >
                    <Download className="h-4 w-4" />
                    <span>PDF Report</span>
                  </button>

                  <div className="flex items-center gap-1.5 bg-red-600/10 border border-red-100 rounded-xl px-3 py-2 text-red-500 text-xs font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Analyzed</span>
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex border border-zinc-200 bg-white p-1.5 rounded-2xl gap-1 overflow-x-auto">
                {[
                  { id: "overview", label: "Overview", icon: Activity },
                  { id: "audience", label: "Audience & Health", icon: Users },
                  { id: "leads", label: "Leads Engine", icon: Target },
                  { id: "content", label: "Content Intel", icon: Lightbulb },
                  { id: "competitors", label: "Competitor Radar", icon: Zap },
                  { id: "comments", label: "Comment Stream", icon: FileText }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border outline-none ${
                        active
                          ? "bg-red-600 text-white border-red-600 shadow-sm"
                          : "text-zinc-600 border-transparent hover:text-zinc-900 hover:bg-zinc-100"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Content Display */}
              
              {/* Tab 1: Overview */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Primary Metrics: Sentiment, Pain, Demand */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Sentiment Gauge */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-5 flex flex-col justify-between relative overflow-hidden">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-semibold text-zinc-500">Weighted Sentiment</span>
                        {activeScan.weightedSentiment > 0.1 ? (
                          <Smile className="h-5 w-5 text-red-500" />
                        ) : activeScan.weightedSentiment < -0.1 ? (
                          <Frown className="h-5 w-5 text-zinc-500" />
                        ) : (
                          <Meh className="h-5 w-5 text-zinc-500" />
                        )}
                      </div>
                      <div className="my-4">
                        <span className="text-3xl font-extrabold text-zinc-900">
                          {(activeScan.weightedSentiment || 0) > 0 ? "+" : ""}
                          {(activeScan.weightedSentiment || 0).toFixed(2)}
                        </span>
                        <span className="text-xs text-zinc-500 block mt-1">Scale from -1.00 to +1.00</span>
                      </div>
                      <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-1.5 rounded-full bg-red-600"
                          style={{ width: `${((activeScan.weightedSentiment || 0) + 1) * 50}%` }}
                        />
                      </div>
                    </div>

                    {/* Pain Index */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-5 flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/5 rounded-full blur-xl" />
                      <span className="text-sm font-semibold text-zinc-500 block mb-2">Weighted Pain Index</span>
                      <div className="my-4">
                        <span className="text-3xl font-extrabold text-red-500">
                          {(activeScan.weightedPainIndex || 0).toFixed(1)}
                        </span>
                        <span className="text-xs text-zinc-500 block mt-1">Struggles / Bugs / Complaints</span>
                      </div>
                      <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-1.5 rounded-full bg-red-600"
                          style={{ width: `${(activeScan.weightedPainIndex || 0) * 10}%` }}
                        />
                      </div>
                    </div>

                    {/* Demand Velocity */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-5 flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-red-800/5 rounded-full blur-xl" />
                      <span className="text-sm font-semibold text-zinc-500 block mb-2">Demand Velocity</span>
                      <div className="my-4">
                        <span className="text-3xl font-extrabold text-zinc-900">
                          {(activeScan.weightedDemandVelocity || 0).toFixed(1)}
                        </span>
                        <span className="text-xs text-zinc-500 block mt-1">Feature Requests / Questions</span>
                      </div>
                      <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-1.5 rounded-full bg-white"
                          style={{ width: `${(activeScan.weightedDemandVelocity || 0) * 10}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Executive Summary Output */}
                  {summaryData && (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 backdrop-blur-md space-y-6">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-2">Executive Summary</h3>
                        <p className="text-sm leading-relaxed text-zinc-800">{summaryData.executiveSummary}</p>
                      </div>

                      <hr className="border-zinc-200" />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Pain Signals */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest">Core Pain Signals</h4>
                          <ul className="space-y-2">
                            {summaryData.topPainSignals?.map((sig: string, idx: number) => (
                              <li key={idx} className="text-sm text-zinc-700 flex items-start gap-2">
                                <span className="text-red-500 mt-1 shrink-0">•</span>
                                <span>{sig}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Demand Signals */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-white uppercase tracking-widest">Core Demand Signals</h4>
                          <ul className="space-y-2">
                            {summaryData.topDemandSignals?.map((sig: string, idx: number) => (
                              <li key={idx} className="text-sm text-zinc-700 flex items-start gap-2">
                                <span className="text-red-500 mt-1 shrink-0">•</span>
                                <span>{sig}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {summaryData.competitorGap && (
                        <>
                          <hr className="border-zinc-200" />
                          <div>
                            <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-2">Product Gap Opportunity</h4>
                            <p className="text-sm text-zinc-700 leading-relaxed">{summaryData.competitorGap}</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Cache & Engine stats */}
                  <div className="flex flex-wrap gap-4 items-center justify-between text-xs text-zinc-500 border border-zinc-200 rounded-xl px-4 py-2.5 bg-white">
                    <span className="flex items-center gap-1">
                      <Database className="h-3.5 w-3.5" />
                      Semantic Cache Hit Rate: <strong>{Math.round((activeScan.cacheHitRate || 0) * 100)}%</strong>
                    </span>
                    <span>Llama 3 Conflict Critique Loop Invocations: <strong>{activeScan.criticInvocations || 0}</strong></span>
                  </div>

                  {/* Themes distribution */}
                  {activeScan.themes && activeScan.themes.length > 0 && (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                      <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Themes Distribution</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {activeScan.themes.map((theme: any) => {
                          const total = activeScan.themes.reduce((sum: number, t: any) => sum + t.commentCount, 0);
                          const percent = total > 0 ? (theme.commentCount / total) * 100 : 0;
                          return (
                            <div key={theme.id} className="p-4 rounded-xl border border-zinc-200 bg-zinc-50">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-bold text-zinc-800">{theme.themeKey}</span>
                                <span className="text-xs text-zinc-500">{theme.commentCount} ({Math.round(percent)}%)</span>
                              </div>
                              <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden mb-2">
                                <div 
                                  className={`h-1.5 rounded-full ${
                                    theme.themeKey === "BUG" || theme.themeKey === "COMPLAINT"
                                      ? "bg-red-650"
                                      : theme.themeKey === "FEATURE" || theme.themeKey === "QUESTION"
                                        ? "bg-white"
                                        : "bg-zinc-650"
                                  }`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-zinc-500">Avg Sentiment: {theme.avgSentiment.toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Audience & Health */}
              {activeTab === "audience" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Health Score */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 flex flex-col justify-center">
                      <span className="text-sm font-semibold text-zinc-500 block mb-2">Audience Health Index</span>
                      <div className="text-5xl font-extrabold text-red-500 my-2">
                        {activeScan.audienceHealthScore?.toFixed(0) ?? "—"}
                        <span className="text-lg text-zinc-500 font-medium">/100</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-2">
                        Derived from returning viewer loyalty signal and doer actions index.
                      </p>
                    </div>

                    {/* Skill Breakdown */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 col-span-2 space-y-4">
                      <span className="text-sm font-semibold text-zinc-500 block">Audience Skill Breakdown</span>
                      {(() => {
                        const skillData = activeScan.skillBreakdown && typeof activeScan.skillBreakdown === "string"
                          ? JSON.parse(activeScan.skillBreakdown)
                          : activeScan.skillBreakdown || { beginner: 0, mid: 0, expert: 0 };
                        
                        const total = (skillData.beginner || 0) + (skillData.mid || 0) + (skillData.expert || 0) || 100;
                        const begPct = Math.round(((skillData.beginner || 0) / total) * 100);
                        const midPct = Math.round(((skillData.mid || 0) / total) * 100);
                        const expPct = Math.round(((skillData.expert || 0) / total) * 100);

                        return (
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-xs font-semibold mb-1">
                                <span className="text-zinc-700">Beginner / Learner</span>
                                <span className="text-white">{begPct}%</span>
                              </div>
                              <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                                <div className="bg-red-650 h-2 rounded-full" style={{ width: `${begPct}%` }} />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs font-semibold mb-1">
                                <span className="text-zinc-700">Mid-level Practitioner</span>
                                <span className="text-white">{midPct}%</span>
                              </div>
                              <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                                <div className="bg-white h-2 rounded-full" style={{ width: `${midPct}%` }} />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs font-semibold mb-1">
                                <span className="text-zinc-700">Expert / Creator</span>
                                <span className="text-white">{expPct}%</span>
                              </div>
                              <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                                <div className="bg-red-950 h-2 rounded-full" style={{ width: `${expPct}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Personas list */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Identified Audience Personas</h3>
                    {(() => {
                      const personas = summaryData?.personas || [];
                      if (personas.length === 0) {
                        return <p className="text-sm text-zinc-500">No detailed persona segmentations in this report tier.</p>;
                      }
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {personas.map((p: any, idx: number) => (
                            <div key={idx} className="p-5 rounded-2xl border border-zinc-200 bg-white hover:border-red-100 transition-all">
                              <div className="flex justify-between items-start mb-3">
                                <h4 className="font-bold text-zinc-900 text-base">{p.name}</h4>
                                <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-100">
                                  {p.percentage}% representation
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-zinc-500">
                                <div>
                                  <span className="text-zinc-600 block uppercase font-bold text-[9px] tracking-wider">Skill Level</span>
                                  <span className="text-zinc-800">{p.skillSignal || "—"}</span>
                                </div>
                                <div>
                                  <span className="text-zinc-600 block uppercase font-bold text-[9px] tracking-wider">Motivation</span>
                                  <span className="text-zinc-800">{p.motivationSignal || "—"}</span>
                                </div>
                                <div>
                                  <span className="text-zinc-600 block uppercase font-bold text-[9px] tracking-wider">Context</span>
                                  <span className="text-zinc-800">{p.contextSignal || "—"}</span>
                                </div>
                                <div>
                                  <span className="text-zinc-600 block uppercase font-bold text-[9px] tracking-wider">Outcome</span>
                                  <span className="text-zinc-800">{p.outcomeSignal || "—"}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Tab 3: Growth & Leads */}
              {activeTab === "leads" && (
                <div className="space-y-6">
                  {/* Leads stream & inline responder */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">High-Intent Leads ({activeScan.leadCount || 0} detected)</h3>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Growth Engine Active</span>
                    </div>

                    {/* Inline drafting console if active */}
                    {draftingCommentId && (
                      <div className="p-4 rounded-xl border border-red-200 bg-red-50/50 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-red-500 flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 fill-current" />
                            Drafting AI Reply Recommendation
                          </span>
                          <Button
                            onClick={() => setDraftingCommentId(null)}
                            variant="ghost"
                            className="text-xs text-zinc-500 hover:text-white"
                          >
                            Cancel
                          </Button>
                        </div>
                        <textarea
                          value={replyDraftText}
                          onChange={(e) => setReplyDraftText(e.target.value)}
                          className="w-full text-xs text-zinc-800 bg-zinc-100 rounded-lg border border-zinc-200 p-2.5 focus:border-red-500 outline-none h-20 resize-y"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => handleCopyText(replyDraftText, draftingCommentId)}
                            variant="danger"
                            className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg"
                          >
                            {copiedId === draftingCommentId ? (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copy Draft to Clipboard</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {(() => {
                      const topLeads = activeScan.topLeads && typeof activeScan.topLeads === "string"
                        ? JSON.parse(activeScan.topLeads)
                        : activeScan.topLeads || [];
                      
                      if (topLeads.length === 0) {
                        return (
                          <div className="p-8 rounded-2xl border border-zinc-200 bg-zinc-50 text-center text-zinc-500 text-sm">
                            No high-intent product buying signals extracted on this report yet.
                          </div>
                        );
                      }
                      
                      return (
                        <div className="space-y-3">
                          {topLeads.map((lead: any, idx: number) => (
                            <div key={idx} className="p-4 rounded-xl border border-zinc-200 bg-white flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-500/10 border border-red-100 px-2 py-0.5 rounded">
                                    {lead.buyingSignal || "Buying Intent"}
                                  </span>
                                  <span className="text-xs text-zinc-700 font-bold">{lead.authorName}</span>
                                </div>
                                <p className="text-sm text-zinc-800">&quot;{lead.rawText}&quot;</p>
                              </div>
                              <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 gap-2">
                                <span className="text-xs text-zinc-500">Conv Prob: <strong>{(Number(lead.conversionProb || lead.pc) * 100).toFixed(0)}%</strong></span>
                                <Button
                                  onClick={() => handleDraftReply({ id: lead.commentId || idx.toString(), authorName: lead.authorName, rawText: lead.rawText, category: "FEATURE" })}
                                  variant="ghost"
                                  className="text-[10px] font-bold border border-zinc-200 hover:border-red-200 bg-zinc-50 hover:bg-red-50/50 px-2.5 py-1 rounded"
                                >
                                  Draft Reply
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  <hr className="border-zinc-200" />

                  {/* Objections Mapping & Social Proof */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Objection Map */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Objection Map</h4>
                      {(() => {
                        const objectionMap = activeScan.objectionMap && typeof activeScan.objectionMap === "string"
                          ? JSON.parse(activeScan.objectionMap)
                          : activeScan.objectionMap || [];
                        
                        if (objectionMap.length === 0) {
                          return <p className="text-xs text-zinc-500">No buyer hesitation structures identified.</p>;
                        }

                        return (
                          <div className="space-y-2">
                            {objectionMap.map((o: any, idx: number) => (
                              <div key={idx} className="p-4 rounded-xl border border-zinc-200 bg-white">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-bold text-red-500 uppercase tracking-widest">{o.archetype}</span>
                                  <span className="text-[10px] text-zinc-500">Objection Score: {Number(o.obScore || 0).toFixed(1)}/10</span>
                                </div>
                                <p className="text-xs text-zinc-600">{o.strategy}</p>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Proof Library */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Social Proof Harvested ({activeScan.gradeACount || 0} Grade A)</h4>
                      {(() => {
                        const proofLibrary = activeScan.proofLibrary && typeof activeScan.proofLibrary === "string"
                          ? JSON.parse(activeScan.proofLibrary)
                          : activeScan.proofLibrary || [];
                        
                        if (proofLibrary.length === 0) {
                          return <p className="text-xs text-zinc-500">No reviews, recommendations, or testimonial matches harvested.</p>;
                        }

                        return (
                          <div className="space-y-2">
                            {proofLibrary.slice(0, 4).map((p: any, idx: number) => (
                              <div key={idx} className="p-4 rounded-xl border border-zinc-200 bg-white">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-bold text-white">Grade {p.testimonialGrade || "A"} Testimonial</span>
                                  <span className="text-[10px] text-zinc-500">Score: {Number(p.testimonialScore || 0).toFixed(2)}</span>
                                </div>
                                <p className="text-xs text-zinc-600 truncate">&quot;{p.rawText}&quot;</p>
                                <span className="text-[9px] text-zinc-600 block text-right mt-1">— {p.authorName}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Content Intel */}
              {activeTab === "content" && (
                <div className="space-y-6">
                  {/* Performance stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 rounded-2xl border border-zinc-200 bg-white">
                      <span className="text-xs text-zinc-500 uppercase tracking-wider block font-semibold mb-1">Content Effectiveness</span>
                      <span className="text-3xl font-extrabold text-zinc-900">{activeScan.contentEffectivenessScore?.toFixed(1) ?? "—"}</span>
                      <div className="grid grid-cols-2 gap-4 mt-4 text-xs text-zinc-500 border-t border-zinc-200 pt-3">
                        <div>
                          <span className="text-zinc-600 block text-[9px] uppercase font-bold tracking-wider">Transformation Score</span>
                          <span className="text-zinc-800">{activeScan.transformationScore?.toFixed(1) ?? "—"}%</span>
                        </div>
                        <div>
                          <span className="text-zinc-600 block text-[9px] uppercase font-bold tracking-wider">Dominant Transition</span>
                          <span className="text-zinc-800">{activeScan.dominantTransition ?? "—"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl border border-zinc-200 bg-white flex flex-col justify-between">
                      <div>
                        <span className="text-xs text-zinc-500 uppercase tracking-wider block font-semibold mb-1">Viral Potential Signal</span>
                        <span className="text-xl font-bold text-red-500 uppercase block mt-1">{activeScan.viralPotentialSignal || "MODERATE"}</span>
                      </div>
                      <div className="text-xs text-zinc-500 mt-2">
                        Engagement Consensus Score: <strong>{activeScan.threadEngagementScore?.toFixed(2) ?? "—"}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Content Gaps list */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Detected Content Gaps</h4>
                    {(() => {
                      const contentGaps = activeScan.contentGaps && typeof activeScan.contentGaps === "string"
                        ? JSON.parse(activeScan.contentGaps)
                        : activeScan.contentGaps || [];
                      
                      if (contentGaps.length === 0) {
                        return <p className="text-xs text-zinc-500">No content gaps extracted.</p>;
                      }

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {contentGaps.slice(0, 6).map((g: any, idx: number) => (
                            <div key={idx} className="p-3 rounded-xl border border-zinc-200 bg-white flex justify-between items-center text-xs">
                              <span className="text-zinc-700 truncate pr-3">{g.topic}</span>
                              <span className="text-[10px] text-red-500 bg-red-500/10 border border-red-100 px-2 py-0.5 rounded font-bold shrink-0">
                                Gap Score: {Number(g.gapScore || 0).toFixed(1)}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Viral Title suggestions */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Suggested Viral Hooks & Title Predictions</h4>
                    {(() => {
                      const viralHook = activeScan.viralHookPrediction && typeof activeScan.viralHookPrediction === "string"
                        ? JSON.parse(activeScan.viralHookPrediction)
                        : activeScan.viralHookPrediction || null;
                      
                      if (!viralHook || !viralHook.titles || viralHook.titles.length === 0) {
                        return <p className="text-xs text-zinc-500">Upgrade to Growth/Agency tier to generate viral hooks recommendations.</p>;
                      }

                      return (
                        <div className="space-y-2">
                          {viralHook.titles.map((t: any, idx: number) => (
                            <div key={idx} className="p-4 rounded-xl border border-zinc-200 bg-white flex justify-between items-center gap-4">
                              <p className="text-sm font-bold text-zinc-900">&quot;{t.title}&quot;</p>
                              <span className="text-xs text-red-500 font-bold tracking-wider shrink-0 bg-red-500/10 border border-red-100 px-2.5 py-1 rounded">
                                Predicted EM: ×{Number(t.predictedEM || 1.0).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Tab 5: Competitor Radar */}
              {activeTab === "competitors" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Competitor Brand Radar</h3>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Growth Radar Active</span>
                  </div>

                  {(() => {
                    const competitorRadar = activeScan.competitorRadar && typeof activeScan.competitorRadar === "string"
                      ? JSON.parse(activeScan.competitorRadar)
                      : activeScan.competitorRadar || [];
                    
                    if (competitorRadar.length === 0) {
                      return (
                        <div className="p-8 rounded-2xl border border-zinc-200 bg-zinc-50 text-center text-zinc-500 text-sm">
                          No competitor brand comparison mentions extracted on this scan yet.
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {competitorRadar.map((radar: any, idx: number) => (
                          <div key={idx} className="p-5 rounded-2xl border border-zinc-200 bg-white space-y-3">
                            <div className="flex justify-between items-center">
                              <h4 className="font-bold text-base text-red-500 uppercase tracking-wider">{radar.entity}</h4>
                              <div className="flex gap-2">
                                <span className="text-xs text-zinc-500 bg-zinc-900 border border-zinc-200 px-2 py-0.5 rounded">
                                  Mentions: {radar.mentions}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                                  (radar.netSentiment || 0) > 0.05 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/15'
                                }`}>
                                  Net Sentiment: {Number(radar.netSentiment || 0).toFixed(2)}
                                </span>
                              </div>
                            </div>

                            {radar.topDefectors && radar.topDefectors.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Defector comment quotes:</span>
                                <ul className="space-y-1.5 pl-3 list-disc text-xs text-zinc-600">
                                  {radar.topDefectors.map((quote: string, i: number) => (
                                    <li key={i}>&quot;{quote}&quot;</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Tab 6: Comments Stream */}
              {activeTab === "comments" && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Comment Analysis Stream</h3>
                    
                    {/* Filters */}
                    <div className="flex flex-wrap gap-2">
                      {["ALL", "BUG", "FEATURE", "COMPLAINT", "QUESTION", "PRAISE"].map((f) => (
                        <Button
                          key={f}
                          onClick={() => setCommentFilter(f)}
                          variant="ghost"
                          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                            commentFilter === f
                              ? "border-red-500 bg-red-50 text-red-500"
                              : "border-zinc-200 hover:border-zinc-200 text-zinc-500"
                          }`}
                        >
                          {f}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Inline drafting console if active */}
                  {draftingCommentId && (
                    <div className="p-4 rounded-xl border border-red-200 bg-red-50/50 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-red-500 flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5 fill-current" />
                          Drafting AI Reply Recommendation
                        </span>
                        <Button
                          onClick={() => setDraftingCommentId(null)}
                          variant="ghost"
                          className="text-xs text-zinc-500 hover:text-white"
                        >
                          Cancel
                        </Button>
                      </div>
                      <textarea
                        value={replyDraftText}
                        onChange={(e) => setReplyDraftText(e.target.value)}
                        className="w-full text-xs text-zinc-800 bg-zinc-100 rounded-lg border border-zinc-200 p-2.5 focus:border-red-500 outline-none h-20 resize-y"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => handleCopyText(replyDraftText, draftingCommentId)}
                          variant="danger"
                          className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg"
                        >
                          {copiedId === draftingCommentId ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Copy Draft to Clipboard</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 max-h-100 overflow-y-auto pr-2">
                    {filteredComments.length === 0 ? (
                      <p className="text-center py-6 text-sm text-zinc-500">No comments match the selected category.</p>
                    ) : (
                      filteredComments.map((c: any) => (
                        <div 
                          key={c.id} 
                          className="p-4 rounded-xl border border-zinc-200 bg-white flex flex-col gap-2 transition-all hover:bg-zinc-50"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-600">{c.authorName}</span>
                            <div className="flex gap-2 items-center">
                              <span 
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  c.category === "BUG" || c.category === "COMPLAINT"
                                    ? "bg-red-500/10 text-red-400 border border-red-100"
                                    : c.category === "FEATURE" || c.category === "QUESTION"
                                      ? "bg-white/10 text-white border border-zinc-200"
                                      : "bg-zinc-500/10 text-zinc-500 border border-zinc-200"
                                }`}
                              >
                                {c.category}
                              </span>
                              <span className="text-[10px] text-zinc-500">likes: {c.likeCount}</span>
                              {c.fromCache && (
                                <span className="text-[10px] text-red-450 bg-red-50 px-1.5 rounded font-medium border border-red-500/15">
                                  Cached
                                </span>
                              )}
                              <Button
                                onClick={() => handleDraftReply(c)}
                                variant="ghost"
                                className="text-[9px] font-bold text-zinc-500 hover:text-white border border-zinc-200 hover:border-zinc-200 bg-zinc-50 px-1.5 py-0.5 rounded"
                              >
                                Draft Reply
                              </Button>
                            </div>
                          </div>
                          
                          <p className="text-sm text-zinc-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: c.rawText }} />
                          
                          {c.intent && (
                            <div className="text-[11px] text-zinc-500 flex gap-1">
                              <span className="font-semibold text-zinc-500">Intent:</span>
                              <span className="italic">&quot;{c.intent}&quot;</span>
                            </div>
                          )}
                          
                          <div className="flex justify-between items-center text-[10px] text-zinc-500 mt-1">
                            <span>Intensity: {c.intensity}/10 | Sentiment: {(c.sentiment || 0).toFixed(2)}</span>
                            <span>Weight: {(c.effectiveWeight || 1.0).toFixed(2)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Empty State */}
          {!activeScan && !scanLoading && (
            <div className="rounded-2xl border border-dashed border-zinc-200 p-16 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-50 text-zinc-600 border border-zinc-200">
                <Database className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-md font-bold text-zinc-900">No Scan Selected</h3>
                <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                  Type a YouTube link above or click on one of your previous scans to load the audience insights dashboard.
                </p>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
