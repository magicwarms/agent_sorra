import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { existsSync, readFileSync } from "node:fs";
import { Document } from "@langchain/core/documents";
import { PDFParse } from "pdf-parse";
import { COLLECTION_NAME } from "../utils/enum";
import { randomUUIDv7 } from "bun";

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
});

export const vectorStore = async (collectionName: COLLECTION_NAME) => {
  return await QdrantVectorStore.fromExistingCollection(embeddings, {
    url: process.env.QDRANT_URL,
    collectionName: collectionName,
    apiKey: process.env.QDRANT_API_KEY,
  });
};

// Below is a minimal helper for demonstration purposes.
export async function loadPdfPages(filePath: string): Promise<Document[]> {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const parser = new PDFParse({
    data: new Uint8Array(readFileSync(filePath)),
  });
  try {
    const { pages } = await parser.getText();
    return pages.flatMap((page) => {
      // Avoid creating documents for blank pages and reduce unnecessary
      // whitespace before the text is split and embedded.
      const pageContent = page.text.replace(/\s+/g, " ").trim();
      if (!pageContent) return [];

      return [
        new Document({
          id: randomUUIDv7(),
          pageContent,
          metadata: {
            source: filePath,
            page: page.num - 1,
            pageNumber: page.num,
          },
        }),
      ];
    });
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  } finally {
    await parser.destroy();
  }
}

export const splitterText = async (filePath: string) => {
  const docs = await loadPdfPages(filePath);

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1200,
    chunkOverlap: 150,
    separators: ["\n\n", "\n", ". ", " ", ""],
    keepSeparator: true,
  });

  const splitDocument = await textSplitter.splitDocuments(docs);
  if (splitDocument.length === 0) return [];

  return splitDocument;
};

const storeDocument = async (
  splitDocument: Document<Record<string, any>>[],
  collectionName: COLLECTION_NAME,
) => {
  try {
    const initVectorStore = await vectorStore(collectionName);
    const batchSize = 64;

    for (let index = 0; index < splitDocument.length; index += batchSize) {
      await initVectorStore.addDocuments(
        splitDocument.slice(index, index + batchSize),
      );
    }
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  }
};

export const addKnowledge = async (
  filePath: string,
  collectionName: COLLECTION_NAME,
) => {
  const splitDocument = await splitterText(filePath);
  console.log({ splitDocument });
  await storeDocument(splitDocument, collectionName);
};

export const findKnowledge = async (
  query: string,
  collectionName?: COLLECTION_NAME,
) => {
  const vectorStoreName = findCollectionName(collectionName);

  const knowledgeVectorStore = await vectorStore(vectorStoreName);
  return await knowledgeVectorStore.similaritySearchWithScore(query);
};

const findCollectionName = (collectionName?: COLLECTION_NAME) => {
  let collectionVectorStoreName: COLLECTION_NAME;
  switch (collectionName) {
    case COLLECTION_NAME.INTERVIEW_GUIDE_DOCS:
      collectionVectorStoreName = COLLECTION_NAME.INTERVIEW_GUIDE_DOCS;
      break;
    case COLLECTION_NAME.NODEJS_GUIDE_DOCS:
    default:
      collectionVectorStoreName = COLLECTION_NAME.NODEJS_GUIDE_DOCS;
      break;
  }

  return collectionVectorStoreName;
};
