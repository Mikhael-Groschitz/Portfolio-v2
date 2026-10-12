import type { ReactNode } from "react";
import { CheatsheetPanel } from "@/components/cheatsheet/cheatsheet-panel";
import { GuideProvider } from "@/components/cheatsheet/guide-context";
import { Tour } from "@/components/cheatsheet/tour";
import { ConnectDialog } from "@/components/connect/connect-dialog";
import { EasterEggProvider } from "@/components/easter-eggs/easter-egg-context";
import { GameOverlay } from "@/components/easter-eggs/game-overlay";
import { TimeTravelOverlay } from "@/components/easter-eggs/time-travel-overlay";
import { ObjectExplorer } from "@/components/explorer/object-explorer";
import { localize } from "@/content";
import { ShellFrame } from "./shell-frame";
import { StatusBar } from "./status-bar";
import { TitleBar } from "./title-bar";
import { Toolbar } from "./toolbar";
import { Workspace } from "./workspace";
import { WorkspaceProvider } from "./workspace-context";

export function Shell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <WorkspaceProvider>
      <GuideProvider>
        <EasterEggProvider>
          <ShellFrame
            titleBar={<TitleBar />}
            toolbar={<Toolbar />}
            explorer={<ObjectExplorer />}
            explorerLabels={localize((texts) => ({
              title: texts.shell.explorer.title,
              resize: texts.shell.explorer.resize,
            }))}
            workspace={<Workspace>{children}</Workspace>}
            guide={
              <CheatsheetPanel
                text={localize((texts) => texts.shell.cheatsheet)}
                windowText={localize((texts) => ({
                  ...texts.shell.window,
                  move: texts.shell.cheatsheet.move,
                  close: texts.shell.cheatsheet.close,
                }))}
              />
            }
            statusBar={
              <StatusBar text={localize((texts) => texts.shell.status)} />
            }
            tour={<Tour text={localize((texts) => texts.shell.tour)} />}
            dialog={
              <ConnectDialog
                text={localize((texts) => texts.shell.connect)}
                login={localize((texts) => texts.shell.connection.login)}
              />
            }
            easterEggs={
              <>
                <TimeTravelOverlay
                  text={localize((texts) => texts.shell.connection.traveling)}
                  arrivalText={localize(
                    (texts) => texts.shell.results.returned,
                  )}
                />
                <GameOverlay text={localize((texts) => texts.shell.game)} />
              </>
            }
          />
        </EasterEggProvider>
      </GuideProvider>
    </WorkspaceProvider>
  );
}
