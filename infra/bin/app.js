import { App, Tags } from 'aws-cdk-lib'
import { AppStack } from '../lib/app-stack.js'
import { DataStack } from '../lib/data-stack.js'

const app = new App()
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'ap-northeast-1' }

const data = new DataStack(app, 'SubsKeeperData', { env })

// テーブルはスタック間の参照（Export）を使わず名前で渡す（スタック削除時のデッドロックを避ける）
new AppStack(app, 'SubsKeeperApp', {
  env,
  tableName: 'subskeeper',
  // ローカル開発（npm run dev）からも API を呼べるようにする
  devOrigins: ['http://localhost:5173', 'http://127.0.0.1:5173'],
}).addStackDependency(data)

Tags.of(app).add('project', 'subskeeper')
