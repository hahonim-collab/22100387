const GITHUB_SETTINGS_KEY = "iqc_github_settings_v1";
const GITHUB_TOKEN_KEY = "iqc_github_token_v1";

function encodeBase64Unicode(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function normalizeGithubSettings(settings = {}) {
  return {
    owner: String(settings.owner || "").trim(),
    repo: String(settings.repo || "").trim(),
    branch: String(settings.branch || "main").trim() || "main",
    path: String(settings.path || "data/products.json").trim().replace(/^\/+/, "") || "data/products.json"
  };
}

function getGithubSettings() {
  try {
    return normalizeGithubSettings(JSON.parse(localStorage.getItem(GITHUB_SETTINGS_KEY) || "{}"));
  } catch {
    return normalizeGithubSettings();
  }
}

function saveGithubSettings(settings) {
  const normalized = normalizeGithubSettings(settings);
  localStorage.setItem(GITHUB_SETTINGS_KEY, JSON.stringify(normalized));
  return normalized;
}

function getGithubToken() {
  return sessionStorage.getItem(GITHUB_TOKEN_KEY) || "";
}

function saveGithubToken(token) {
  const value = String(token || "").trim();
  if (value) sessionStorage.setItem(GITHUB_TOKEN_KEY, value);
  else sessionStorage.removeItem(GITHUB_TOKEN_KEY);
}

function clearGithubToken() {
  sessionStorage.removeItem(GITHUB_TOKEN_KEY);
}

function validateGithubConfig(settings, token) {
  const normalized = normalizeGithubSettings(settings);
  if (!normalized.owner || !normalized.repo || !normalized.branch || !normalized.path) {
    throw new Error("GitHub 저장소 설정을 모두 입력해 주세요.");
  }
  if (!token) throw new Error("GitHub 토큰을 입력해 주세요.");
  return normalized;
}

function githubContentsUrl(settings) {
  const normalized = normalizeGithubSettings(settings);
  const encodedPath = normalized.path.split("/").map(encodeURIComponent).join("/");
  return `https://api.github.com/repos/${encodeURIComponent(normalized.owner)}/${encodeURIComponent(normalized.repo)}/contents/${encodedPath}`;
}

async function githubRequest(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; }
  catch { data = { message: text }; }

  if (!response.ok) {
    throw new Error(`GitHub API 오류: ${data.message || `HTTP ${response.status}`}`);
  }
  return data;
}

async function readGithubFile(settings, token) {
  const normalized = validateGithubConfig(settings, token);
  const url = `${githubContentsUrl(normalized)}?ref=${encodeURIComponent(normalized.branch)}&t=${Date.now()}`;
  return githubRequest(url, token);
}

async function testGithubConnection(settings, token) {
  const file = await readGithubFile(settings, token);
  return { path: file.path, sha: file.sha, size: file.size };
}

async function commitProductsToGithub(products, settings, token, message) {
  const normalized = validateGithubConfig(settings, token);
  let currentFile = null;

  try {
    currentFile = await readGithubFile(normalized, token);
  } catch (error) {
    if (!String(error.message).includes("Not Found")) throw error;
  }

  const body = {
    message: message || `내부품질기한 DB 업데이트 (${new Date().toLocaleString("ko-KR")})`,
    content: encodeBase64Unicode(JSON.stringify(products, null, 2) + "\n"),
    branch: normalized.branch
  };
  if (currentFile?.sha) body.sha = currentFile.sha;

  return githubRequest(githubContentsUrl(normalized), token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

window.IQC_GITHUB = {
  getGithubSettings,
  saveGithubSettings,
  getGithubToken,
  saveGithubToken,
  clearGithubToken,
  testGithubConnection,
  commitProductsToGithub
};
