/**
 * PDF generation utilities for guidebook and cleaning guide exports.
 * Uses jsPDF (lazy-loaded) to generate styled PDF documents.
 */

// Brand colors
const BRAND_PRIMARY = [45, 95, 93] as const; // #2D5F5D
const BRAND_DARK = [26, 54, 53] as const;
const TEXT_DARK = [33, 37, 41] as const;
const TEXT_MUTED = [108, 117, 125] as const;
const BG_LIGHT = [248, 249, 250] as const;

interface PdfSection {
  title: string;
  content?: string;
  items?: string[];
  blocks?: Array<{
    type: string;
    title?: string;
    content?: string;
    items?: string[];
  }>;
}

interface CleaningRoom {
  name: string;
  tasks: string[];
}

/**
 * Generate a styled guidebook PDF for guests.
 */
export async function generateGuidebookPdf(
  propertyTitle: string,
  sections: PdfSection[]
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // --- Cover Page ---
  pdf.setFillColor(...BRAND_PRIMARY);
  pdf.rect(0, 0, pageWidth, 297, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(32);
  const titleLines = pdf.splitTextToSize(propertyTitle, contentWidth);
  pdf.text(titleLines, pageWidth / 2, 100, { align: "center" });

  pdf.setFontSize(16);
  pdf.text("Guest Guidebook", pageWidth / 2, 100 + titleLines.length * 14 + 10, { align: "center" });

  pdf.setFontSize(10);
  pdf.setTextColor(200, 220, 220);
  pdf.text("Nordic Getaways", pageWidth / 2, 260, { align: "center" });

  // --- Content Pages ---
  pdf.addPage();
  y = margin;

  const checkPageBreak = (needed: number) => {
    if (y + needed > 275) {
      pdf.addPage();
      y = margin;
    }
  };

  for (const section of sections) {
    checkPageBreak(25);

    // Section title with underline
    pdf.setFontSize(16);
    pdf.setTextColor(...BRAND_PRIMARY);
    pdf.text(section.title, margin, y);
    y += 2;
    pdf.setDrawColor(...BRAND_PRIMARY);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, margin + 60, y);
    y += 8;

    pdf.setFontSize(10);
    pdf.setTextColor(...TEXT_DARK);

    // Render blocks if present (new format)
    if (section.blocks && section.blocks.length > 0) {
      for (const block of section.blocks) {
        if (block.title) {
          checkPageBreak(12);
          pdf.setFontSize(11);
          pdf.setTextColor(...BRAND_DARK);
          pdf.text(block.title, margin, y);
          y += 6;
          pdf.setFontSize(10);
          pdf.setTextColor(...TEXT_DARK);
        }

        if (block.type === "text" && block.content) {
          const lines = pdf.splitTextToSize(block.content, contentWidth);
          checkPageBreak(lines.length * 5 + 4);
          pdf.text(lines, margin, y);
          y += lines.length * 5 + 4;
        }

        if ((block.type === "list" || block.type === "checkbox") && block.items) {
          for (const item of block.items) {
            const bullet = block.type === "checkbox" ? "☐ " : "• ";
            const lines = pdf.splitTextToSize(`${bullet}${item}`, contentWidth - 5);
            checkPageBreak(lines.length * 5 + 2);
            pdf.text(lines, margin + 5, y);
            y += lines.length * 5 + 2;
          }
          y += 3;
        }
      }
    }

    // Render legacy content/items format
    if (section.content && (!section.blocks || section.blocks.length === 0)) {
      const lines = pdf.splitTextToSize(section.content, contentWidth);
      checkPageBreak(lines.length * 5 + 4);
      pdf.text(lines, margin, y);
      y += lines.length * 5 + 4;
    }

    if (section.items && (!section.blocks || section.blocks.length === 0)) {
      for (const item of section.items) {
        const lines = pdf.splitTextToSize(`• ${item}`, contentWidth - 5);
        checkPageBreak(lines.length * 5 + 2);
        pdf.text(lines, margin + 5, y);
        y += lines.length * 5 + 2;
      }
      y += 3;
    }

    y += 8; // Space between sections
  }

  // Footer on last page
  pdf.setFontSize(8);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text(
    `Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} — Nordic Getaways`,
    pageWidth / 2,
    290,
    { align: "center" }
  );

  pdf.save(`${propertyTitle}-guidebook.pdf`);
}

/**
 * Generate a styled cleaning guide PDF for hosts.
 */
export async function generateCleaningGuidePdf(
  propertyTitle: string,
  rooms: CleaningRoom[],
  finalSteps: string[]
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // --- Cover Page ---
  pdf.setFillColor(...BRAND_PRIMARY);
  pdf.rect(0, 0, pageWidth, 297, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(28);
  pdf.text("Cleaning Guide", pageWidth / 2, 100, { align: "center" });

  pdf.setFontSize(16);
  const titleLines = pdf.splitTextToSize(propertyTitle, contentWidth);
  pdf.text(titleLines, pageWidth / 2, 120, { align: "center" });

  pdf.setFontSize(10);
  pdf.setTextColor(200, 220, 220);
  pdf.text("Nordic Getaways — Turnover Checklist", pageWidth / 2, 260, { align: "center" });

  // --- Content ---
  pdf.addPage();
  y = margin;

  const checkPageBreak = (needed: number) => {
    if (y + needed > 275) {
      pdf.addPage();
      y = margin;
    }
  };

  for (const room of rooms) {
    checkPageBreak(20 + room.tasks.length * 7);

    // Room header
    pdf.setFontSize(14);
    pdf.setTextColor(...BRAND_PRIMARY);
    pdf.text(room.name, margin, y);
    y += 2;
    pdf.setDrawColor(...BRAND_PRIMARY);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, margin + 50, y);
    y += 8;

    // Checklist items
    pdf.setFontSize(10);
    pdf.setTextColor(...TEXT_DARK);
    for (const task of room.tasks) {
      checkPageBreak(7);
      pdf.text(`☐  ${task}`, margin + 4, y);
      y += 7;
    }

    y += 8;
  }

  // Final steps
  if (finalSteps.length > 0) {
    checkPageBreak(20 + finalSteps.length * 7);

    pdf.setFontSize(14);
    pdf.setTextColor(...BRAND_PRIMARY);
    pdf.text("Final Checks", margin, y);
    y += 2;
    pdf.setDrawColor(...BRAND_PRIMARY);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, margin + 50, y);
    y += 8;

    pdf.setFontSize(10);
    pdf.setTextColor(...TEXT_DARK);
    for (const step of finalSteps) {
      checkPageBreak(7);
      pdf.text(`☐  ${step}`, margin + 4, y);
      y += 7;
    }
  }

  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text(
    `Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} — Nordic Getaways`,
    pageWidth / 2,
    290,
    { align: "center" }
  );

  pdf.save(`${propertyTitle}-cleaning-guide.pdf`);
}
