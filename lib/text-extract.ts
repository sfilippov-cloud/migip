import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<string | null> {
  if (mimeType === "application/pdf") {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // Images and other types — no text extraction
  return null;
}
