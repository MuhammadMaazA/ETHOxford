import html2canvas from 'html2canvas';

export async function downloadCertificate(
  element: HTMLElement,
  filename: string = 'hatchmark-certificate'
): Promise<void> {
  try {
    // Create canvas from the certificate element
    const canvas = await html2canvas(element, {
      scale: 2, // Higher resolution
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    });

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Failed to create blob from canvas');
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png', 1.0);
  } catch (error) {
    console.error('Error downloading certificate:', error);
    throw error;
  }
}
