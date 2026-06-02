import { formatShortDateTime } from './format';

export async function exportCampaignAsPdf(activePrompt: string, user: any, messages: any[]): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const fileName = 'squidweave-campaign-export.pdf';
  const doc = new jsPDF();
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 297, 'F');

  doc.setTextColor(99, 102, 241);
  doc.setFontSize(24);
  doc.text('SQUIDWEAVE', 20, 30);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('Campaign Architecture Report', 20, 45);

  doc.setDrawColor(255, 255, 255, 0.1);
  doc.line(20, 55, 190, 55);

  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${formatShortDateTime(new Date())}`, 20, 65);
  doc.text(`User: ${user?.displayName || 'Anonymous'}`, 20, 72);

  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('Campaign Context & Vision', 20, 90);

  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  const splitText = doc.splitTextToSize(activePrompt || 'No prompt active', 170);
  doc.text(splitText, 20, 100);

  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('Latest Collaboration Thread', 20, 160);

  let y = 170;
  messages.slice(-5).forEach((msg: any) => {
    doc.setFontSize(8);
    doc.setTextColor(99, 102, 241);
    doc.text(msg.role.toUpperCase(), 20, y);
    doc.setTextColor(148, 163, 184);
    const msgLines = doc.splitTextToSize(msg.content.substring(0, 200), 170);
    doc.text(msgLines, 20, y + 5);
    y += 25;
  });

  doc.save(fileName);
}
