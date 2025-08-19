import * as vscode from 'vscode';
import { callOpenRouterStream } from './api/openrouter';
import { ChatPanel } from './chatViewProvider';

export function activate(context: vscode.ExtensionContext) {
    // Open chat panel manually
    context.subscriptions.push(
        vscode.commands.registerCommand("devflow.openChat", () => {
            ChatPanel.createOrShow(context.extensionUri);
        })
    );

    // Analyze code
    const disposable = vscode.commands.registerCommand(
        'devflow.analyzeCode',
        async (uri?: vscode.Uri) => {
            let codeToAnalyze = '';

            const editor = vscode.window.activeTextEditor;
            if (uri) {
                const doc = await vscode.workspace.openTextDocument(uri);
                codeToAnalyze = doc.getText();
            } else if (editor) {
                codeToAnalyze = editor.selection.isEmpty
                    ? editor.document.getText()
                    : editor.document.getText(editor.selection);
            }

            if (!codeToAnalyze.trim()) {
                vscode.window.showWarningMessage("No code found to analyze.");
                return;
            }

            // Open chat panel
            ChatPanel.createOrShow(context.extensionUri);
            const panel = ChatPanel.currentPanel;

            // Send user input to webview
            await panel?.sendMessageToWebview({ role: "user", content: codeToAnalyze, isStreaming: false });

            let fullChunk = "";
            await callOpenRouterStream(
                codeToAnalyze,
                (chunk: string) => {
                    fullChunk += chunk;
                    panel?.sendMessageToWebview({ role: "ai", content: chunk, isStreaming: true });
                },
                async () => {
                    panel?.sendMessageToWebviewWithParsing({ role: "ai", content: fullChunk, isStreaming: false });

                    // ✅ After AI finishes, extract suggested code
                    const suggestedCode = extractSuggestedCode(fullChunk);
                    if (suggestedCode && editor) {
                        const accept = await vscode.window.showInformationMessage(
                            "DevFlow has a suggested replacement. Apply it?",
                            "Yes", "No"
                        );

                        if (accept === "Yes") {
                            editor.edit(editBuilder => {
                                if (editor.selection.isEmpty) {
                                    // Replace entire file
                                    const fullRange = new vscode.Range(
                                        editor.document.positionAt(0),
                                        editor.document.positionAt(editor.document.getText().length)
                                    );
                                    editBuilder.replace(fullRange, suggestedCode);
                                } else {
                                    // Replace only selection
                                    editBuilder.replace(editor.selection, suggestedCode);
                                }
                            });
                        }
                    }
                }
            );
        }
    );

    context.subscriptions.push(disposable);

    vscode.window.registerWebviewPanelSerializer(ChatPanel.viewType, {
        async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel) {
            ChatPanel.revive(webviewPanel, context.extensionUri);
        }
    });
}

export function deactivate() { }

// Helper to extract code blocks from AI's HTML/Markdown response
function extractSuggestedCode(content: string): string | null {
    const match = content.match(/```suggestion([\s\S]*?)```/);
    return match ? match[1].trim() : null;
}

// Decode HTML entities back into real characters
function decodeHTMLEntities(text: string): string {
    return text
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, "\"")
        .replace(/&#39;/g, "'");
}
