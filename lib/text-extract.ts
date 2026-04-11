// pdf-parse v1 has no types — use require
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");
import mammoth from "mammoth";

export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<string | null> {
  if (mimeType === "application/pdf") {
    const data = await pdfParse(buffer);
    return data.text;
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
