import vscode from "vscode";
import { migrateCode } from "../services/qiskitMigration";


async function handler(): Promise<void> {
  console.log("qiskit-vscode.migrate-code::handler");

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return; // No open text editor
  }

  const selection = editor.selection;
  let firstLine: vscode.TextLine;
  let lastLine: vscode.TextLine;
  let infoMsg: string;

  if (selection.isEmpty) {
    firstLine = editor.document.lineAt(0);
    lastLine = editor.document.lineAt(editor.document.lineCount - 1);
    infoMsg = "Document successfully migrated";
  } else {
    firstLine = editor.document.lineAt(selection.start.line);
    lastLine = editor.document.lineAt(selection.end.line);
    infoMsg = "Selected code successfully migrated";
  }

  const textRange = new vscode.Range(firstLine.range.start, lastLine.range.end);
  const text = editor.document.getText(textRange);

  const migratedText = await migrateCode(text);
  editor.edit(editBuilder => {
    editBuilder.replace(textRange, migratedText);
  });
  const migratedLines = migratedText.split("\n");
  const newLastLine = firstLine.lineNumber + migratedLines.length - 1;
  const lastChar = migratedLines[migratedLines.length - 1].length + 1;
  const lastPosition = new vscode.Position(newLastLine, lastChar);
  
  editor.selection = new vscode.Selection(firstLine.range.start, lastPosition);
  vscode.window.showInformationMessage(infoMsg)
}

const command: CommandModule = {
  identifier: "qiskit-vscode.migrate-code",
  handler,
};

export default command;
