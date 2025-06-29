import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function generateOrderPdf(elementId: string, filename: string): Promise<void> {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with id "${elementId}" not found`);
      return;
    }

    // Create a clone to modify for PDF generation
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.width = '800px';
    clone.style.padding = '20px';
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.left = '-9999px';
    document.body.appendChild(clone);

    // Optional: replace emojis with text or remove them if they cause issues
    const emojiElements = clone.querySelectorAll('.text-lg');
    emojiElements.forEach(emoji => {
      emoji.textContent = ''; // Replace emojis with bullet points
    });

    // Generate canvas from the element
    const canvas = await html2canvas(clone, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    // Remove the clone from DOM
    document.body.removeChild(clone);

    // Calculate PDF dimensions (A4 format)
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 295; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Split into pages if content is longer than A4
    let position = 0;
    let heightLeft = imgHeight;

    // Add first page
    pdf.addImage(
      canvas.toDataURL('image/png'), 
      'PNG', 
      0, 
      position, 
      imgWidth, 
      imgHeight, 
      undefined, 
      'FAST'
    );
    heightLeft -= pageHeight;

    // Add additional pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(
        canvas.toDataURL('image/png'), 
        'PNG', 
        0, 
        position, 
        imgWidth, 
        imgHeight, 
        undefined, 
        'FAST'
      );
      heightLeft -= pageHeight;
    }

    // Download the PDF
    pdf.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
}