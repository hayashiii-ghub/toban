import type { AssignmentMode, Member, TaskGroup } from "@/rotation/types";
import { computeAssignments } from "@/rotation/utils";
import {
  sectorAngles,
  sectorMidpoint,
  sectorPath,
} from "@/rotation/discGeometry";
import { useT } from "@/i18n";

interface RotationDiscProps {
  groups: TaskGroup[];
  members: Member[];
  /** ポインタ位置（= effectiveRotation）。現在の周回を盤面に焼き込む。 */
  rotation: number;
  assignmentMode?: AssignmentMode;
}

// viewBox 座標（正方・mm 換算は印刷CSS側でスケール）。
const SIZE = 360;
const C = SIZE / 2;
const R_CUT = 174; // 外周カット線
const ROLE_OUTER = 170;
const ROLE_INNER = 108; // = メンバーリング外周（ここがカット線：内側ディスクを切り離して回す）
const MEMBER_INNER = 46;
const HUB = MEMBER_INNER;
const ROLE_LABEL_R = (ROLE_OUTER + ROLE_INNER) / 2;
const MEMBER_LABEL_R = (ROLE_INNER + MEMBER_INNER) / 2;

export function RotationDisc({
  groups,
  members,
  rotation,
  assignmentMode,
}: RotationDiscProps) {
  const t = useT();
  const pool = members.filter(m => !m.skipped);

  // 単一回転ディスクで忠実に表現できる構成かを判定する。
  // - group 専用プール（memberIds）があると1枚の盤に乗らない
  // - 役割数 > メンバー数だと1人が複数役割を持ち、1セクター=1役割で表せない
  const hasGroupPool = groups.some(g => g.memberIds && g.memberIds.length > 0);
  const representable =
    groups.length > 0 &&
    pool.length > 0 &&
    !hasGroupPool &&
    groups.length <= pool.length;

  if (!representable) {
    // 原因別に「どうすれば円盤にできるか」まで伝える。タスク超過は現在の人数・タスク数を埋め込む。
    const message = hasGroupPool
      ? t("disc.unsupportedGroupPool")
      : groups.length > pool.length
        ? t("disc.unsupportedTooManyTasks", {
            members: pool.length,
            tasks: groups.length,
          })
        : t("disc.unsupported");
    return (
      <div className="px-3 sm:px-4 py-3 sm:py-4 rotation-print-disc-section">
        <div
          className="max-w-2xl mx-auto theme-border theme-shadow-sm p-4 text-center"
          style={{
            backgroundColor: "var(--dt-card-bg)",
            borderRadius: "var(--dt-border-radius)",
          }}
        >
          <p
            className="text-sm font-bold"
            style={{ color: "var(--dt-text-secondary)" }}
          >
            {message}
          </p>
        </div>
      </div>
    );
  }

  // アプリ全体（cards/table/calendar）と同じ computeAssignments から
  // メンバー→役割の対応を作り、盤面の整合性を保証する。
  const assignments = computeAssignments(
    groups,
    members,
    rotation,
    assignmentMode
  );
  const roleByMemberId = new Map<string, TaskGroup>(
    assignments.map(a => [a.member.id, a.group])
  );
  const n = pool.length;
  const hasOffDuty = pool.length > groups.length;

  // 1セクター分の幾何＋ラベルを先に確定し、3枚（全体／外円／内円）で同一座標を使い回す。
  // 同じ viewBox・中心・半径で刷ることが、切って重ねたとき回る前提になる。
  const segments = pool.map((member, i) => {
    const { startDeg, endDeg } = sectorAngles(n, i);
    const role = roleByMemberId.get(member.id);
    return {
      member,
      role,
      rolePath: sectorPath(C, C, ROLE_INNER, ROLE_OUTER, startDeg, endDeg),
      memberPath: sectorPath(C, C, MEMBER_INNER, ROLE_INNER, startDeg, endDeg),
      roleLabelPos: sectorMidpoint(C, C, ROLE_LABEL_R, startDeg, endDeg),
      memberLabelPos: sectorMidpoint(C, C, MEMBER_LABEL_R, startDeg, endDeg),
      roleText: role
        ? `${role.emoji} ${role.tasks.join("・")}`
        : `💤 ${t("disc.offDuty")}`,
    };
  });

  // mode: "full"=組み立て済み（画面＆印刷1枚目） / "outer"=役割リングのみ / "inner"=担当者ディスクのみ。
  const renderWheel = (mode: "full" | "outer" | "inner", ariaLabel: string) => (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full h-auto rotation-print-disc-svg"
      role="img"
      aria-label={ariaLabel}
      style={{
        maxWidth: "min(100%, 520px)",
        margin: "0 auto",
        display: "block",
      }}
    >
      {/* 外周カット線（外円が乗る側にだけ引く） */}
      {mode !== "inner" && (
        <circle
          cx={C}
          cy={C}
          r={R_CUT}
          fill="none"
          stroke="var(--dt-border-color, #333)"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      )}

      {segments.map(seg => (
        <g key={seg.member.id}>
          {/* hover ツールチップ / a11y。盤面は絵文字のみなので、ここで役割：メンバーを補う。 */}
          <title>{`${seg.roleText}：${seg.member.name}`}</title>
          {/* 役割リング（外・固定側）。役割名は横書きだと盤からはみ出すため絵文字のみ、フルテキストは凡例で担保。 */}
          {mode !== "inner" && (
            <>
              <path
                d={seg.rolePath}
                fill="var(--dt-card-bg, #fff)"
                stroke="var(--dt-border-color, #333)"
                strokeWidth={1}
              />
              <text
                x={seg.roleLabelPos.x}
                y={seg.roleLabelPos.y}
                fontSize={18}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {seg.role ? seg.role.emoji : "💤"}
              </text>
            </>
          )}
          {/* メンバーリング（内・回す側） */}
          {mode !== "outer" && (
            <>
              <path
                d={seg.memberPath}
                fill={seg.member.bgColor}
                stroke="var(--dt-border-color, #333)"
                strokeWidth={1}
              />
              <text
                x={seg.memberLabelPos.x}
                y={seg.memberLabelPos.y}
                fontSize={13}
                fontWeight={800}
                textAnchor="middle"
                dominantBaseline="central"
                fill={seg.member.textColor}
              >
                {seg.member.name}
              </text>
            </>
          )}
        </g>
      ))}

      {/* 中心ハブ（全体・内円のみ。外円は中心が穴になる） */}
      {mode !== "outer" && (
        <circle
          cx={C}
          cy={C}
          r={HUB}
          fill="var(--dt-card-bg, #fff)"
          stroke="var(--dt-border-color, #333)"
          strokeWidth={1}
        />
      )}
      {/* ピン穴（3枚共通の中心基準。ここを合わせて重ねる） */}
      <circle
        cx={C}
        cy={C}
        r={3.5}
        fill="none"
        stroke="var(--dt-border-color, #333)"
        strokeWidth={1}
      />
    </svg>
  );

  const legend = (
    // 凡例：盤面の絵文字に対応する役割名フルテキスト。役割に色は無いためチップは形だけ揃える。
    <ul className="mt-3 flex flex-wrap justify-center gap-1.5 list-none p-0">
      {groups.map(group => (
        <li
          key={group.id}
          className="theme-border inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
          style={{
            backgroundColor: "var(--dt-card-bg)",
            color: "var(--dt-text-secondary)",
          }}
        >
          <span aria-hidden="true">{group.emoji}</span>
          <span>{group.tasks.join("・")}</span>
        </li>
      ))}
      {hasOffDuty && (
        <li
          className="theme-border inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
          style={{
            backgroundColor: "var(--dt-card-bg)",
            color: "var(--dt-text-muted)",
          }}
        >
          <span aria-hidden="true">💤</span>
          <span>{t("disc.offDuty")}</span>
        </li>
      )}
    </ul>
  );

  const caption = (text: string) => (
    <p
      className="text-center text-sm font-bold mb-2"
      style={{ color: "var(--dt-text-secondary)" }}
    >
      {text}
    </p>
  );

  return (
    <>
      {/* 全体（完成イメージ）。画面はこの1枚のみ。印刷では1ページ目。 */}
      <div className="px-3 sm:px-4 py-3 sm:py-4 rotation-print-disc-section">
        <div className="max-w-2xl mx-auto">
          {renderWheel("full", t("view.disc"))}
          {legend}
        </div>
      </div>

      {/* 外円（固定・役割）。画面では隠し、印刷だけ別ページに出す。 */}
      <div className="px-3 sm:px-4 py-3 sm:py-4 rotation-print-disc-section rotation-print-only rotation-print-disc-page">
        <div className="max-w-2xl mx-auto">
          {caption(t("disc.sheetOuter"))}
          {renderWheel("outer", t("disc.sheetOuter"))}
        </div>
      </div>

      {/* 内円（回す・担当者）。画面では隠し、印刷だけ別ページに出す。 */}
      <div className="px-3 sm:px-4 py-3 sm:py-4 rotation-print-disc-section rotation-print-only rotation-print-disc-page">
        <div className="max-w-2xl mx-auto">
          {caption(t("disc.sheetInner"))}
          {renderWheel("inner", t("disc.sheetInner"))}
        </div>
      </div>
    </>
  );
}
