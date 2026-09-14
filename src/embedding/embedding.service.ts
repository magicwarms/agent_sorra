import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { readFileSync } from "node:fs";
import { Document } from "@langchain/core/documents";
import { PDFParse } from "pdf-parse";

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
});

const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
  url: process.env.QDRANT_URL,
  collectionName: "nodejs-docs",
  apiKey: process.env.QDRANT_API_KEY,
});

// Below is a minimal helper for demonstration purposes.
export async function loadPdfPages(filePath: string): Promise<Document[]> {
  const parser = new PDFParse({
    data: new Uint8Array(readFileSync(filePath)),
  });
  try {
    const { pages } = await parser.getText();
    return pages.map(
      (page) =>
        new Document({
          pageContent: page.text,
          metadata: { source: filePath, page: page.num - 1 },
        }),
    );
  } catch (err: any) {
    throw new Error(err.message);
  } finally {
    await parser.destroy();
  }
}

export const splitterText = async (filePath: string) => {
  const docs = await loadPdfPages(filePath);
  console.log(docs.length);

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const allSplits = await textSplitter.splitDocuments(docs);

  await vectorStore.addDocuments(allSplits);
};

// TODO:
// LANJUT PANGGIL INI DI THREAD CONTROLLER
