"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "../../context/Store";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { 
  Search, 
  FileText, 
  ArrowRight,
  Sparkles,
  Loader2,
  ListFilter
} from "lucide-react";
import { api } from "../../lib/api";

interface SearchMatch {
  document_id: number;
  filename: string;
  mime_type: string;
  similarity_score: number;
  matched_text_snippet: string;
  status: string;
  created_at: string;
}

export default function SearchPage() {
  const router = useRouter();
  const { isAuthenticated, isInitialized, initializeAuth } = useStore();
  
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!isInitialized) initializeAuth();
  }, [isInitialized, initializeAuth]);

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.push("/login");
    }
  }, [isInitialized, isAuthenticated, router]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      const data = await api.semanticSearch(query);
      setMatches(data.matches);
    } catch (e) {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  };

  if (!isInitialized || !isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-slate-950">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto z-10">
        <Header />
        
        <main className="flex-1 p-8 space-y-8 max-w-5xl mx-auto w-full">
          
          <div className="text-center space-y-2 max-w-2xl mx-auto mb-10">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
              <Sparkles size={24} />
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Cognitive Vector Search Center
            </h2>
            <p className="text-xs text-slate-400">
              Query your complete shipping registry, invoices, waybills, and customs declarations using natural language semantic matching.
            </p>
          </div>

          {/* Large search input */}
          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto relative flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-5 top-4 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Ask e.g. 'Show me electronics shipments from Eastern Logistics under 16 tons'..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-13 pr-4 py-4 bg-white/5 border border-white/10 hover:border-white/15 focus:border-blue-500/50 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none transition-all shadow-xl"
              />
            </div>
            <button 
              type="submit"
              disabled={isLoading}
              className="px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-blue-500/10 flex items-center justify-center gap-1 transition-all cursor-pointer select-none shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Search"
              )}
            </button>
          </form>

          {/* Semantic match results index */}
          <div className="max-w-3xl mx-auto space-y-6">
            {isLoading ? (
              <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                  Vectorizing query & querying Qdrant index...
                </span>
              </div>
            ) : hasSearched && matches.length === 0 ? (
              <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <Search size={32} className="text-slate-600/80 bg-white/5 p-2 rounded-xl" />
                <span className="text-xs">No semantic matches found for this query. Try adjusting keywords.</span>
              </div>
            ) : (
              matches.map((match) => (
                <div 
                  key={match.document_id}
                  className="p-6 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/[0.07] transition-all duration-200 glass-panel flex flex-col sm:flex-row items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                    <FileText size={20} />
                  </div>
                  
                  <div className="flex-1 space-y-2 overflow-hidden">
                    <div className="flex justify-between items-center gap-3">
                      <h4 className="font-extrabold text-sm text-white truncate max-w-[200px] sm:max-w-md">
                        {match.filename}
                      </h4>
                      {/* Similarity score badge */}
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                        match.similarity_score > 0.85 
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                          : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                      }`}>
                        {(match.similarity_score * 100).toFixed(0)}% MATCH
                      </span>
                    </div>

                    {/* Matched citation snippet */}
                    <div className="p-3.5 rounded-xl border border-white/5 bg-slate-950/40 text-xs text-slate-300 leading-relaxed font-mono">
                      <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block mb-1.5 font-sans select-none">
                        Retrieved Citation:
                      </span>
                      &ldquo;{match.matched_text_snippet}&rdquo;
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                      <span>DOC ID: {match.document_id}</span>
                      <span>INGEST: {new Date(match.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push(`/documents/${match.document_id}`)}
                    className="w-10 h-10 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer self-center"
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
