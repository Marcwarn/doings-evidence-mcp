import { PDFParse } from "pdf-parse";
import { extractDocxText, extractPptxText, extractXlsxText } from "./ooxml.js";

export interface ExtractedDocumentText {
  text?: string;
  extractionStatus: "ok" | "unsupported" | "error";
  extractor?: "plain_text" | "docx_ooxml" | "pptx_ooxml" | "xlsx_ooxml" | "pdf_parse";
  warning?: string;
  metadata?: Record<string, unknown>;
}

function normalize(text: string, maxChars = 180_000): string {
  return text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim().slice(0, maxChars);
}

function extension(title = ""): string {
  const match = title.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

function isPlainText(mimeType = "", title = ""): boolean {
  return /^text\//.test(mimeType) || /\.(md|txt|csv|json|html?)$/i.test(title);
}

async function extractPdfText(buffer: Buffer): Promise<ExtractedDocumentText> {
  let parser: PDFParse | undefined;
  try {
    parser = new PDFParse({ data: buffer });
    const [textResult, infoResult] = await Promise.allSettled([
      parser.getText(),
      parser.getInfo({ parsePageInfo: true })
    ]);

    const text = textResult.status === "fulfilled" ? normalize(textResult.value.text ?? "") : "";
    const metadata = infoResult.status === "fulfilled"
      ? {
          pages: infoResult.value.total,
          title: infoResult.value.info?.Title,
          author: infoResult.value.info?.Author,
          creator: infoResult.value.info?.Creator,
          producer: infoResult.value.info?.Producer
        }
      : undefined;

    if (!text) {
      return {
        extractionStatus: "unsupported",
        extractor: "pdf_parse",
        metadata,
        warning: "PDF parser found no extractable text. The file may be scanned/image-based, encrypted, or require OCR/Azure Document Intelligence."
      };
    }

    return {
      text,
      extractionStatus: "ok",
      extractor: "pdf_parse",
      metadata,
      warning: text.length < 500
        ? "PDF parser extracted very little text. Review manually or use OCR if this should be a text-heavy document."
        : undefined
    };
  } catch (error) {
    return {
      extractionStatus: "error",
      extractor: "pdf_parse",
      warning: error instanceof Error ? error.message : String(error)
    };
  } finally {
    await parser?.destroy().catch(() => undefined);
  }
}

export async function extractDocumentText(params: {
  buffer: Buffer;
  mimeType?: string;
  title?: string;
}): Promise<ExtractedDocumentText> {
  const { buffer, mimeType = "", title = "" } = params;
  const ext = extension(title);

  try {
    if (isPlainText(mimeType, title)) {
      return { text: normalize(buffer.toString("utf8")), extractionStatus: "ok", extractor: "plain_text" };
    }

    if (mimeType.includes("wordprocessingml.document") || ext === "docx") {
      const text = normalize(extractDocxText(buffer));
      return text
        ? { text, extractionStatus: "ok", extractor: "docx_ooxml" }
        : { extractionStatus: "unsupported", extractor: "docx_ooxml", warning: "DOCX contained no extractable text." };
    }

    if (mimeType.includes("presentationml.presentation") || ext === "pptx") {
      const text = normalize(extractPptxText(buffer));
      return text
        ? { text, extractionStatus: "ok", extractor: "pptx_ooxml" }
        : { extractionStatus: "unsupported", extractor: "pptx_ooxml", warning: "PPTX contained no extractable slide text." };
    }

    if (mimeType.includes("spreadsheetml.sheet") || ext === "xlsx") {
      const text = normalize(extractXlsxText(buffer));
      return text
        ? { text, extractionStatus: "ok", extractor: "xlsx_ooxml" }
        : { extractionStatus: "unsupported", extractor: "xlsx_ooxml", warning: "XLSX contained no extractable text." };
    }

    if (mimeType === "application/pdf" || ext === "pdf") {
      return await extractPdfText(buffer);
    }

    return { extractionStatus: "unsupported", warning: `Unsupported file type: ${mimeType || ext || "unknown"}` };
  } catch (error) {
    return {
      extractionStatus: "error",
      warning: error instanceof Error ? error.message : String(error)
    };
  }
}
