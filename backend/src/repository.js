// DynamoDB へのアクセス。キー設計は docs/data-design.md
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb'
import { notifyOn } from '@subskeeper/shared'

const TABLE = process.env.TABLE_NAME
const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
})

const userPk = (userId) => `USER#${userId}`
const SUB_PREFIX = 'SUB#'

export const DEFAULT_PROFILE = { notifyEnabled: true, notifyDaysBefore: 3 }

function toItem(userId, sub, profile) {
  const { id, ...attrs } = sub
  return {
    ...attrs,
    pk: userPk(userId),
    sk: SUB_PREFIX + id,
    billingKey: 'BILLING',
    // 通知 OFF のときは属性を持たせない（NotifyIndex に載らない）
    notifyOn: profile.notifyEnabled ? notifyOn(sub.nextBillingDate, profile.notifyDaysBefore) : undefined,
  }
}

function fromItem(item) {
  const { pk: _pk, sk, billingKey: _billingKey, notifyOn: _notifyOn, ...attrs } = item
  return { id: sk.slice(SUB_PREFIX.length), ...attrs }
}

export async function getProfile(userId) {
  const { Item } = await doc.send(new GetCommand({ TableName: TABLE, Key: { pk: userPk(userId), sk: 'PROFILE' } }))
  if (!Item) return null
  const { pk: _pk, sk: _sk, ...profile } = Item
  return profile
}

export async function putProfile(userId, profile) {
  await doc.send(new PutCommand({ TableName: TABLE, Item: { ...profile, pk: userPk(userId), sk: 'PROFILE' } }))
}

export async function listSubscriptions(userId) {
  const items = []
  let ExclusiveStartKey
  do {
    const res = await doc.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sub)',
        ExpressionAttributeValues: { ':pk': userPk(userId), ':sub': SUB_PREFIX },
        ExclusiveStartKey,
      }),
    )
    items.push(...res.Items)
    ExclusiveStartKey = res.LastEvaluatedKey
  } while (ExclusiveStartKey)
  return items.map(fromItem)
}

export async function getSubscription(userId, id) {
  const { Item } = await doc.send(new GetCommand({ TableName: TABLE, Key: { pk: userPk(userId), sk: SUB_PREFIX + id } }))
  return Item ? fromItem(Item) : null
}

export async function putSubscription(userId, sub, profile) {
  await doc.send(new PutCommand({ TableName: TABLE, Item: toItem(userId, sub, profile) }))
}

export async function deleteSubscription(userId, id) {
  await doc.send(new DeleteCommand({ TableName: TABLE, Key: { pk: userPk(userId), sk: SUB_PREFIX + id } }))
}

// 退会：そのユーザーのアイテムをすべて削除
export async function deleteAllUserData(userId) {
  const subs = await listSubscriptions(userId)
  const keys = [{ pk: userPk(userId), sk: 'PROFILE' }, ...subs.map((s) => ({ pk: userPk(userId), sk: SUB_PREFIX + s.id }))]
  for (let i = 0; i < keys.length; i += 25) {
    let RequestItems = { [TABLE]: keys.slice(i, i + 25).map((Key) => ({ DeleteRequest: { Key } })) }
    // 容量不足で残った分は再送する
    while (RequestItems && Object.keys(RequestItems).length > 0) {
      const res = await doc.send(new BatchWriteCommand({ RequestItems }))
      RequestItems = res.UnprocessedItems
    }
  }
}
