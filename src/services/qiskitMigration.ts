import vscode from "vscode";

import { normalizeURL } from "../utilities/utils";
import { getExtensionContext } from "../globals/extensionContext";
import { currentModel } from "../commands/selectModel";

const config = vscode.workspace.getConfiguration("qiskitCodeAssistant")
const MIGRATION_SERVICE_URL = config.get<string>("migrationUrl") as string;

async function getErrorMessage(response: Response) {
  let msg = "An unknown error has occurred";
  if (!response.ok) {
    try {
      const jsonMsg = await response.json() as {detail: string};
      msg = jsonMsg?.detail || response.statusText;
      console.log(response.status, msg)
    } catch (err) {
      msg = await response.text();
    }
  }
  return msg;
}

function getServiceBaseUrl() {
  if (MIGRATION_SERVICE_URL) {
    return normalizeURL(MIGRATION_SERVICE_URL);
  } else {
    throw Error("Missing migration service URL. Check Qiskit Code Assistant settings.")
  }
}

function getHeaders(apiToken: string) {
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Caller': 'qiskit-vscode',
    'Authorization': `Bearer ${apiToken}`
  }
}

async function runFetch(endpoint: string | URL | Request, options: RequestInit) {
  try {
    const response = await fetch(endpoint, options);
    return response;
  } catch (err) {
    console.error(`Fetch failed for ${endpoint}: ${(err as Error).message}`)
    throw Error(`Fetch failed. Possible invalid service request or service is currently unavailable.`)
  }
}

async function getApiToken() {
  const context = getExtensionContext();
  const apiToken = await context?.secrets.get("apiToken");

  if (!apiToken) {
    throw Error("Missing API Token");
  }

  return apiToken;
}

export async function migrateCode(
  code: string,
  fromVersion?: string,
  toVersion?: string
): Promise<string> {
  // POST /migrate
  const endpoint = `${getServiceBaseUrl()}/migrate`;
  const apiToken = await getApiToken()
  const options = {
    'method': 'POST',
    'headers': getHeaders(apiToken),
    
    'body': JSON.stringify({
      code,
      model_id: currentModel?._id,
      version_from: fromVersion,
      version_to: toVersion
    })
  };

  const response = await runFetch(endpoint, options);

  if (response.ok) {
    const result = await response.json() as { result: string };
    return result.result
  } else {
    console.error("Error migrating code", response.status, response.statusText);
    throw Error(await getErrorMessage(response));
  }
}
