import { IOpenrouterResponseApiResponse } from "../types/IOpenrouterResponse";

enum GTPModels {
    MistralSmall = "mistralai/mistral-small-3.1-24b-instruct:free",
    OpenAIGPT_OSS_20b = "openai/gpt-oss-20b:free",
    DeepseekR1_0528_QWEN3_8B = "deepseek/deepseek-r1-0528-qwen3-8b:free",
    DeepseekR1_0528 = "deepseek/deepseek-r1-0528:free",
    DeepseekR1_V3 = "deepseek/deepseek-chat-v3-0324:free",
    Microsoft_Mai_DS_R1 = "microsoft/mai-ds-r1:free",
    Google_Gemini_2_0_Flash = "google/gemini-2.0-flash-exp:free",
    Meta_Llama_3_1_70B = "meta-llama/llama-3.3-70b-instruct:free",
    Qwen_2_5_Coder = "qwen/qwen-2.5-coder-32b-instruct:free",
}

const CURRENT_MODEL = GTPModels.OpenAIGPT_OSS_20b;

export async function callOpenRouter(code: string): Promise<string> {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: CURRENT_MODEL,
            messages: [
                  { role: "system", content: "You are a senior software architect. Analyze and improve the given code, suggest refactoring, SOLID principles, and architectural improvements. When suggesting code improvements, always put the final replacement inside a single ```suggestion code block at the end of your response." },
                { role: "user", content: code }
            ]
        })
    });

    const data = await res.json() as IOpenrouterResponseApiResponse;
    return data.choices?.[0]?.message?.content || "No response from DevFlow.";
}

export async function callOpenRouterStream(
    code: string,
    onChunk: (chunk: string) => void,
    onDone?: () => void
) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: CURRENT_MODEL,
            stream: true, // IMPORTANT
            messages: [
                { role: "system", content: "You are a senior software architect. Analyze and improve the given code, suggest refactoring, SOLID principles, and architectural improvements. When suggesting code improvements, always put the final replacement inside a single ```suggestion code block at the end of your response." },
                { role: "user", content: code }
            ]
        })
    });

    if (!res.body) {
        throw new Error("No response body received from OpenRouter");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(line => line.trim() !== "");

        for (const line of lines) {
            if (line.startsWith("data: ")) {
                const jsonData = line.replace(/^data: /, "");
                if (jsonData === "[DONE]") {
                    if (onDone) onDone();
                    return;
                }

                try {
                    const parsed = JSON.parse(jsonData) as Partial<any>;
                    console.log("Parsed chunk:", parsed);
                    const token = parsed.choices?.[0]?.delta?.content;
                    console.log("Token:", token);
                    if (token) onChunk(token);
                } catch {
                    // Ignore malformed chunks
                }
            }
        }
    }
}
