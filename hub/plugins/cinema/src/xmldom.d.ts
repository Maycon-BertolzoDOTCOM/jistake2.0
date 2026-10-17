declare module "xmldom" {
  export class DOMParser {
    parseFromString(source: string, mimeType: string): Document;
  }
  const def: typeof DOMParser;
  export default def;
}
