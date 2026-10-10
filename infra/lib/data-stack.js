import { CfnOutput, RemovalPolicy, Stack } from 'aws-cdk-lib'
import { AttributeType, BillingMode, ProjectionType, Table } from 'aws-cdk-lib/aws-dynamodb'

// 期限なし無料枠はプロビジョンドモードのみ（25 RCU / 25 WCU / 25 GB、GSI 分も含む）
// テーブル 2+2、GSI 1+1 ×2 = 合計 4 RCU / 4 WCU
// TableV2 は書き込み容量に自動スケーリング（CloudWatch アラームを作る）が必須なので、固定容量にできる Table を使う
const TABLE_CAPACITY = { readCapacity: 2, writeCapacity: 2 }
const INDEX_CAPACITY = { readCapacity: 1, writeCapacity: 1 }

// データ設計は docs/data-design.md を参照
export class DataStack extends Stack {
  constructor(scope, id, props) {
    // データを持つスタックなので誤削除を防ぐ
    super(scope, id, { ...props, terminationProtection: true })

    this.table = new Table(this, 'Table', {
      tableName: 'subskeeper',
      partitionKey: { name: 'pk', type: AttributeType.STRING },
      sortKey: { name: 'sk', type: AttributeType.STRING },
      billingMode: BillingMode.PROVISIONED,
      ...TABLE_CAPACITY,
      deletionProtection: true,
      removalPolicy: RemovalPolicy.RETAIN,
      // PITR は有料のため OFF
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: false },
    })

    // 今日通知すべきサブスクを全ユーザー横断で取得（通知OFFなら notifyOn を持たない＝載らない）
    this.table.addGlobalSecondaryIndex({
      indexName: 'NotifyIndex',
      partitionKey: { name: 'notifyOn', type: AttributeType.STRING },
      sortKey: { name: 'pk', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
      ...INDEX_CAPACITY,
    })

    // 繰り越し対象（nextBillingDate < 今日）を範囲検索するため、PK は固定値 'BILLING'
    this.table.addGlobalSecondaryIndex({
      indexName: 'BillingIndex',
      partitionKey: { name: 'billingKey', type: AttributeType.STRING },
      sortKey: { name: 'nextBillingDate', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
      ...INDEX_CAPACITY,
    })

    new CfnOutput(this, 'TableName', { value: this.table.tableName })
  }
}
