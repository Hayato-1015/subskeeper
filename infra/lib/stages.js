// 環境（ステージ）ごとの名前と設定
//   prod：本番（master ブランチ）。最初に作った環境をそのまま使うため、名前に接尾辞を付けない
//   test：テスト（develop ブランチ）。ローカル開発（npm run dev）もここにつなぐ
export const STAGES = {
  prod: {
    suffix: '',
    label: '本番',
    devOrigins: [],
    // データを持つので誤削除を防ぐ
    protectData: true,
  },
  test: {
    suffix: '-test',
    label: 'テスト',
    devOrigins: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    // 作り直せるので、スタックを消したら一緒に消す
    protectData: false,
  },
}

export function getStage(name) {
  const stage = STAGES[name]
  if (!stage) {
    throw new Error(`stage を指定してください（-c stage=test または -c stage=prod）。指定された値: ${name ?? '(なし)'}`)
  }
  return { name, ...stage }
}
