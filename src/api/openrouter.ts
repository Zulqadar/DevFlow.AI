import { IOpenrouterResponseApiResponse } from "../types/IOpenrouterResponse";

export async function callOpenRouter(code: string): Promise<string> {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "mistralai/mistral-small-3.1-24b-instruct:free",
            messages: [
                { role: "system", content: "You are a senior software architect. Analyze and improve the given code, suggest refactoring, SOLID principles, and architectural improvements." },
                { role: "user", content: code }
            ]
        })
    });

    const data = await res.json() as IOpenrouterResponseApiResponse;
    return data.choices?.[0]?.message?.content || "No response from DevFlow.";
}
