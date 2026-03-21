import { useState, useEffect } from 'react';
import { Download, FileText, FileCode, Presentation, Loader2 } from 'lucide-react';
import { useAuthFetch, API_BASE } from '@/hooks/use-auth-fetch';

interface ReportInfo {
  mode: string;
  pdf: string | null;
  docx: string | null;
  markdown: string | null;
  build_dir: string | null;
  pptx: string | null;
}

interface DownloadButtonsProps {
  runId: string;
  mode: 'research' | 'build' | 'presentation';
}

export default function DownloadButtons({ runId, mode }: DownloadButtonsProps) {
  const authFetch = useAuthFetch();
  const [report, setReport] = useState<ReportInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchReport() {
      try {
        const res = await authFetch(`/api/report/${runId}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        if (!cancelled) setReport(data);
      } catch {
        if (!cancelled) setReport(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchReport();
    return () => { cancelled = true; };
  }, [runId, authFetch]);

  async function handleDownload(filePath: string, filename: string) {
    setDownloading(filename);
    try {
      const res = await authFetch(`/api/download?path=${encodeURIComponent(filePath)}`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(null);
    }
  }

  if (loading) {
    return <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-stella-text-dim"><Loader2 size={10} className="animate-spin" /> Loading files...</div>;
  }

  if (!report) {
    return <p className="text-[10px] text-stella-text-dim mt-1.5">Report available in chat</p>;
  }

  const buttons: { label: string; icon: React.ReactNode; path: string; filename: string }[] = [];

  if (mode === 'research' || report.mode === 'research') {
    if (report.pdf) buttons.push({ label: 'PDF Report', icon: <FileText size={11} />, path: report.pdf, filename: `research-${runId.slice(0, 8)}.pdf` });
    if (report.docx) buttons.push({ label: 'DOCX', icon: <FileText size={11} />, path: report.docx, filename: `research-${runId.slice(0, 8)}.docx` });
    if (report.markdown) buttons.push({ label: 'Markdown', icon: <FileCode size={11} />, path: report.markdown, filename: `research-${runId.slice(0, 8)}.md` });
  }

  if (mode === 'build' || report.mode === 'build') {
    if (report.build_dir) buttons.push({ label: 'Build Files', icon: <FileCode size={11} />, path: report.build_dir, filename: `build-${runId.slice(0, 8)}` });
    if (report.markdown) buttons.push({ label: 'Architecture Doc', icon: <FileText size={11} />, path: report.markdown, filename: `architecture-${runId.slice(0, 8)}.md` });
  }

  if (mode === 'presentation' || report.mode === 'presentation') {
    if (report.pptx) buttons.push({ label: 'PPTX', icon: <Presentation size={11} />, path: report.pptx, filename: `deck-${runId.slice(0, 8)}.pptx` });
    if (report.pdf) buttons.push({ label: 'PDF', icon: <FileText size={11} />, path: report.pdf, filename: `deck-${runId.slice(0, 8)}.pdf` });
  }

  if (buttons.length === 0) {
    return <p className="text-[10px] text-stella-text-dim mt-1.5">Report available in chat</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {buttons.map(btn => (
        <button
          key={btn.label}
          onClick={() => handleDownload(btn.path, btn.filename)}
          disabled={downloading === btn.filename}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-stella-green-dim text-stella-green border border-stella-green/20 hover:bg-stella-green/15 hover:border-stella-green/30 transition-all disabled:opacity-50"
        >
          {downloading === btn.filename ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
          {btn.label}
        </button>
      ))}
    </div>
  );
}
