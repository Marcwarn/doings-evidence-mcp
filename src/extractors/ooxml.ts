import { inflateRawSync } from "node:zlib";

interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const signature = 0x06054b50;
  const maxCommentLength = 0xffff;
  const minOffset = Math.max(0, buffer.length - maxCommentLength - 22);
  for (let offset = buffer.length - 22; offset >= minOffset; offset--) {
    if (buffer.readUInt32LE(offset) === signature) return offset;
  }
  throw new Error("Invalid ZIP/OOXML file: end of central directory not found.");
}

function listZipEntries(buffer: Buffer): ZipEntry[] {
  const eocd = findEndOfCentralDirectory(buffer);
  const centralDirectorySize = buffer.readUInt32LE(eocd + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(eocd + 16);
  const entries: ZipEntry[] = [];
  let offset = centralDirectoryOffset;
  const end = centralDirectoryOffset + centralDirectorySize;

  while (offset < end) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + fileNameLength).toString("utf8");
    entries.push({ name, method, compressedSize, uncompressedSize, localHeaderOffset });
    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function readZipEntry(buffer: Buffer, entry: ZipEntry): Buffer {
  const offset = entry.localHeaderOffset;
  if (buffer.readUInt32LE(offset) !== 0x04034b50) {
    throw new Error(`Invalid ZIP local header for ${entry.name}`);
  }
  const fileNameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.method === 0) return compressed;
  if (entry.method === 8) return inflateRawSync(compressed);
  throw new Error(`Unsupported ZIP compression method ${entry.method} for ${entry.name}`);
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function xmlToText(xml: string): string {
  return decodeXmlEntities(
    xml
      .replace(/<\/?(?:w:p|a:p|text:p|w:tr|a:tbl|w:br|a:br|w:tab)[^>]*>/g, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function extractEntries(buffer: Buffer, predicate: (name: string) => boolean): string[] {
  const entries = listZipEntries(buffer)
    .filter((entry) => predicate(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  return entries
    .map((entry) => xmlToText(readZipEntry(buffer, entry).toString("utf8")))
    .filter((text) => text.length > 0);
}

export function extractDocxText(buffer: Buffer): string {
  const parts = extractEntries(buffer, (name) =>
    name === "word/document.xml" ||
    /^word\/(header|footer|footnotes|endnotes)\d*\.xml$/.test(name)
  );
  return parts.join("\n\n");
}

export function extractPptxText(buffer: Buffer): string {
  const slides = extractEntries(buffer, (name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
  return slides.map((slide, index) => `Slide ${index + 1}\n${slide}`).join("\n\n");
}

export function extractXlsxText(buffer: Buffer): string {
  const sharedStrings = extractEntries(buffer, (name) => name === "xl/sharedStrings.xml");
  const sheets = extractEntries(buffer, (name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name));
  return [...sharedStrings, ...sheets].join("\n\n");
}
