// デプロイ前の確認：どのブランチから、どの環境へデプロイしてよいか
//   prod：master ブランチ・未コミットの変更なし・GitHub の master と同じ状態のときだけ
//   test：develop 以外からでもデプロイできるが、注意を出す
import { execSync } from 'node:child_process'

const stage = process.argv[2]
const git = (cmd) => execSync(`git ${cmd}`, { encoding: 'utf8' }).trim()
const fail = (message) => {
  console.error(`\n✖ ${message}\n`)
  process.exit(1)
}

const branch = git('branch --show-current')

if (stage === 'prod') {
  if (branch !== 'master') fail(`本番へのデプロイは master ブランチから行います（今は ${branch}）`)
  if (git('status --porcelain')) fail('未コミットの変更があります。コミットしてから本番へデプロイしてください')
  git('fetch -q origin master')
  if (git('rev-parse HEAD') !== git('rev-parse origin/master')) {
    fail('この PC の master と GitHub の master が違います。push / pull で揃えてから本番へデプロイしてください')
  }
  console.log('✔ 本番（master）へデプロイします')
} else if (stage === 'test') {
  if (branch !== 'develop') console.warn(`⚠ テスト環境へ ${branch} ブランチの内容をデプロイします（通常は develop）`)
  else console.log('✔ テスト（develop）へデプロイします')
} else {
  fail('使い方: node check-branch.js test|prod')
}
