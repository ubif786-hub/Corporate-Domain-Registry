// OpenSRS's XML envelope (OPS). A plain value becomes text, an array a dt_array, an object a
// dt_assoc; every entry is <item key="...">. The reply is read with a DOM parser that never
// fetches anything: the DOCTYPE names ops.dtd and nothing may load it.

import { DOMParser, type Element } from "@xmldom/xmldom";

export type OpsValue = string | number | boolean | null | undefined | OpsValue[] | { [key: string]: OpsValue };
export type OpsData = string | OpsData[] | { [key: string]: OpsData };

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export function encode(value: OpsValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value !== "object") return escapeXml(String(value));
  const isList = Array.isArray(value) && value.length > 0;
  const tag = isList ? "dt_array" : "dt_assoc";
  const entries: [string, OpsValue][] = Array.isArray(value) ? value.map((v, i) => [String(i), v]) : Object.entries(value);
  return `<${tag}>` + entries.map(([k, v]) => `<item key="${escapeXml(k)}">${encode(v)}</item>`).join("") + `</${tag}>`;
}

/** extra: further top-level request parameters, such as registrant_ip, which the docs put beside
 *  action and object rather than inside attributes. attributes stays last. */
export function envelope(action: string, object: string, attributes: Record<string, OpsValue>, extra: Record<string, OpsValue> = {}): string {
  const body: Record<string, OpsValue> = { protocol: "XCP", action, object, ...extra, attributes };
  return "<?xml version='1.0' encoding='UTF-8' standalone='no' ?>\n"
    + "<!DOCTYPE OPS_envelope SYSTEM 'ops.dtd'>\n"
    + "<OPS_envelope><header><version>0.9</version></header><body><data_block>"
    + encode(body)
    + "</data_block></body></OPS_envelope>";
}

const elementChildren = (el: Element): Element[] => {
  const out: Element[] = [];
  for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 1) out.push(n as Element);
  return out;
};

function readNode(el: Element): OpsData {
  if (el.tagName === "dt_assoc" || el.tagName === "dt_array") {
    const out: Record<string, OpsData> = {};
    for (const item of elementChildren(el)) {
      if (item.tagName !== "item") continue;
      out[item.getAttribute("key") ?? ""] = readItem(item);
    }
    // A dt_array reads as a list, so callers can iterate it.
    return el.tagName === "dt_array" ? Object.values(out) : out;
  }
  return el.textContent ?? "";
}

function readItem(item: Element): OpsData {
  const first = elementChildren(item)[0];
  return first ? readNode(first) : item.textContent ?? "";
}

/** The reply's data_block, or null when it is not a readable OPS envelope. */
export function decode(xml: unknown): Record<string, OpsData> | null {
  if (typeof xml !== "string" || xml === "") return null;
  try {
    const doc = new DOMParser({
      onError: (level) => { if (level !== "warning") throw new Error("unreadable XML"); },
    }).parseFromString(xml, "text/xml");
    const block = doc.getElementsByTagName("data_block")[0];
    if (!block) return null;
    const first = elementChildren(block as unknown as Element)[0];
    if (!first) return null;
    const data = readNode(first);
    return data && typeof data === "object" && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}
