# データ設計（DynamoDB）

テーブル名：`subskeeper`（東京リージョン）／定義：[infra/lib/data-stack.js](../infra/lib/data-stack.js)

## キャパシティ（無料枠に収める）

期限なし無料枠は **プロビジョンドモードのみ**（25 RCU / 25 WCU / 25 GB、GSI 分も合算）。オンデマンドにはしない。

| 対象 | RCU | WCU |
|---|---|---|
| テーブル | 2 | 2 |
| NotifyIndex | 1 | 1 |
| BillingIndex | 1 | 1 |
| **合計** | **4** | **4** |

- 自動スケーリングは使わない（CloudWatch アラームが作られるため）
- PITR（ポイントインタイムリカバリ）は有料なので OFF
- 削除保護 ON、スタック削除時もテーブルは残す

## アイテム

| pk | sk | 内容 |
|---|---|---|
| `USER#{userId}` | `PROFILE` | `email`, `notifyEnabled`, `notifyDaysBefore` |
| `USER#{userId}` | `SUB#{subId}` | サブスク本体（下表）＋インデックス用属性 |

`userId` は必ず Cognito の認証トークン（`sub`）から取る。リクエストの値は使わない。

### サブスク（`SUB#`）の属性

| 属性 | 例 | 備考 |
|---|---|---|
| `name` | `Netflix` | 50文字以内 |
| `amount` | `1490` | 円、0以上 |
| `cycle` | `monthly` / `yearly` / `weekly` / `months` | |
| `intervalMonths` | `3` | `months` のときのみ |
| `nextBillingDate` | `2026-10-12` | |
| `billingDay` | `31` | 本来の請求日。月末の繰り越しで日付を戻すために使う |
| `category` | `動画` | |
| `cancelUrl`, `memo` | | 任意 |
| `createdAt`, `updatedAt` | ISO 日時 | |
| `notifyOn` | `2026-10-09` | **NotifyIndex 用**。`nextBillingDate − notifyDaysBefore`。通知 OFF のときは属性ごと削除 |
| `billingKey` | `BILLING` | **BillingIndex 用**。固定値 |

## インデックス

| 名前 | PK | SK | 用途（日次バッチ） |
|---|---|---|---|
| NotifyIndex | `notifyOn` | `pk` | `notifyOn = 今日` で通知対象を全ユーザー横断で取得 |
| BillingIndex | `billingKey` | `nextBillingDate` | `billingKey = 'BILLING' AND nextBillingDate < 今日` で繰り越し対象を取得 |

## 仕様書からの変更点

1. **BillingIndex の PK を固定値に**：仕様書は `nextBillingDate` を PK にしていたが、PK は等価検索しかできず「今日より前」を取れないため
2. **通知設定の変更時に `notifyOn` を再計算**：通知日数の変更・通知 ON/OFF のたびに、そのユーザーの全サブスクの `notifyOn` を更新する
3. **`billingDay` を追加**：1/31 → 2/28 → 3/31 のように元の日付に戻すため
