import acceptDisclaimer from "./acceptDisclaimer";
import acceptSuggestion from "./acceptSuggestion";
import selectModel from "./selectModel";
import handleGetCompletion from "./handleGetCompletion";
import handleStatusBar from "./handleStatusBar";
import setApiToken from "./setApiToken";
import migrateQiskitCode from "./migrateQiskitCode";

const commands: CommandModule[] = [
  acceptDisclaimer,
  acceptSuggestion,
  handleGetCompletion,
  handleStatusBar,
  migrateQiskitCode,
  selectModel,
  setApiToken,
];

export default commands.map((command) => ({
  ...command,
}));
