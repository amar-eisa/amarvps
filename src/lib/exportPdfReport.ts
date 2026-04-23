// Generates a PDF snapshot report of the current VPS state.
// Uses jsPDF + autoTable. Latin-only text in the PDF (Arabic glyphs are not
// embedded by default in jsPDF), so labels are kept in English.

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { VpsData } from "@/types/vps";

const fmt = (n: number | undefined, suffix = "") =>
  n === undefined || n === null ? "-" : `${Number(n).toFixed(1)}${suffix}`;

export function exportVpsPdfReport(data: VpsData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");

  // Header band
  doc.setFillColor(10, 15, 30);
  doc.rect(0, 0, pageWidth, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("VPS Monitor Report", 40, 32);
  doc.setFontSize(10);
  doc.setTextColor(180, 200, 230);
  doc.text(`Host: ${data.hostname ?? "-"}`, 40, 50);
  doc.text(`Generated: ${now.toLocaleString("en-GB")}`, pageWidth - 40, 50, {
    align: "right",
  });

  // Summary
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(13);
  doc.text("Resource Summary", 40, 100);

  autoTable(doc, {
    startY: 110,
    theme: "grid",
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    head: [["Metric", "Value"]],
    body: [
      ["CPU Usage", fmt(data.cpu_percent, " %")],
      [
        "RAM Usage",
        `${fmt(data.ram_percent, " %")}  (${data.ram_used_mb ?? "-"} / ${data.ram_total_mb ?? "-"} MB)`,
      ],
      ["Uptime", data.uptime ?? "-"],
      ["Open Ports", String(data.services?.length ?? 0)],
      [
        "Running Services",
        String(data.services?.filter((s) => s.status === "running").length ?? 0),
      ],
      ["Containers", String(data.containers?.length ?? 0)],
    ],
  });

  // Disks
  if (data.disks?.length) {
    const y = (doc as any).lastAutoTable.finalY + 24;
    doc.setFontSize(13);
    doc.text("Disk Usage", 40, y);
    autoTable(doc, {
      startY: y + 8,
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      head: [["Mount", "Used", "Total", "Used %"]],
      body: data.disks.map((d) => [
        d.mount ?? "-",
        `${d.used_gb ?? "-"} GB`,
        `${d.total_gb ?? "-"} GB`,
        `${d.percent ?? "-"} %`,
      ]),
    });
  }

  // Services
  if (data.services?.length) {
    const y = (doc as any).lastAutoTable.finalY + 24;
    doc.setFontSize(13);
    doc.text("Services & Ports", 40, y);
    autoTable(doc, {
      startY: y + 8,
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      head: [["Port", "Name", "PID", "Status"]],
      body: data.services.map((s) => [
        String(s.port ?? "-"),
        s.name ?? "-",
        s.pid ? String(s.pid) : "-",
        s.status ?? "-",
      ]),
      styles: { fontSize: 9 },
    });
  }

  // Containers
  if (data.containers?.length) {
    const y = (doc as any).lastAutoTable.finalY + 24;
    doc.setFontSize(13);
    doc.text("Containers", 40, y);
    autoTable(doc, {
      startY: y + 8,
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      head: [["Name", "Status", "CPU %", "RAM (MB)", "Port", "Owner"]],
      body: data.containers.map((c: any) => [
        c.name ?? "-",
        c.status ?? c.state ?? "-",
        typeof c.cpu_percent === "number" ? c.cpu_percent.toFixed(1) : "-",
        typeof c.mem_mb === "number" ? c.mem_mb.toFixed(1) : "-",
        c.port ?? "-",
        c.owner ?? "-",
      ]),
      styles: { fontSize: 9 },
    });
  }

  // Footer page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Page ${i} of ${pages}`,
      pageWidth - 40,
      doc.internal.pageSize.getHeight() - 20,
      { align: "right" }
    );
  }

  doc.save(`vps-report-${stamp}.pdf`);
}
