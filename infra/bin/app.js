import { App, Tags } from 'aws-cdk-lib'
import { AppStack } from '../lib/app-stack.js'
import { DataStack } from '../lib/data-stack.js'
import { getStage } from '../lib/stages.js'

const app = new App()
// 環境は必ず指定する（npm run deploy:test / deploy:prod が -c stage=… を付ける）
const stage = getStage(app.node.tryGetContext('stage'))
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'ap-northeast-1' }

const data = new DataStack(app, `SubsKeeperData${stage.suffix}`, { env, stage })

// テーブルはスタック間の参照（Export）を使わず名前で渡す（スタック削除時のデッドロックを避ける）
new AppStack(app, `SubsKeeperApp${stage.suffix}`, {
  env,
  stage,
  tableName: data.tableName,
}).addStackDependency(data)

Tags.of(app).add('project', 'subskeeper')
Tags.of(app).add('stage', stage.name)
