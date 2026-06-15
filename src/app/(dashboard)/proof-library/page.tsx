import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLatestScansForUser } from "@/lib/dashboard/scan-data";
import { Star, Award, Quote } from "lucide-react";

export default async function ProofLibraryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const scans = await getLatestScansForUser(user.id, 1);
  const scan = scans[0];
  const proofLibrary =
    (scan?.proofLibrary as Array<Record<string, unknown>>) || [];

  const gradeACount = scan?.gradeACount ?? 0;
  const gradeBCount = scan?.gradeBCount ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-zinc-900 tracking-tight">
          <Star className="h-7 w-7 text-red-500" />
          Proof Library
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Harvested testimonials, reviews, and social proof from audience
          comments, graded by persuasion strength.
        </p>
      </div>

      {!scan ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-16 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-50 text-zinc-600 border border-zinc-200">
            <Star className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900">No Scan Data</h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            Run a scan first to harvest social proof.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-red-600/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-4 w-4 text-red-500" />
                <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                  Grade A Testimonials
                </span>
              </div>
              <span className="text-4xl font-extrabold text-red-500">
                {gradeACount}
              </span>
              <p className="text-[10px] text-zinc-500 mt-1">
                Strongest persuasion signals
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-zinc-500" />
                <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                  Grade B Testimonials
                </span>
              </div>
              <span className="text-4xl font-extrabold text-zinc-900">
                {gradeBCount}
              </span>
              <p className="text-[10px] text-zinc-500 mt-1">
                Good supporting evidence
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-2">
                <Quote className="h-4 w-4 text-zinc-500" />
                <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                  Total Harvested
                </span>
              </div>
              <span className="text-4xl font-extrabold text-zinc-900">
                {proofLibrary.length}
              </span>
              <p className="text-[10px] text-zinc-500 mt-1">
                Across all grades
              </p>
            </div>
          </div>

          {/* Proof Cards */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
              Testimonial Stream
            </h2>

            {proofLibrary.length === 0 ? (
              <div className="p-8 rounded-2xl border border-zinc-200 bg-zinc-50 text-center text-zinc-500 text-sm">
                No testimonials harvested on this scan.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {proofLibrary.map((p, i) => {
                  const grade = String(p.testimonialGrade || "B");
                  const isGradeA = grade === "A";
                  return (
                    <div
                      key={i}
                      className={`p-5 rounded-2xl border bg-white hover:border-red-100 transition-all relative overflow-hidden ${
                        isGradeA
                          ? "border-red-200"
                          : "border-zinc-200"
                      }`}
                    >
                      {isGradeA && (
                        <div className="absolute top-0 right-0 w-16 h-16 bg-red-600/10 rounded-full blur-xl pointer-events-none" />
                      )}
                      <div className="flex justify-between items-start mb-3">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                            isGradeA
                              ? "text-red-500 bg-red-500/10 border-red-100"
                              : "text-zinc-500 bg-zinc-800/40 border-zinc-200"
                          }`}
                        >
                          Grade {grade}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          Score:{" "}
                          {Number(p.testimonialScore || 0).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-800 leading-relaxed mb-2 italic">
                        &quot;{String(p.rawText)}&quot;
                      </p>
                      <span className="text-[10px] text-zinc-600 block text-right">
                        — {String(p.authorName)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
