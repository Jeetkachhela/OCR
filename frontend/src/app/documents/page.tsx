"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "../../context/Store";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { 
  UploadCloud, 
  Search, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ArrowRight,
  Plus,
  Loader2,
  ListFilter
} from "lucide-react";
import { api } from "../../lib/api";

interface DocumentItem {
  id: number;
  filename: string;
  mime_type: string;
  file_size: number;
  status: string;
  created_at: string;
}

export default function DocumentsPage() {
  const router = useRouter();
  const { isAuthenticated, isInitialized, initializeAuth } = useStore();
  
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [uploadQueue, setUploadQueue] = useState<{ name: string; status: "queued" | "processing" | "completed" | "failed"; error?: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isInitialized) initializeAuth();
  }, [isInitialized, initializeAuth]);

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.push("/login");
    } else if (isAuthenticated) {
      loadDocuments();
    }
  }, [isInitialized, isAuthenticated, router]);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const docs = await api.getDocuments(statusFilter || undefined, searchQuery || undefined);
      setDocuments(docs);
    } catch (e) {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  };

  // Re-load when filter changes or search query updates
  useEffect(() => {
    if (isAuthenticated) {
      loadDocuments();
    }
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadDocuments();
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Add to queue
    const newItems = Array.from(files).map(f => ({
      name: f.name,
      status: "queued" as const
    }));
    setUploadQueue(prev => [...prev, ...newItems]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Mark as processing
      setUploadQueue(prev => prev.map(item => item.name === file.name ? { ...item, status: "processing" } : item));

      try {
        await api.uploadDocument(file);
        // Mark as completed
        setUploadQueue(prev => prev.map(item => item.name === file.name ? { ...item, status: "completed" } : item));
      } catch (e: any) {
        // Mark as failed
        setUploadQueue(prev => prev.map(item => item.name === file.name ? { ...item, status: "failed", error: e.message || "Failed to parse" } : item));
      }
    }
    
    // Refresh document index
    loadDocuments();
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
        
        <main className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full">
          
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Ingestion & Processing Hub
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Drag-and-drop bulk uploader and active operational document ledger.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Upload Zone Panel */}
            <div className="lg:col-span-1 space-y-6">
              <div 
                className="p-8 rounded-3xl border-2 border-dashed border-white/10 hover:border-blue-500/30 bg-white/5 hover:bg-white/[0.07] backdrop-blur-xl shadow-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 relative group"
                onClick={triggerFileSelect}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileUpload(e.dataTransfer.files);
                }}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={(e) => handleFileUpload(e.target.files)}
                  multiple
                  accept=".pdf,image/png,image/jpeg,image/jpg"
                  className="hidden"
                />
                
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <UploadCloud size={28} />
                </div>
                
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Drag & Drop Files
                </h4>
                <p className="text-[11px] text-slate-400 mt-2 max-w-xs leading-relaxed">
                  Support bulk uploads of PDFs, Waybills, Invoices, Packing lists, and Shipping labels up to 15MB.
                </p>
                <button className="mt-4 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer">
                  <Plus size={14} /> Select Documents
                </button>
              </div>

              {/* Uploading Queue timeline */}
              {uploadQueue.length > 0 && (
                <div className="p-6 rounded-2xl border border-white/5 bg-white/5 glass-panel space-y-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">
                    Ingestion Queue Tracker ({uploadQueue.filter(q => q.status !== "completed").length} active)
                  </h4>
                  
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {uploadQueue.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-white/5 bg-slate-900/40 flex items-center justify-between text-xs">
                        <div className="overflow-hidden pr-3">
                          <h5 className="font-semibold text-white truncate">{item.name}</h5>
                          {item.error ? (
                            <span className="text-[10px] text-red-400 mt-0.5 block truncate">{item.error}</span>
                          ) : (
                            <span className="text-[10px] text-slate-500 mt-0.5 block capitalize">{item.status}</span>
                          )}
                        </div>
                        
                        <div className="shrink-0">
                          {item.status === "queued" && <Clock className="text-slate-500 animate-pulse" size={16} />}
                          {item.status === "processing" && <Loader2 className="text-blue-500 animate-spin" size={16} />}
                          {item.status === "completed" && <CheckCircle2 className="text-emerald-500" size={16} />}
                          {item.status === "failed" && <AlertTriangle className="text-red-500" size={16} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Document Index Table */}
            <div className="lg:col-span-2 p-6 rounded-3xl border border-white/5 bg-white/5 glass-panel space-y-6">
              
              {/* Search & Filter Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md flex items-center gap-2 relative">
                  <Search className="absolute left-4 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search by filename..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/5 focus:border-blue-500/50 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none transition-all"
                  />
                  <button type="submit" className="hidden" />
                </form>

                <div className="flex items-center gap-2">
                  <ListFilter size={14} className="text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none transition-all"
                  >
                    <option value="" className="bg-slate-900">All Statuses</option>
                    <option value="completed" className="bg-slate-900">Completed</option>
                    <option value="processing" className="bg-slate-900">Processing</option>
                    <option value="failed" className="bg-slate-900">Failed</option>
                  </select>
                </div>
              </div>

              {/* Document table index */}
              {isLoading ? (
                <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                    Fetching Ledger Index...
                  </span>
                </div>
              ) : documents.length === 0 ? (
                <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                  <FileText size={36} className="text-slate-600/80 bg-white/5 p-2 rounded-xl" />
                  <span className="text-xs">No active documents found. Initiate uploads above.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-2">Document Reference</th>
                        <th className="py-3 px-2">Size</th>
                        <th className="py-3 px-2">Ingestion Status</th>
                        <th className="py-3 px-2">Processed At</th>
                        <th className="py-3 px-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {documents.map((doc) => {
                        const isSuccess = doc.status === "completed";
                        const isError = doc.status === "failed";
                        
                        return (
                          <tr key={doc.id} className="hover:bg-white/[0.03] transition-colors text-slate-300">
                            <td className="py-4 px-2">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                                  <FileText size={16} />
                                </div>
                                <div className="overflow-hidden">
                                  <span className="font-bold text-white block truncate max-w-[200px]" title={doc.filename}>
                                    {doc.filename}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                                    {doc.mime_type.split("/")[1]}
                                  </span>
                                </div>
                              </div>
                            </td>
                            
                            <td className="py-4 px-2 text-slate-400 font-medium">
                              {formatBytes(doc.file_size)}
                            </td>

                            <td className="py-4 px-2">
                              <span className={`px-2.5 py-0.5 rounded-lg border text-[10px] font-bold uppercase ${
                                isSuccess 
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                                  : isError 
                                  ? "bg-red-500/10 border-red-500/20 text-red-400" 
                                  : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                              }`}>
                                {doc.status}
                              </span>
                            </td>

                            <td className="py-4 px-2 text-slate-500 font-mono">
                              {new Date(doc.created_at).toLocaleDateString()} {new Date(doc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>

                            <td className="py-4 px-2 text-right">
                              <button
                                onClick={() => router.push(`/documents/${doc.id}`)}
                                className="px-3 py-1.5 text-[10px] font-bold text-slate-300 hover:text-white border border-white/5 hover:border-white/10 bg-white/5 hover:bg-white/10 rounded-lg flex items-center gap-1 ml-auto transition-colors cursor-pointer"
                              >
                                View Intelligence 
                                <ArrowRight size={10} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

          </div>

        </main>
      </div>
    </div>
  );
}
