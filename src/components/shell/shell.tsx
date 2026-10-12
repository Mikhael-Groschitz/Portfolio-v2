import type { ReactNode } from "react";
import { CheatsheetPanel } from "@/components/cheatsheet/cheatsheet-panel";
import { GuideProvider } from "@/components/cheatsheet/guide-context";
import { Tour } from "@/components/cheatsheet/tour";
import { ConnectDialog } from "@/components/connect/connect-dialog";
import { EasterEggProvider } from "@/components/easter-eggs/easter-egg-context";
import { GameOverlay } from "@/components/easter-eggs/game-overlay";
import { TimeTravelOverlay } from "@/components/easter-eggs/time-travel-overlay";
import { ObjectExplorer } from "@/components/explorer/object-explorer";
import { pageTexts } from "@/components/locale/page-locale";
import { ShellFrame } from "./shell-frame";
import { StatusBar } from "./status-bar";
import { TitleBar } from "./title-bar";
import { Toolbar } from "./toolbar";
import { Workspace } from "./workspace";
import { WorkspaceProvider } from "./workspace-context";

export async function Shell({ children }: Readonly<{ children: ReactNode }>) {
  const { shell } = await pageTexts();

  return (
    <WorkspaceProvider>
      <GuideProvider>
        <EasterEggProvider>
          <ShellFrame
            titleBar={<TitleBar />}
            toolbar={<Toolbar />}
            explorer={<ObjectExplorer />}
            explorerLabels={{
              title: shell.explorer.title,
              resize: shell.explorer.resize,
            }}
            workspace={<Workspace>{children}</Workspace>}
            guide={
              <CheatsheetPanel
                text={shell.cheatsheet}
                windowText={{
                  ...shell.window,
                  move: shell.cheatsheet.move,
                  close: shell.cheatsheet.close,
                }}
              />
            }
            statusBar={<StatusBar text={shell.status} />}
            tour={<Tour text={shell.tour} />}
            dialog={
              <ConnectDialog
                text={shell.connect}
                login={shell.connection.login}
              />
            }
            easterEggs={
              <>
                <TimeTravelOverlay
                  text={shell.connection.traveling}
                  arrivalText={shell.results.returned}
                />
                <GameOverlay text={shell.game} />
              </>
            }
          />
        </EasterEggProvider>
      </GuideProvider>
    </WorkspaceProvider>
  );
}
