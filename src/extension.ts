import * as vscode from 'vscode';
import { callOpenRouter } from './api/openrouter';
import { ChatPanel } from './chatViewProvider';

export function activate(context: vscode.ExtensionContext) {

	// Command to open the chat panel manually
	context.subscriptions.push(
		vscode.commands.registerCommand("devflow.openChat", () => {
			ChatPanel.createOrShow(context.extensionUri);
		})
	);

	// Command to analyze selected code or whole file
	const disposable = vscode.commands.registerCommand(
		'devflow.analyzeCode',
		async (uri?: vscode.Uri) => {
			let codeToAnalyze = '';

			if (uri) {
				// Right-clicked a file in Explorer
				const doc = await vscode.workspace.openTextDocument(uri);
				codeToAnalyze = doc.getText();
			} else {
				// Right-clicked in editor
				const editor = vscode.window.activeTextEditor;
				if (!editor) {
					vscode.window.showErrorMessage("No active editor or file selected.");
					return;
				}
				codeToAnalyze = editor.selection.isEmpty
					? editor.document.getText()
					: editor.document.getText(editor.selection);
			}

			if (!codeToAnalyze.trim()) {
				vscode.window.showWarningMessage("No code found to analyze.");
				return;
			}

			// Open the chat panel
			ChatPanel.createOrShow(context.extensionUri);
			const panel = ChatPanel.currentPanel;

			// Send the user's code to the webview UI
			await panel?.sendMessageToWebview({ role: "user", content: codeToAnalyze });

			// Call OpenRouter and get the AI's response
			const result = await callOpenRouter(codeToAnalyze);

			// Send the AI's response to the webview UI
			await panel?.sendMessageToWebview({ role: "ai", content: result });
		}
	);

	context.subscriptions.push(disposable);

	// Listen for messages from the webview
	vscode.window.registerWebviewPanelSerializer(ChatPanel.viewType, {
		async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel) {
			ChatPanel.revive(webviewPanel, context.extensionUri);
		}
	});
}

export function deactivate() { }
