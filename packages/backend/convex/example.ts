// convex/example.ts
import { createOllama } from "ollama-ai-provider-v2";
import { components } from "./_generated/api";
import { RAG } from "@convex-dev/rag";
import { action } from "./_generated/server";
import { v } from "convex/values";
// Any AI SDK model that supports embeddings will work.
// import { openai } from "@ai-sdk/openai";

// Ollama base URL is configured via OLLAMA_BASE_URL environment variable
// Set in docker-compose.yml to http://host.docker.internal:11434 for Docker compatibility

const ollama = createOllama({
    // optional settings, e.g.
    baseURL: 'http://host.docker.internal:11434/api',
});

const rag = new RAG(components.rag, {
    textEmbeddingModel: ollama.textEmbeddingModel('nomic-embed-text'),
    embeddingDimension: 768, // Needs to match your embedding model
});


export const add = action({
    args: { text: v.string() },
    handler: async (ctx, { text }) => {
        // Add the text to a namespace shared by all users.
        await rag.add(ctx, {
            namespace: "global",
            text,
        });
    },
});


export const search = action({
    args: {
        query: v.string(),
    },
    handler: async (ctx, args) => {
        const { results, text, entries, usage } = await rag.search(ctx, {
            namespace: "global",
            query: args.query,
            limit: 10,
            vectorScoreThreshold: 0.5, // Only return results with a score >= 0.5
        });

        return { results, text, entries, usage };
    },
});

export const askQuestion = action({
    args: {
        prompt: v.string(),
    },
    handler: async (ctx, args) => {
        const { text, context } = await rag.generateText(ctx, {
            search: { namespace: 'global', limit: 10 },
            prompt: args.prompt,
            model: ollama.chat("gemma3:4b"),
        });
        return { answer: text, context };
    },
});
