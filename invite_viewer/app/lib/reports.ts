import { promises as fs } from "fs";
import path from "path";
import type { LoadedReport } from "./report-shape";
import { normalizeReport } from "./report-shape";

function reportSortKey(fileName: string): [string, number] {
  const match = fileName.match(/^(.*?)(\d+)?\.json$/);

  return [
    match?.[1] ?? fileName,
    match?.[2] ? Number.parseInt(match[2], 10) : 0,
  ];
}

export async function getReports(): Promise<LoadedReport[]> {
  const reportsDir = path.join(process.cwd(), "..", "reports");

  try {
    const fileNames = (await fs.readdir(reportsDir)).filter((fileName) =>
      fileName.endsWith(".json"),
    );

    const reports = await Promise.all(
      fileNames.map(async (fileName) => {
        const filePath = path.join(reportsDir, fileName);
        const contents = await fs.readFile(filePath, "utf8");
        return normalizeReport(JSON.parse(contents), fileName);
      }),
    );

    return reports.sort((a, b) => {
      const [aBase, aNumber] = reportSortKey(a.fileName);
      const [bBase, bNumber] = reportSortKey(b.fileName);

      return aBase.localeCompare(bBase) || aNumber - bNumber;
    });
  } catch (error) {
    console.error("Failed to load invite reports", error);
    return [];
  }
}
