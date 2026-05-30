"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "../../../context/Store";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";
import { 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  ShieldAlert, 
  Save, 
  RefreshCw,
  Loader2,
  FileCheck
} from "lucide-react";
import { api } from "../../../lib/api";

interface ExtractedField {
  id: number;
  field_name: string;
  field_value: string;
  original_value: string;
  confidence: number;
  bounding_box: { bbox: number[] };
  is_corrected: boolean;
}

interface ValidationResult {
  is_valid: boolean;
  validation_errors: { code: string; message: string }[] | null;
}

interface AIInsight {
  summary: string;
  risk_level: string;
  delay_risk_explanation: string;
  recommendations: string[];
}

interface DocumentDetail {
  id: number;
  filename: string;
  status: string;
  mime_type: string;
  file_path?: string | null;
  ocr_results: { raw_text: string; avg_confidence: number }[];
  extracted_fields: ExtractedField[];
  validation_results: ValidationResult[];
  ai_insights: AIInsight[];
}

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isInitialized, initializeAuth } = useStore();
  
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editedFields, setEditedFields] = useState<Record<number, string>>({});
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!isInitialized) initializeAuth();
  }, [isInitialized, initializeAuth]);

  const loadDocumentDetail = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDocument(Number(params.id));
      setDoc(data);
      
      // Initialize edited fields map
      const initialMap: Record<number, string> = {};
      data.extracted_fields.forEach((f: ExtractedField) => {
        initialMap[f.id] = f.field_value || "";
      });
      setEditedFields(initialMap);
    } catch (e) {
      router.push("/documents");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.push("/login");
    } else if (isAuthenticated) {
      loadDocumentDetail();
    }
  }, [isInitialized, isAuthenticated, params.id]);

  const handleFieldChange = (fieldId: number, value: string) => {
    setEditedFields(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSaveCorrections = async () => {
    if (!doc) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Find what fields actually changed
      const corrections = doc.extracted_fields
        .filter(f => editedFields[f.id] !== f.field_value)
        .map(f => ({
          field_id: f.id,
          corrected_value: editedFields[f.id]
        }));

      if (corrections.length > 0) {
        await api.correctFields(doc.id, corrections);
        setSaveSuccess(true);
        // Reload details to capture re-validation anomalies and re-indexed vector state
        await loadDocumentDetail();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e: any) {
      alert(e.message || "Failed to commit corrections.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatFieldName = (name: string) => {
    return name
      .replace("_", " ")
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  if (!isInitialized || !isAuthenticated || isLoading || !doc) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  // Resolve validation checks
  const valResult = doc.validation_results[0] || { is_valid: true, validation_errors: null };
  const aiInsight = doc.ai_insights[0] || { summary: "", risk_level: "low", delay_risk_explanation: "", recommendations: [] };

  return (
    <div className="flex-1 flex bg-slate-950">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto z-10">
        <Header />
        
        <main className="flex-1 p-8 space-y-6 max-w-7xl mx-auto w-full">
          
          {/* Header Action Backlink */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/documents")}
              className="w-9 h-9 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                {doc.filename}
                <span className={`px-2.5 py-0.5 rounded-lg border text-[9px] font-extrabold uppercase ${
                  valResult.is_valid 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                    : "bg-red-500/10 border-red-500/20 text-red-400"
                }`}>
                  {valResult.is_valid ? "Audit Validated" : "Anomaly Flagged"}
                </span>
              </h2>
              <span className="text-[10px] text-slate-500 font-mono">
                Document SHA Integrity Index: {doc.filename.split(".")[0]}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Side: Mock Interactive Visual Document Canvas */}
            <div className="lg:col-span-7 space-y-6">
              <div className="rounded-3xl border border-white/5 bg-slate-900/10 backdrop-blur-xl shadow-2xl overflow-hidden glass-panel">
                <div className="h-12 border-b border-white/5 bg-white/5 px-6 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    OCR Interactive Layout Canvas
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Hover boxes to highlight bounding coordinates
                  </span>
                </div>
                
                {/* Visual Document Layout Container */}
                <div className="p-8 bg-slate-900/60 flex items-center justify-center">
                  {(() => {
                    const isCloudinary = doc.file_path && doc.file_path.startsWith("http");
                    // Point relative paths to local backend stream
                    const imageUrl = isCloudinary 
                      ? doc.file_path 
                      : doc.file_path 
                      ? `http://localhost:8000${doc.file_path}` 
                      : null;

                    return (
                      <div 
                        className="w-[500px] h-[650px] bg-slate-950 border border-white/10 rounded-2xl relative overflow-hidden shadow-inner select-none bg-contain bg-no-repeat bg-center"
                        style={{
                          backgroundImage: imageUrl ? `url(${imageUrl})` : "none"
                        }}
                      >
                        {/* Background layout watermark if no image is present */}
                        {!imageUrl && (
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none uppercase font-extrabold text-4xl text-white tracking-widest text-center select-none rotate-12 leading-loose">
                            Aetheria Cargo<br/>Ledger System
                          </div>
                        )}

                    {/* Header line */}
                    <div className="border-b border-white/5 pb-4 mb-6">
                      <div className="h-3 w-32 bg-white/10 rounded mb-2" />
                      <div className="h-6 w-56 bg-white/20 rounded" />
                    </div>

                    {/* Layout panels */}
                    <div className="grid grid-cols-2 gap-6 mb-8">
                      <div className="space-y-2">
                        <div className="h-2 w-16 bg-white/5 rounded" />
                        <div className="h-4 w-36 bg-white/10 rounded" />
                        <div className="h-3 w-44 bg-white/5 rounded" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 w-16 bg-white/5 rounded" />
                        <div className="h-4 w-36 bg-white/10 rounded" />
                        <div className="h-3 w-44 bg-white/5 rounded" />
                      </div>
                    </div>

                    <div className="space-y-4 mb-8">
                      <div className="h-2 w-28 bg-white/5 rounded" />
                      <div className="h-8 w-full bg-white/5 rounded" />
                      <div className="h-8 w-full bg-white/5 rounded" />
                    </div>

                    {/* Absolute positioned overlay bounding box highlighting mapped from API */}
                    {doc.extracted_fields.map((field) => {
                      const box = field.bounding_box?.bbox || [100, 100, 400, 200];
                      // Bounding box scaled out of 1000 coordinate scale down to fit 500x650px canvas
                      const left = (box[0] / 1000) * 440; // Max canvas boundary width padded
                      const top = (box[1] / 1000) * 580;
                      const width = ((box[2] - box[0]) / 1000) * 440;
                      const height = ((box[3] - box[2]) / 1000) * 580;

                      const isSelected = selectedFieldId === field.id;

                      return (
                        <div
                          key={field.id}
                          className={`absolute ocr-bounding-box rounded border-dashed flex items-center justify-center group/box ${
                            isSelected ? "selected" : ""
                          }`}
                          style={{
                            left: `${left + 24}px`, // Padded
                            top: `${top + 24}px`,
                            width: `${Math.max(50, width)}px`,
                            height: `${Math.max(22, height)}px`
                          }}
                          onClick={() => setSelectedFieldId(field.id)}
                        >
                          {/* Coordinates tooltip */}
                          <div className="absolute bottom-full mb-1 px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-lg shadow-2xl opacity-0 group-hover/box:opacity-100 pointer-events-none transition-opacity duration-150 z-50 text-[10px] text-white whitespace-nowrap">
                            <span className="font-bold text-blue-400 uppercase mr-1.5">
                              {formatFieldName(field.field_name)}
                            </span>
                            <span className="font-mono text-slate-400">
                              {(field.confidence * 100).toFixed(0)}% Conf
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Bottom layout metadata */}
                    <div className="absolute bottom-6 left-6 right-6 border-t border-white/5 pt-4 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                      <span>DOC-ID: {doc.id}</span>
                      <span>STATUS: completed</span>
                    </div>

                  </div>
                );
              })()}
            </div>
          </div>
        </div>

            {/* Right Side: Metadata Corrections Editor & AI Insights */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Manual corrections form fields */}
              <div className="p-6 rounded-3xl border border-white/5 bg-white/5 glass-panel space-y-5">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Metadata Verification
                  </h3>
                  
                  <button
                    onClick={handleSaveCorrections}
                    disabled={isSaving}
                    className="px-3.5 py-1.5 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 rounded-lg flex items-center gap-1 transition-all cursor-pointer select-none"
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : saveSuccess ? (
                      <>
                        <FileCheck size={12} className="text-emerald-400" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save size={12} />
                        Commit Overwrites
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  {doc.extracted_fields.map((field) => {
                    const isSelected = selectedFieldId === field.id;
                    const hasChanged = editedFields[field.id] !== field.field_value;

                    return (
                      <div 
                        key={field.id}
                        onClick={() => setSelectedFieldId(field.id)}
                        className={`p-3 rounded-xl border transition-all ${
                          isSelected 
                            ? "bg-blue-500/5 border-blue-500/25 ring-1 ring-blue-500/10" 
                            : "bg-white/5 border-white/5 hover:border-white/10"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            {formatFieldName(field.field_name)}
                            {field.is_corrected && (
                              <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold select-none uppercase">
                                Corrected
                              </span>
                            )}
                            {hasChanged && (
                              <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-bold select-none uppercase animate-pulse">
                                Edited
                              </span>
                            )}
                          </label>
                          <span className={`text-[10px] font-mono ${
                            field.confidence > 0.85 
                              ? "text-emerald-400" 
                              : field.confidence > 0.70 
                              ? "text-amber-400" 
                              : "text-red-400 font-bold"
                          }`}>
                            {(field.confidence * 100).toFixed(0)}% Accuracy
                          </span>
                        </div>

                        <input
                          type="text"
                          value={editedFields[field.id] || ""}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          className="w-full mt-1.5 bg-slate-950/60 border border-white/5 focus:border-blue-500/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-all"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Anomaly Insights Card */}
              <div className="p-6 rounded-3xl border border-white/5 bg-white/5 glass-panel space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <Info size={16} className="text-purple-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    AI Logistics Intelligence
                  </h3>
                  
                  {/* Risk Badge */}
                  <span className={`ml-auto px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border ${
                    aiInsight.risk_level === "critical" || aiInsight.risk_level === "high"
                      ? "bg-red-500/10 border-red-500/20 text-red-400 animate-pulse"
                      : aiInsight.risk_level === "medium"
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  }`}>
                    {aiInsight.risk_level} RISK
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Summary */}
                  <div>
                    <h5 className="font-semibold text-slate-400">Executive Summary</h5>
                    <p className="text-white mt-1 leading-relaxed leading-5">
                      {aiInsight.summary || "No executive summary parsed."}
                    </p>
                  </div>

                  {/* Delay explanation */}
                  {aiInsight.delay_risk_explanation && (
                    <div className="p-3 rounded-xl border border-red-500/10 bg-red-500/5 text-red-400">
                      <h5 className="font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                        <ShieldAlert size={12} /> Delay Risk Assessment
                      </h5>
                      <p className="text-[10px] mt-1 leading-relaxed">
                        {aiInsight.delay_risk_explanation}
                      </p>
                    </div>
                  )}

                  {/* Recommendations checklists */}
                  {aiInsight.recommendations && aiInsight.recommendations.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-slate-400 mb-2">Automated Guidelines Checklist</h5>
                      <ul className="space-y-1.5">
                        {aiInsight.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-[10px] text-slate-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Validation errors alerts */}
                  {valResult.validation_errors && valResult.validation_errors.length > 0 && (
                    <div className="p-3.5 rounded-xl border border-amber-500/10 bg-amber-500/5 text-amber-400 space-y-1.5">
                      <h5 className="font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                        <AlertTriangle size={12} /> Business Validation Alerts
                      </h5>
                      {valResult.validation_errors.map((err, idx) => (
                        <div key={idx} className="text-[10px] leading-relaxed flex items-start gap-1">
                          <span className="font-bold shrink-0">[{err.code.replace("_", " ")}]</span>
                          <span>{err.message}</span>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </div>

            </div>

          </div>

        </main>
      </div>
    </div>
  );
}
