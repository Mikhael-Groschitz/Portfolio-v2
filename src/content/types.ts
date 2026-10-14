import type { ByProfile } from "./profiles";

export const SECTION_IDS = [
  "about",
  "tech-stack",
  "career",
  "projects",
  "beyond-the-terminal",
  "contact",
  "resume",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export function isSectionId(value: unknown): value is SectionId {
  return SECTION_IDS.some((id) => id === value);
}

export const INPUTS = ["keyboard", "touch"] as const;

export type Input = (typeof INPUTS)[number];

export type ByInput<T> = Record<Input, T>;

export type InputText = string | ByInput<string>;

export type YearMonth = `${number}-${number}`;

interface AboutRow {
  name: string;
  role: string;
  summary: string;
}

interface TechStackRow {
  category: string;
  technology: string;
}

interface CareerRow {
  company: string;
  role: string;
  startDate: YearMonth;
  endDate: YearMonth | null;
  description: string;
}

interface ProjectRow {
  name: string;
  categories: string[];
  description: string;
  stack: string[];
  repoUrl: string | null;
  demoUrl: string | null;
}

interface BeyondTheTerminalRow {
  trait: string;
  description: string;
}

interface ContactRow {
  channel: string;
  value: string;
  url: string;
}

interface ResumeRow {
  fileName: string;
  url: string;
}

interface SeoText {
  description: string;
  keywords: string[];
  sections: Record<SectionId, string>;
  imageAlt: string;
}

export type MenuId =
  | "file"
  | "edit"
  | "view"
  | "query"
  | "git"
  | "tools"
  | "extensions"
  | "window"
  | "help";

export type CommandId =
  | "connect"
  | "disconnect"
  | "newQuery"
  | "openFile"
  | "openFolder"
  | "closeDocument"
  | "save"
  | "saveAll"
  | "undo"
  | "redo"
  | "cut"
  | "copy"
  | "paste"
  | "find"
  | "selectAll"
  | "objectExplorer"
  | "resultsPane"
  | "cheatsheet"
  | "fullScreen"
  | "execute"
  | "parse"
  | "cancelQuery"
  | "estimatedPlan"
  | "queryDesigner"
  | "templateParameters"
  | "queryOptions"
  | "actualPlan"
  | "liveStatistics"
  | "clientStatistics"
  | "resultsToGrid"
  | "resultsToText"
  | "resultsToFile"
  | "cloneRepository"
  | "createRepository"
  | "openOnGitHub"
  | "gitSettings"
  | "options"
  | "manageExtensions"
  | "customizeMenu"
  | "closeAllDocuments"
  | "resetWindowLayout"
  | "openCheatsheet"
  | "tour"
  | "about"
  | "navigateBackward"
  | "navigateForward"
  | "databaseEngineQuery"
  | "deploy"
  | "editorConnect"
  | "editorDisconnect"
  | "commentLines"
  | "uncommentLines"
  | "decreaseIndent"
  | "increaseIndent"
  | "customizeToolbar"
  | "contact"
  | "share"
  | "explorerConnect"
  | "explorerStop"
  | "explorerFilter"
  | "explorerRefresh"
  | "activityMonitor"
  | "pinTab";

export type EditAction =
  | "typing"
  | "delete"
  | "paste"
  | "cut"
  | "complete"
  | "insert"
  | "comment"
  | "uncomment"
  | "indent"
  | "outdent";

export interface CountText {
  one: string;
  other: string;
}

export interface MenuText {
  label: string;
  more: string;
  menus: Record<MenuId, string>;
}

interface ToastText {
  illustrative: string;
  shared: string;
  shareFailed: string;
  clipboardBlocked: InputText;
  fullScreenBlocked: string;
}

interface SearchText {
  label: string;
  placeholder: string;
  empty: string;
  results: CountText;
  groups: { sections: string; commands: string; examples: string };
}

export interface AccountText {
  signIn: string;
  label: string;
  switchProfile: string;
  disconnect: string;
  profiles: ByProfile<string>;
}

export interface CornerText {
  channels: string;
}

export interface StatusText {
  ready: string;
  connecting: string;
  executing: string;
  succeeded: string;
  failed: string;
  canceled: string;
  repository: string;
  repositoryHint: string;
  notifications: string;
  tipsTitle: string;
  tips: ByInput<string[]>;
}

interface OptionsText {
  title: string;
  language: string;
  editor: string;
  zoom: string;
  motion: string;
  reduceMotion: string;
  systemMotion: string;
  ok: string;
  cancel: string;
}

interface AboutText {
  title: string;
  version: string;
  description: string;
  built: string;
  disclaimer: string;
  source: string;
  close: string;
}

export interface FindText {
  label: string;
  previous: string;
  next: string;
  close: string;
  count: string;
  none: string;
}

export interface ResultsText {
  heading: string;
  results: string;
  messages: string;
  rowNumber: string;
  rowsAffected: CountText;
  commandsCompleted: string;
  completionTime: string;
  errorHeader: string;
  similarHint: string;
  helpHint: string;
  offlineHint: string;
  dateHint: string;
  databaseChanged: string;
  travelFarewell: string;
  returned: string;
  regenerated: string;
  gameStarted: InputText;
  opensInNewTab: string;
  resize: string;
  collapse: string;
  expand: string;
  maximize: string;
  restore: string;
  executionTime: string;
  resultSet: string;
  resizeGrids: string;
  canceled: string;
  textResults: string;
}

export interface GameOverlayText {
  loading: string;
  touchOnly: string;
  exit: string;
}

export type CompletionKind = "keyword" | "table" | "procedure" | "database";

export interface QueryText {
  editorLabel: string;
  placeholder: InputText;
  suggestions: string;
  kinds: Record<CompletionKind, string>;
  help: {
    objects: Record<SectionId, string>;
    use: string;
    spHelp: string;
    spHelpObject: InputText;
    help: string;
  };
}

export interface CheatsheetText {
  title: string;
  close: string;
  move: string;
  resize: string;
  intro: InputText;
  sectionsTitle: string;
  newQuery: { label: string; description: string };
  sections: Record<SectionId, string>;
  exploreTitle: string;
  exploreIntro: InputText;
  examples: { command: string; description: InputText }[];
}

export type TourStepId = "query" | "tables" | "cheatsheet";

export interface TourText {
  progress: string;
  skip: string;
  next: string;
  done: string;
  steps: Record<TourStepId, { title: InputText; text: InputText }>;
  compactTablesText: string;
  compactCheatsheetText: string;
  menuCheatsheetText: string;
}

export interface ConnectionText {
  connected: string;
  disconnected: string;
  executing: string;
  succeeded: string;
  failed: string;
  canceled: string;
  traveling: string;
  login: ByProfile<string>;
  rows: CountText;
  timeTravel: string;
}

export interface ConnectText {
  title: string;
  close: string;
  brand: string;
  tabs: {
    login: string;
    connectionProperties: string;
    additionalParameters: string;
  };
  login: {
    server: string;
    serverType: string;
    serverTypeValue: string;
    serverName: string;
    authentication: string;
    profiles: ByProfile<string>;
    userName: string;
    password: string;
    rememberPassword: string;
    security: string;
    encryption: string;
    encryptionValue: string;
    trustCertificate: string;
    hostName: string;
  };
  properties: {
    intro: string;
    database: string;
    network: string;
    protocol: string;
    defaultValue: string;
    packetSize: string;
    bytes: string;
    connection: string;
    connectionTimeout: string;
    executionTimeout: string;
    seconds: string;
    customColor: string;
    selectColor: string;
    resetAll: string;
  };
  parameters: {
    label: string;
    hint: string;
  };
  buttons: {
    connect: string;
    connecting: string;
    cancel: string;
    help: string;
    options: string;
  };
  help: {
    title: string;
    body: InputText[];
    close: string;
  };
}

export interface WindowText {
  menu: string;
  moveHint: ByInput<string | null>;
  float: string;
  dock: string;
  autoHide: string;
  hide: string;
}

export interface ShellText {
  windowTitle: string;
  languageName: string;
  skipToContent: string;
  menu: MenuText;
  toolbar: {
    standard: string;
    sqlEditor: string;
    explorer: string;
    databases: string;
    database: string;
    more: string;
    backList: string;
    openList: string;
    undoList: string;
    redoList: string;
  };
  window: WindowText;
  explorer: {
    title: string;
    hint: string;
    connect: string;
    disconnect: string;
    close: string;
    move: string;
    resize: string;
    databases: string;
    tables: string;
    programmability: string;
    storedProcedures: string;
  };
  editor: {
    tabsLabel: string;
    openTabs: string;
    noIssues: string;
    zoom: string;
    line: string;
    column: string;
    actions: Record<EditAction, string>;
  };
  commands: Record<CommandId, string>;
  toast: ToastText;
  search: SearchText;
  account: AccountText;
  corner: CornerText;
  options: OptionsText;
  about: AboutText;
  find: FindText;
  workspace: {
    start: InputText;
    noScript: string;
  };
  notFound: {
    title: string;
    back: string;
  };
  scripts: Record<SectionId, InputText[]>;
  results: ResultsText;
  query: QueryText;
  cheatsheet: CheatsheetText;
  tour: TourText;
  game: GameOverlayText;
  connection: ConnectionText;
  connect: ConnectText;
  status: StatusText;
}

export interface Texts {
  about: AboutRow;
  techStack: TechStackRow[];
  career: CareerRow[];
  projects: ProjectRow[];
  beyondTheTerminal: BeyondTheTerminalRow[];
  contact: { intro: string; channels: ContactRow[] };
  resume: ResumeRow;
  sections: Record<SectionId, string>;
  seo: SeoText;
  shell: ShellText;
}

export interface Tables {
  about: AboutRow[];
  "tech-stack": TechStackRow[];
  career: CareerRow[];
  projects: ProjectRow[];
  "beyond-the-terminal": BeyondTheTerminalRow[];
  contact: ContactRow[];
  resume: ResumeRow[];
}
