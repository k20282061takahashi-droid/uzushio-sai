"use client";

import { useState } from "react";
import FloatPanel from "./FloatPanel";
import {
  BOOTH_TYPE_LABELS,
  createBoothsBulk,
  type Booth,
  type BoothType,
  type NewBoothInput,
} from "@/lib/booth";

// スプレッドシートやExcelからコピーした一覧を貼り付けて、企画をまとめて登録する画面。
//
// 1行に1件。タブ区切り（Excelからコピーするとこうなる）でもカンマ区切りでも読めます。
//   例）3年A組	クラス企画	高校棟
//   例）3年A組,クラス企画,高校棟
// クラス名だけを並べても登録できます。

const TYPE_ALIASES: Record<string, BoothType> = {
  クラス企画: "class",
  クラス: "class",
  学年企画: "grade",
  学年: "grade",
  部活動: "club",
  部活: "club",
  有志企画: "volunteer",
  有志: "volunteer",
  売店: "shop",
  学校説明: "info",
  説明会: "info",
  "同窓会・後援会": "alumni",
  同窓会: "alumni",
  後援会: "alumni",
};

type ParsedRow = NewBoothInput & { raw: string; warning?: string };

function parseText(text: string, defaultType: BoothType): ParsedRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      // タブ区切りを優先し、無ければカンマ・読点でも区切る
      const cells = (line.includes("\t") ? line.split("\t") : line.split(/[,，]/))
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      const name = cells[0] ?? "";
      const typeText = cells[1] ?? "";
      const location = cells[2] ?? "";

      const type = TYPE_ALIASES[typeText] ?? defaultType;
      const warning =
        typeText && !TYPE_ALIASES[typeText]
          ? `「${typeText}」は種別として読めなかったので、既定の種別にしました`
          : undefined;

      return {
        raw: line,
        name,
        type,
        location: location || null,
        warning,
      };
    });
}

export default function BulkImportFloat({
  open,
  onClose,
  existingBooths,
}: {
  open: boolean;
  onClose: () => void;
  existingBooths: Booth[];
}) {
  const [text, setText] = useState("");
  const [defaultType, setDefaultType] = useState<BoothType>("class");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: string[] } | null>(
    null,
  );

  const rows = parseText(text, defaultType);
  const existingNames = existingBooths.map((b) => b.name);
  const duplicates = rows.filter((r) => existingNames.includes(r.name));

  async function submit() {
    setSaving(true);
    const res = await createBoothsBulk(
      rows.map(({ name, type, location }) => ({ name, type, location })),
      existingNames,
    );
    setSaving(false);
    setResult(res);
    setText("");
  }

  return (
    <FloatPanel
      open={open}
      title="企画をまとめて登録"
      subtitle="スプレッドシートやExcelからコピーして貼り付けてください"
      onClose={() => {
        setResult(null);
        onClose();
      }}
      width="wide"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-2 rounded-lg border border-white/10 bg-neutral-950/70 p-3 text-xs text-neutral-400">
            <p className="mb-1 font-medium text-neutral-300">貼り付け方</p>
            <p>1行につき1つの企画。列は左から順に次のとおりです。</p>
            <p className="mt-1 font-mono text-[13px] text-neutral-300">
              クラス名（必須） / 種別 / 場所
            </p>
            <p className="mt-1">
              クラス名だけを並べても登録できます。種別が空欄のときは下で選んだ種別になります。
            </p>
          </div>

          <label className="mb-2 flex items-center gap-2 text-xs text-neutral-400">
            種別が空欄のときは
            <select
              value={defaultType}
              onChange={(e) => setDefaultType(e.target.value as BoothType)}
              className="rounded-lg border border-white/10 bg-neutral-950 px-2 py-1 text-xs text-neutral-200"
            >
              {Object.entries(BOOTH_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            として登録
          </label>

          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setResult(null);
            }}
            rows={14}
            placeholder={"3年A組\t クラス企画\t 高校棟\n3年B組\t クラス企画\t 高校棟\n吹奏楽部\t 部活動\t 体育館"}
            className="w-full rounded-lg border border-white/10 bg-neutral-950 p-3 font-mono text-xs"
          />
        </section>

        <section>
          <h3 className="mb-2 text-sm font-medium text-neutral-300">
            登録される内容（{rows.length}件）
          </h3>

          {duplicates.length > 0 && (
            <p className="mb-2 rounded-lg bg-amber-400/15 px-3 py-2 text-xs text-amber-200">
              すでに登録されている名前が{duplicates.length}件あります。
              これらは飛ばして、二重登録にならないようにします。
            </p>
          )}

          {rows.length === 0 ? (
            <p className="text-xs text-neutral-400">
              左に貼り付けると、ここに確認用の一覧が出ます
            </p>
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-neutral-950/50 p-2">
              {rows.map((r, i) => {
                const dup = existingNames.includes(r.name);
                return (
                  <li
                    key={i}
                    className={`rounded px-2 py-1 text-xs ${
                      dup ? "bg-amber-400/10 text-amber-200" : "text-neutral-300"
                    }`}
                  >
                    <span className="font-medium">{r.name || "（名前なし）"}</span>
                    <span className="ml-2 text-neutral-400">
                      {BOOTH_TYPE_LABELS[r.type]}
                      {r.location && ` ・ ${r.location}`}
                    </span>
                    {dup && <span className="ml-2">（登録済みのため飛ばします）</span>}
                    {r.warning && (
                      <span className="ml-2 text-neutral-400">{r.warning}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {result && (
            <div className="mt-3 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs text-emerald-200">
              {result.created}件を登録しました。
              {result.skipped.length > 0 &&
                `（${result.skipped.length}件は登録済みのため飛ばしました）`}
            </div>
          )}

          <button
            onClick={submit}
            disabled={saving || rows.length === 0}
            className="mt-3 w-full rounded-lg bg-emerald-500 p-3 text-sm font-medium text-white active:scale-95 disabled:opacity-40"
          >
            {saving
              ? "登録中..."
              : `${rows.length - duplicates.length}件を登録する`}
          </button>
        </section>
      </div>
    </FloatPanel>
  );
}
