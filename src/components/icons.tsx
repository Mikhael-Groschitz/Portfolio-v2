import type { ReactNode } from "react";
import styles from "./icons.module.css";

interface IconProps {
  className?: string;
  size?: number;
}

function Icon({
  children,
  className,
  size = 16,
  viewBox = "0 0 16 16",
}: Readonly<IconProps & { children: ReactNode; viewBox?: string }>) {
  return (
    <svg
      viewBox={viewBox}
      width={size}
      height={size}
      aria-hidden="true"
      className={className ? `${styles.icon} ${className}` : styles.icon}
    >
      {children}
    </svg>
  );
}

export function AppIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props} viewBox="0 0 32 32">
      <g className={`${styles.app} ${styles.appInk}`}>
        <ellipse cx="16" cy="9" rx="12" ry="5" />
        <path d="M4 9v14a12 5 0 0 0 24 0V9" />
        <path d="M4 16a12 5 0 0 0 24 0" />
        <path d="M10.5 17.3h6M20.5 17.3h0M11.5 24.3h0M15.5 24.3h6" />
      </g>
      <path
        className={`${styles.app} ${styles.appCode}`}
        d="M12.5 6.8 10.3 9l2.2 2.2M19.5 6.8 21.7 9l-2.2 2.2M16.9 6.2l-1.8 5.6"
      />
    </Icon>
  );
}

export function ExpanderIcon({
  expanded,
  ...props
}: Readonly<IconProps & { expanded: boolean }>) {
  return (
    <Icon {...props}>
      <rect
        className={styles.expanderBox}
        x="3.5"
        y="3.5"
        width="10"
        height="10"
      />
      <path
        className={styles.expanderGlyph}
        d={expanded ? "M6 8.5h5" : "M6 8.5h5M8.5 6v5"}
      />
    </Icon>
  );
}

export function ServerIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <ellipse cx="7" cy="3.5" rx="5" ry="2" />
      <path d="M2 3.5v8.5c0 1.1 2.2 2 5 2s5-.9 5-2V3.5" />
      <circle className={styles.badge} cx="12" cy="12" r="3.5" />
      <path className={styles.badgeMark} d="M11 10.2v3.6l2.8-1.8z" />
    </Icon>
  );
}

export function FolderIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path className={styles.folder} d="M1 3h5l1.5 1.5H15V13H1z" />
    </Icon>
  );
}

export function DatabaseIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <ellipse cx="8" cy="3.5" rx="5.5" ry="2" />
      <path d="M2.5 3.5v9c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-9" />
    </Icon>
  );
}

export function TableIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <rect x="1.5" y="2.5" width="13" height="11" />
      <rect className={styles.solid} x="2" y="3" width="12" height="2.5" />
      <path d="M1.5 9.5h13M5.5 5.5v8M10.5 5.5v8" />
    </Icon>
  );
}

export function ProcedureIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M3.5 1.5h6l3 3v10h-9z" />
      <path d="M9.5 1.5v3h3M5.5 7.5h5M5.5 9.5h5M5.5 11.5h3" />
    </Icon>
  );
}

export function KeywordIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <rect x="1.5" y="3.5" width="13" height="9" rx="1" />
      <path d="M4 6.5h8M4 9.5h5" />
    </Icon>
  );
}

export function NewQueryIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M2.5 1.5h6l3 3v10h-9z" />
      <path d="M8.5 1.5v3h3M4.5 8.5h5M4.5 10.5h5M4.5 12.5h3" />
      <path d="M13.5 1v4M11.5 3h4" />
    </Icon>
  );
}

export function ExecuteIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M4.5 2.5v11l9-5.5z" />
    </Icon>
  );
}

export function ExplorerIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <rect x="1.5" y="1.5" width="4" height="4" />
      <rect x="9.5" y="5.5" width="4" height="4" />
      <rect x="9.5" y="10.5" width="4" height="4" />
      <path d="M3.5 5.5v7h6M3.5 7.5h6" />
    </Icon>
  );
}

export function MenuIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M2 4.5h12M2 8.5h12M2 12.5h12" />
    </Icon>
  );
}

export function CaretDownIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path className={styles.solid} d="M4.5 6.5h7l-3.5 3.5z" />
    </Icon>
  );
}

export function CloseIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </Icon>
  );
}

export function PinIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M1.5 8.5h4M5.5 5.5v6M5.5 6.5h7v4h-7M10.5 6.5v4" />
    </Icon>
  );
}

export function ChevronIcon({
  direction,
  ...props
}: Readonly<IconProps & { direction: "up" | "down" }>) {
  return (
    <Icon {...props}>
      <path d={direction === "up" ? "M4 10l4-4 4 4" : "M4 6l4 4 4-4"} />
    </Icon>
  );
}

export function MaximizeIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M3.5 3.5h9v9h-9zM3.5 5.5h9" />
    </Icon>
  );
}

export function RestoreIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M3.5 6.5h6v6h-6zM3.5 8h6M6.5 6.5v-3h6v6h-3" />
    </Icon>
  );
}

export function PlugIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M6.5 1.5v3M9.5 1.5v3M8 11.5v3" />
      <path className={styles.solid} d="M4.5 4.5h7v3a3.5 3.5 0 0 1-7 0z" />
    </Icon>
  );
}

export function DisconnectIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M9.5 1.5v3M12.5 1.5v3M11 11.5v3" />
      <path className={styles.solid} d="M7.5 4.5h7v3a3.5 3.5 0 0 1-7 0z" />
      <path className={styles.danger} d="M1.5 1.5l4 4M5.5 1.5l-4 4" />
    </Icon>
  );
}

export function StopIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <rect className={styles.solid} x="4" y="4" width="8" height="8" />
    </Icon>
  );
}

export function FilterIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path className={styles.solid} d="M2 2.5h12l-4.5 5.5v6l-3-2v-4z" />
    </Icon>
  );
}

export function RefreshIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M12.6 4.6A5.5 5.5 0 1 0 13.5 8" />
      <path className={styles.solid} d="M10.5 2.5h4v4z" />
    </Icon>
  );
}

export function ActivityIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <rect x="1.5" y="2.5" width="13" height="9" rx="1" />
      <path d="M3.5 7.5h2l1-2 2 4 1-2h3M5.5 14.5h5M8 11.5v3" />
    </Icon>
  );
}

export function CheckCircleIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <circle className={styles.check} cx="8" cy="8" r="6.5" />
      <path className={styles.checkMark} d="M5 8.2l2 2 4-4.4" />
    </Icon>
  );
}

export function ConnectedIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path
        className={styles.statusInkLine}
        d="M4.5 0.5v3M8.5 0.5v3M6.5 10v4"
      />
      <path className={styles.statusInk} d="M2.5 3.5h8v2.5a4 4 0 0 1-8 0z" />
      <circle className={styles.statusBadge} cx="12" cy="12" r="3.5" />
      <path className={styles.statusBadgeMark} d="M10.3 12.1l1.2 1.2 2.2-2.4" />
    </Icon>
  );
}

export function ReadyIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M1.5 2.5h13v9h-5l-1.5 2-1.5-2h-5z" />
    </Icon>
  );
}

export function GridIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <rect x="1.5" y="1.5" width="13" height="13" />
      <path d="M1.5 5.5h13M1.5 10h13M5.5 1.5v13M10 1.5v13" />
    </Icon>
  );
}

export function MessagesIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M2.5 1.5h7l3 3v10h-10z" />
      <path d="M9.5 1.5v3h3M4.5 7.5h6M4.5 9.5h6M4.5 11.5h4" />
    </Icon>
  );
}

export function SuccessIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <circle className={styles.statusBadge} cx="8" cy="8" r="6.5" />
      <path className={styles.statusBadgeMark} d="M4.8 8.2l2.2 2.2 4.2-4.6" />
    </Icon>
  );
}

export function WarningIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path className={styles.warning} d="M8 1.5l6.8 12.5H1.2z" />
      <path className={styles.warningMark} d="M8 6v3.6M8 11v1.2" />
    </Icon>
  );
}

export function SpinnerIcon(props: Readonly<IconProps>) {
  const className = props.className
    ? `${styles.spinner} ${props.className}`
    : styles.spinner;
  return (
    <Icon {...props} className={className}>
      <circle className={styles.spinnerTrack} cx="8" cy="8" r="5.5" />
      <path d="M8 2.5a5.5 5.5 0 0 1 5.5 5.5" strokeWidth="1.6" />
    </Icon>
  );
}

export function SearchIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <circle cx="6.5" cy="6.5" r="4.5" />
      <path d="M10 10l4.5 4.5" />
    </Icon>
  );
}

export function SignInIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <circle cx="9.5" cy="5" r="2.5" />
      <path d="M5.5 14.5v-1a4 4 0 0 1 8 0v1z" />
      <circle className={styles.badge} cx="4" cy="4" r="3" />
      <path
        className={styles.badgeMark}
        d="M2.4 3.5h3.2v1H2.4zM3.5 2.4h1v3.2h-1z"
      />
    </Icon>
  );
}

export function ProfileIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="5" r="3" />
      <path d="M2.5 14.5v-1a5.5 5 0 0 1 11 0v1z" />
    </Icon>
  );
}

export function FeedbackIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M1.5 2.5h13v8h-7l-3 3v-3h-3z" />
      <path d="M4.5 5.5h7M4.5 7.5h5" />
    </Icon>
  );
}

export function ShareIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <circle cx="4.5" cy="8" r="2" />
      <path d="M1 14.5a3.5 3.5 0 0 1 7 0" />
      <path d="M8.5 1.5h6v4.5h-3l-2 2v-2h-1z" />
    </Icon>
  );
}

export function RepositoryIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M1.5 2.5h13v3h-13zM2.5 5.5v8h11v-8M6 8.5h4" />
    </Icon>
  );
}

export function BellIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M3.5 11.5v-4a4.5 4.5 0 0 1 9 0v4l1 1.5h-11z" />
      <path d="M6.5 14.5h3" />
    </Icon>
  );
}

export function NavigateBackIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="6.5" />
      <path d="M11 8H5.5M7.5 5.5 5 8l2.5 2.5" />
    </Icon>
  );
}

export function NavigateForwardIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="6.5" />
      <path d="M5 8h5.5M8.5 5.5 11 8l-2.5 2.5" />
    </Icon>
  );
}

export function OpenFileIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M5.5 6.5v8h8v-7l-3-3h-1M10.5 4.5v3h3" />
      <path
        className={styles.accent}
        d="M1.5 9.5V7a4 4 0 0 1 4-4h2M6 1l2 2-2 2"
      />
    </Icon>
  );
}

export function SaveIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M2.5 2.5h9l2 2v9h-11z" />
      <path d="M5 2.5v3h5v-3M4.5 13.5v-4h7v4" />
    </Icon>
  );
}

export function SaveAllIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path className={styles.accent} d="M4.5 4.5v-3h8l2 2v8h-3" />
      <path d="M1.5 4.5h8l2 2v8h-10z" />
      <path d="M3.5 4.5V7h4V4.5M3.5 14.5V11h6v3.5" />
    </Icon>
  );
}

export function EngineQueryIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M5.5 6.5v-5h6l3 3v10h-7M11.5 1.5v3h3M8.5 7.5h4M9.5 9.5h3M9.5 11.5h3" />
      <path
        className={styles.solid}
        d="M1 9.2c0-.9 1.6-1.5 3.5-1.5S8 8.3 8 9.2v4.6c0 .9-1.6 1.5-3.5 1.5S1 14.7 1 13.8z"
      />
    </Icon>
  );
}

export function UndoIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M5.5 3.5l-3 3 3 3M2.5 6.5h7a3.5 3.5 0 0 1 0 7h-3" />
    </Icon>
  );
}

export function RedoIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M10.5 3.5l3 3-3 3M13.5 6.5h-7a3.5 3.5 0 0 0 0 7h3" />
    </Icon>
  );
}

export function DeployIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M5.5 6.5v-4h9v9h-4M5.5 4.5h9" />
      <path d="M4 15.5v-3l1.5-3 1.5 3v3zM2.5 15.5 4 14M8.5 15.5 7 14" />
    </Icon>
  );
}

export function MoreIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path className={styles.solid} d="M2 7h2v2H2zM7 7h2v2H7zm5 0h2v2h-2z" />
    </Icon>
  );
}

export function ParseIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path className={styles.bold} d="M3 8.5l3 3 7-7.5" />
    </Icon>
  );
}

export function EstimatedPlanIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <rect x="1.5" y="1.5" width="4" height="4" />
      <rect x="10.5" y="1.5" width="4" height="4" />
      <rect x="1.5" y="10.5" width="4" height="4" />
      <path d="M10.5 3.5h-4M8 2 6.5 3.5 8 5M3.5 10.5v-4M2 8l1.5-1.5L5 8" />
      <path d="M10.5 11.5h4l-2 3z" />
    </Icon>
  );
}

export function QueryDesignerIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M4.5 4.5v-3h10v9h-3" />
      <path d="M1.5 4.5h10v10h-10zM1.5 6.5h10M3.5 9.5h6M3.5 11.5h4" />
    </Icon>
  );
}

export function QueryOptionsIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M3.5 1.5h9v13h-9zM3.5 7.5h9M5.5 4.5h5M5.5 10h5M5.5 12h3" />
    </Icon>
  );
}

export function ActualPlanIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <rect x="1.5" y="1.5" width="4" height="4" />
      <rect x="10.5" y="1.5" width="4" height="4" />
      <rect x="1.5" y="10.5" width="4" height="4" />
      <path d="M10.5 3.5h-4M8 2 6.5 3.5 8 5M3.5 10.5v-4M2 8l1.5-1.5L5 8" />
    </Icon>
  );
}

export function LiveStatisticsIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <rect x="1.5" y="1.5" width="4" height="4" />
      <rect x="10.5" y="1.5" width="4" height="4" />
      <rect x="1.5" y="10.5" width="4" height="4" />
      <path d="M10.5 3.5h-4M8 2 6.5 3.5 8 5M3.5 10.5v-4M2 8l1.5-1.5L5 8" />
      <circle className={styles.solid} cx="12" cy="12" r="3.5" />
      <path className={styles.cut} d="M10.4 12l1.1 1.1 2.1-2.2" />
    </Icon>
  );
}

export function ClientStatisticsIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M1.5 5.5h4v9h-4zM2.5 12.5h2M7.5 2.5h7v7h-7z" />
      <path d="M9.5 8V6.5M11 8V4.5M12.5 8V5.5" />
    </Icon>
  );
}

export function ResultsTextIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M5.5 8.5v-7h6l3 3v10h-6M11.5 1.5v3h3M8.5 6.5h4M9.5 8.5h3M9.5 10.5h3M9.5 12.5h3" />
      <path className={styles.solid} d="M.5 9.5h7v6h-7z" />
      <path className={styles.cut} d="M2.5 11.5v3H4v-3zM5.5 11.5v3" />
    </Icon>
  );
}

export function ResultsGridIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M3.5 8.5v-7h11v12h-6M3.5 4.5h11M8.5 7.5h6M8.5 10.5h6M7 1.5v7M10.5 1.5v12" />
      <path className={styles.solid} d="M.5 9.5h7v6h-7z" />
      <path className={styles.cut} d="M2.5 11.5v3H4v-3zM5.5 11.5v3" />
    </Icon>
  );
}

export function ResultsFileIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M5.5 8.5v-7h5l4 4v9h-6M10.5 1.5v4h4" />
      <path className={styles.solid} d="M.5 9.5h7v6h-7z" />
      <path className={styles.cut} d="M2.5 11.5v3H4v-3zM5.5 11.5v3" />
    </Icon>
  );
}

export function CommentIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M7.5 4.5h7M7.5 8h7M7.5 11.5h7" />
      <path
        className={styles.accent}
        d="M1.5 4.5H3M4 4.5h1.5M1.5 8H3M4 8h1.5M1.5 11.5H3M4 11.5h1.5"
      />
    </Icon>
  );
}

export function UncommentIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M7.5 4.5h7M7.5 8h7M7.5 11.5h7" />
      <path
        className={styles.accent}
        d="M5 12.5V7a2.5 2.5 0 0 0-2.5-2.5h-1M3 3 1.5 4.5 3 6"
      />
    </Icon>
  );
}

export function DecreaseIndentIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M7.5 3.5h7M7.5 6.5h7M7.5 9.5h7M7.5 12.5h7" />
      <path className={styles.accent} d="M4.5 5.5 2 8l2.5 2.5" />
    </Icon>
  );
}

export function IncreaseIndentIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <path d="M7.5 3.5h7M7.5 6.5h7M7.5 9.5h7M7.5 12.5h7" />
      <path className={styles.accent} d="M2 5.5 4.5 8 2 10.5" />
    </Icon>
  );
}

export function TemplateParametersIcon(props: Readonly<IconProps>) {
  return (
    <Icon {...props}>
      <circle cx="10" cy="9" r="1.8" />
      <path d="M11.8 9v.8a1.4 1.4 0 0 0 2.7.4A4.6 4.6 0 1 0 12.4 13" />
      <path className={styles.accent} d="M1 6.5h4.5M4 4.5l2 2-2 2" />
    </Icon>
  );
}
