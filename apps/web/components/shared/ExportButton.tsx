"use client";

import { Download } from "lucide-react";

interface ExportButtonProps {
  content: string;
  filename: string;
  format?: "markdown" | "pdf" | "csv";
  label?: string;
  className?: string;
  headerHtml?: string;
}

export function ExportButton({ content, filename, format = "markdown", label = "Export", className, headerHtml }: ExportButtonProps) {
  const handleExport = () => {
    if (!content) return;
    if (format === "pdf") {
      const win = window.open("", "_blank");
      if (!win) return;
      const escaped = content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${filename}</title><style>
        body{font-family:"Times New Roman",serif;font-size:12pt;line-height:1.8;margin:0;color:#000}
        @page{margin:1in}
        pre{white-space:pre-wrap;word-wrap:break-word;font-family:inherit;font-size:inherit}
      </style></head><body>${headerHtml ?? ""}<pre>${escaped}</pre></body></html>`);
      win.document.close();
      setTimeout(() => { win.focus(); win.print(); }, 300);
    } else {
      const mime = format === "csv" ? "text/csv" : "text/markdown";
      const ext = format === "csv" ? "csv" : "md";
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={!content}
      className={className ?? "lex-btn lex-btn--secondary"}
    >
      <Download size={12} />
      {label}
    </button>
  );
}
