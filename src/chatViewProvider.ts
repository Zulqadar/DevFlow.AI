import * as vscode from "vscode";
import { getNonce } from "./utils";
import { callOpenRouter, callOpenRouterStream } from "./api/openrouter";

export class ChatPanel {
    public static currentPanel: ChatPanel | undefined;
    public static readonly viewType = "devflowChat";

    private readonly panel: vscode.WebviewPanel;
    private readonly extensionUri: vscode.Uri;
    private disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.ViewColumn.Beside;

        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel.panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            "devflowChat",
            "DevFlow Chat",
            column,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, "media"),
                ],
            }
        );

        ChatPanel.currentPanel = new ChatPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this.panel = panel;
        this.extensionUri = extensionUri;

        this.panel.webview.html = this._getHtmlForWebview(this.panel.webview);

        // 🔹 Listen for messages from the Webview
        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                const userMessage = message.content;
                // Show in UI immediately
                await this.sendMessageToWebview({ role: "user", content: userMessage, isStreaming: false });

                let fullChunk = "";
                // Get AI response
                const AIResponse = await callOpenRouterStream(userMessage, (chunk: string) => {
                    // Send each chunk to the webview UI
                    fullChunk += chunk;
                    this.sendMessageToWebview({ role: "ai", content: chunk, isStreaming: true });
                }, () => {
                    console.log("Stream completed");
                    this.sendMessageToWebviewWithParsing({ role: "ai", content: fullChunk, isStreaming: false });
                });

                //await this.sendMessageToWebview({ role: "ai", content: AIResponse });
            },
            null,
            this.disposables
        );

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }

    public async sendMessageToWebview(message: any) {
        this.panel.webview.postMessage({
            role: message.role,
            content: message.content,
            isStreaming: message.isStreaming || false,
        });
    }

    public async sendMessageToWebviewWithParsing(message: any) {
        const { marked } = await import("marked");
        const parsedMessage = message.role === "ai" ? marked.parse(message.content) : message.content;
        this.panel.webview.postMessage({
            role: message.role,
            content: parsedMessage,
            isStreaming: message.isStreaming || false,
        });
    }

    // This is what gets called from deserializeWebviewPanel
    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        ChatPanel.currentPanel = new ChatPanel(panel, extensionUri);
    }

    public dispose() {
        ChatPanel.currentPanel = undefined;

        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, "media", "chat.js")
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, "media", "chat.css")
        );
        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>DevFlow Chat</title>
    <link rel="stylesheet" href="${styleUri}">
    <script src="https://cdn.tailwindcss.com"></script>
    
</head>

<body>
    <div class="container mx-auto px-4 py-8 max-w-4xl">
        <!-- Header -->
        <div class="text-center mb-8">
            <div class="flex items-center justify-center gap-3 mb-4">
                <div
                    class="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z">
                        </path>
                    </svg>
                </div>
                <h1 class="text-4xl font-bold text-white">DevFlow</h1>
            </div>
        </div>

        <!-- Chat Container -->
        <div class="glass-dark rounded-2xl shadow-2xl overflow-hidden border border-gray-700/50">
            <!-- Messages Area -->
            <div id="messages" class="h-[48rem] overflow-y-auto p-6 space-y-4 scrollbar-dark">
                <!-- Messages will render here dynamically -->
            </div>

            <!-- Input Container -->
            <div class="p-6 bg-gray-900/50 border-t border-gray-700/50">
                <div class="flex gap-3 items-end">
                    <div class="flex-1 relative">
                        <textarea id="userInput" placeholder="Type your prompt..." rows="1"
                            class="w-full bg-gray-800/60 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-gray-800/80 transition-all duration-200 border border-gray-700/50"></textarea>
                    </div>
                    <button id="sendBtn"
                        class="send-button bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                        </svg>
                        Send
                    </button>
                </div>
            </div>
        </div>
    </div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>

</html>`;
    }
}
