import * as vscode from "vscode";
import CodeAssistantInlineCompletionItem from "../inlineSuggestions/inlineCompletionItem";
import runCompletion from "./runCompletion";
import { AutocompleteResult, ResultEntry } from "../binary/requests/requests";
import { isMultiline } from "./utils";
import handleGetCompletion from "../commands/handleGetCompletion";

const INLINE_REQUEST_TIMEOUT = 3000;

// this will be used to collect the chunks of streaming data
const callsForCompletions = new Map<string, CodeAssistantInlineCompletionItem>();

function createDecorationType(): vscode.TextEditorDecorationType {
  return vscode.window.createTextEditorDecorationType({
    after: {
      margin: "0 0 0 1ch",
      color: new vscode.ThemeColor("editorGhostText.foreground"),
    },
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
  });
}

function extractCompletionParts(text: string): { before: string; after: string } {
  const lastNewline = text.lastIndexOf("\n");
  if (lastNewline === -1) return { before: "", after: text };
  return {
    before: text.slice(0, lastNewline + 1),
    after: text.slice(lastNewline + 1),
  };
}

function calculateRange(
  position: vscode.Position,
  response: AutocompleteResult,
  result: ResultEntry
): vscode.Range {
  return new vscode.Range(
    position.translate(0, -response.old_prefix.length),
    isMultiline(result.old_suffix)
      ? position
      : position.translate(0, result.old_suffix.length)
  );
}

function toCompletionItem(
  insertText: string,
  position: vscode.Position,
  autoCompleteResult: AutocompleteResult,
  resultEntry: ResultEntry
) {
  return new CodeAssistantInlineCompletionItem(
    insertText,
    resultEntry,
    calculateRange(position, autoCompleteResult, resultEntry),
    undefined,
    resultEntry.completion_metadata?.model_id,
    resultEntry.completion_metadata?.prompt_id,
    resultEntry.completion_metadata?.input,
    resultEntry.completion_metadata?.output,
    resultEntry.completion_metadata?.completion_kind,
    resultEntry.completion_metadata?.is_cached,
    resultEntry.completion_metadata?.snippet_context
  )
}

export default async function getInlineCompletionItems(
  document: vscode.TextDocument,
  position: vscode.Position,
  resolver: CallableFunction
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document !== document) return;

  // If cursor is on the last line, insert a new blank line so ghostText can render below
  if (position.line === document.lineCount - 1) {
    await editor.edit(edit => {
      edit.insert(new vscode.Position(document.lineCount, 0), "\n");
    });
    const lastLine = document.lineAt(document.lineCount - 2);
    const newPosition = new vscode.Position(document.lineCount - 2, lastLine.text.length);
    editor.selection = new vscode.Selection(newPosition, newPosition);
  }

  const ghostDeco = createDecorationType();
  let accumulated = "\n";
  let appendedSoFar = "";
  let lastResolvedText = "";
  let cancelled = false;

  const docChangeDisposable = vscode.workspace.onDidChangeTextDocument(e => {
    if (e.document === document) cancelled = true;
  });

  const isEmptyLine = document.lineAt(position.line).text.trim().length === 0;
  const completionId = `${document.uri.toString()}-${position.line}-${position.character}`;
  let completionItem = callsForCompletions.get(completionId);

  if (completionItem && completionItem.insertText) {
    resolver(new vscode.InlineCompletionList([completionItem]));
    return;
  }

  try {
    // get streaming response
    const completionGenerator = runCompletion(
      document,
      position,
      isEmptyLine ? INLINE_REQUEST_TIMEOUT : undefined
    );

    // loop through streaming data
    for await (let chunk of completionGenerator) {
      if (cancelled) break;
      const result = chunk?.results[0]
      if (!result) return;
      
      //strip off any overlap at the start of result.new_prefix
      const nextText = result.new_prefix;
      let toAdd = nextText;
      if (appendedSoFar && nextText.startsWith(appendedSoFar)) {
        toAdd = nextText.slice(appendedSoFar.length);
      }

      // Append only the non‐overlapping part
      accumulated += toAdd;

      // Update appendedSoFar to the last word (plus a space) of what we've shown so far
      const words = accumulated.trim().split(/\s+/);
      const lastWord = words.length ? words[words.length - 1] : "";
      appendedSoFar = lastWord ? lastWord + " " : "";

      const { before, after } = extractCompletionParts(accumulated);

      // Show ghost text on the line below (now guaranteed to exist)
      const ghostLine = position.line + 1;
      const ghostCol = document.lineAt(ghostLine).range.end.character;
      const ghostPos = new vscode.Position(ghostLine, ghostCol);
      editor.setDecorations(ghostDeco, [
        {
          range: new vscode.Range(ghostPos, ghostPos),
          renderOptions: { after: { contentText: after } },
        },
      ]);

      // Only show inline suggestion when we cross a newline boundary
      if (before && before !== lastResolvedText && before.length > lastResolvedText.length && before.length > 0) {
        lastResolvedText = before;
        // Create or update inline completion item
        if (!completionItem) {
          // Use `before` (the full chunk up to the newline) as the insertText
          completionItem = toCompletionItem(before, position, chunk, result);
          callsForCompletions.set(completionId, completionItem);
        } else {
          completionItem.insertText = before;
        }
        resolver(new vscode.InlineCompletionList([completionItem]));
        setTimeout(handleGetCompletion.handler, 10);
      }
    }
  } catch (error) {
    console.error('Error streaming completions:', error);
  } finally {
    ghostDeco.dispose();
    docChangeDisposable.dispose();
    if (completionItem) {
      completionItem.insertText = accumulated;
      resolver(new vscode.InlineCompletionList([completionItem]));
      setTimeout(handleGetCompletion.handler, 10);
    }
    setTimeout(() => {
      if (callsForCompletions.has(completionId)) {
        callsForCompletions.delete(completionId);
      }
    }, 500);
  }
}