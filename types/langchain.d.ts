// Langchain declarations for TypeScript
declare module "langchain/document_loaders/fs/pdf" {
  export class PDFLoader {
    constructor(filePath: string, options?: any);
    load(): Promise<any[]>;
  }
}
