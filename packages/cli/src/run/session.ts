import fs from "node:fs";
import path from "node:path";

import {
  AgentSession,
  AuthStorage,
  createAgentSession,
  DefaultResourceLoader,
  ModelRegistry,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";

function createModelsJson(
  sessionRootDir: string,
  provider: string,
  modelId: string,
) {
  const modelsJsonPath = path.join(sessionRootDir, "models.json");

  fs.writeFileSync(
    modelsJsonPath,
    JSON.stringify(
      { providers: { [provider]: { models: [{ id: modelId }] } } },
      null,
      2,
    ),
  );

  return modelsJsonPath;
}

type CreateSessionParams = {
  workspaceDir: string;
  sessionRootDir: string;
  systemPrompt: string;
  provider: string;
  modelId: string;
};

export async function buildAgentSession({
  workspaceDir,
  sessionRootDir,
  systemPrompt,
  provider,
  modelId,
}: CreateSessionParams) {
  const authStorage = AuthStorage.create(
    path.join(sessionRootDir, "auth.json"),
  );

  const modelsJsonPath = createModelsJson(sessionRootDir, provider, modelId);

  const modelRegistry = ModelRegistry.create(authStorage, modelsJsonPath);

  const model = modelRegistry.find(provider, modelId);

  if (!model) {
    throw new Error(`Could not resolve model: ${provider}/${modelId}`);
  }

  const loader = new DefaultResourceLoader({
    cwd: workspaceDir,
    agentDir: sessionRootDir,
    systemPromptOverride: () => systemPrompt,
  });

  await loader.reload();

  return createAgentSession({
    cwd: workspaceDir,
    model,
    thinkingLevel: "high",
    resourceLoader: loader,
    sessionManager: SessionManager.create(sessionRootDir),
    settingsManager: SettingsManager.create(sessionRootDir),
    authStorage,
    modelRegistry,
  });
}

export async function exportSession(
  session: AgentSession,
  sessionRootDir: string,
  outputDir: string,
) {
  await session.exportToHtml(path.join(sessionRootDir, "session.html"));

  session.exportToJsonl(path.join(sessionRootDir, "session.jsonl"));
  fs.copyFileSync(
    path.join(sessionRootDir, "session.jsonl"),
    path.join(outputDir, "session.jsonl"),
  );
}
