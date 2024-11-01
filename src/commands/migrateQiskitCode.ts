import vscode from "vscode";
import { migrateCode } from "../services/qiskitMigration";
import { setDefaultStatus, setLoadingStatus } from "../statusBar/statusBar";

let isRunning = false;

async function handler(): Promise<void> {
  console.log("qiskit-vscode.migrate-code::handler");

  const editor = vscode.window.activeTextEditor;
  if (!editor || isRunning) {
    return; // No open text editor or already running
  }

  isRunning = true;
  setLoadingStatus();

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

  const message = selection.isEmpty ? "Do you want to migrate the entire document?" : "Do you want to migrate the selected lines of text?";
  const runMigrate = await vscode.window.showInformationMessage(message, "Yes", "No");

  if (runMigrate === "No") {
    setDefaultStatus();
    isRunning = false;
    return;
  }

  const notificationTitle = `Reviewing and migrating the ${selection.isEmpty ? "document" : "selected"} code. Please wait...` 
  const migratedText = await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    cancellable: false,
    title: notificationTitle
  }, async (progress):Promise<string> => {
    
    progress.report({  increment: 0 });

    const t = await migrateCode(text);

    progress.report({ increment: 100 });
    return t;
  });

  // const migratedText =  await migrateCode(text);

  editor.edit(editBuilder => {
    editBuilder.replace(textRange, migratedText);
  });
  const migratedLines = migratedText.split("\n");
  const newLastLine = firstLine.lineNumber + migratedLines.length - 1;
  const lastChar = migratedLines[migratedLines.length - 1].length + 1;
  const lastPosition = new vscode.Position(newLastLine, lastChar);
  
  editor.selection = new vscode.Selection(firstLine.range.start, lastPosition);
  vscode.window.showInformationMessage(infoMsg);

  setDefaultStatus();
  isRunning = false;
}

const command: CommandModule = {
  identifier: "qiskit-vscode.migrate-code",
  handler,
};

export default command;
