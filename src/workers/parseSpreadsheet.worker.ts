import * as XLSX from "xlsx";

type Incoming = {
  arrayBuffer: ArrayBuffer;
  sheetOverride?: string;
};

type Outgoing =
  | {
      ok: true;
      sheetNames: string[];
      selectedSheet: string;
      jsonData: Record<string, any>[];
    }
  | { ok: false; error: string };

const pickSheetName = (sheetNames: string[], sheetOverride?: string) => {
  if (sheetOverride && sheetNames.includes(sheetOverride)) return sheetOverride;
  return sheetNames[0] || "";
};

self.onmessage = (ev: MessageEvent<Incoming>) => {
  try {
    const { arrayBuffer, sheetOverride } = ev.data || ({} as Incoming);
    if (!arrayBuffer) {
      const out: Outgoing = { ok: false, error: "missing_array_buffer" };
      self.postMessage(out);
      return;
    }

    // XLSX.read is synchronous and can be expensive; running in Worker keeps UI responsive.
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetNames = workbook.SheetNames || [];
    const selectedSheet = pickSheetName(sheetNames, sheetOverride);

    if (!selectedSheet) {
      const out: Outgoing = { ok: false, error: "no_sheets" };
      self.postMessage(out);
      return;
    }

    const worksheet = workbook.Sheets[selectedSheet];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      defval: "",
    });

    const out: Outgoing = { ok: true, sheetNames, selectedSheet, jsonData };
    self.postMessage(out);
  } catch (e: any) {
    const out: Outgoing = { ok: false, error: e?.message || "parse_error" };
    self.postMessage(out);
  }
};
