import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Exports the main content area as a PDF report.
 *
 * @param {HTMLElement} element - The DOM element to capture
 * @param {string} title - The title for the PDF report
 */
export async function exportToPDF(element, title = 'SPW Dashboard') {
  if (!element) {
    console.error('Export failed: No element provided');
    return;
  }

  try {
    // Capture the element as a canvas image
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: null,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // Create PDF in landscape or portrait based on content aspect ratio
    const isLandscape = imgWidth > imgHeight;
    const pdf = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Add title
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, pageWidth / 2, 20, { align: 'center' });

    // Add subtitle with date
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120, 120, 120);
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    pdf.text(`Report generated on ${dateStr}`, pageWidth / 2, 28, { align: 'center' });

    // Calculate image dimensions to fit the page
    const margin = 15;
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - 40 - margin; // 40mm for header area
    const ratio = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
    const scaledWidth = imgWidth * ratio;
    const scaledHeight = imgHeight * ratio;

    // Center the image horizontally
    const xPos = (pageWidth - scaledWidth) / 2;

    // Add captured image
    pdf.addImage(imgData, 'PNG', xPos, 35, scaledWidth, scaledHeight);

    // Add footer
    pdf.setFontSize(8);
    pdf.setTextColor(160, 160, 160);
    pdf.text(
      'Smart Personal Wealth — Confidential',
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );

    // Save the PDF
    pdf.save(`SPW_Report_${new Date().toISOString().split('T')[0]}.pdf`);

    console.log('PDF exported successfully');
  } catch (err) {
    console.error('Error exporting PDF:', err);
  }
}
