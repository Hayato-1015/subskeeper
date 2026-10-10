import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CfnOutput, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib'
import {
  AllowedMethods,
  Distribution,
  HeadersFrameOption,
  HeadersReferrerPolicy,
  PriceClass,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront'
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins'
import {
  AccountRecovery,
  FeaturePlan,
  UserPool,
  UserPoolClient,
  VerificationEmailStyle,
} from 'aws-cdk-lib/aws-cognito'
import { Table } from 'aws-cdk-lib/aws-dynamodb'
import { Architecture, FunctionUrlAuthType, HttpMethod, Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs'
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs'
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3'
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const frontendDist = path.join(root, 'frontend/dist')

// 認証（Cognito）・API（Lambda Function URL）・画面の配信（S3 + CloudFront）
// CORS に CloudFront のドメインを使うため、スタックを分けずに1つにまとめている
export class AppStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props)
    const { tableName, devOrigins } = props

    // ---- 認証（Cognito）----
    const userPool = new UserPool(this, 'UserPool', {
      userPoolName: 'subskeeper-users',
      // 一番安いプラン（独自ログイン画面なので Essentials の機能は不要）
      featurePlan: FeaturePlan.LITE,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: { email: { required: true, mutable: true } },
      passwordPolicy: { minLength: 8, requireLowercase: true, requireDigits: true, requireUppercase: false, requireSymbols: false },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      userVerification: {
        emailStyle: VerificationEmailStyle.CODE,
        emailSubject: 'SubsKeeper 確認コード',
        emailBody: 'SubsKeeper の確認コードは {####} です。',
      },
      // 利用者のアカウントを消さないよう残す
      removalPolicy: RemovalPolicy.RETAIN,
    })

    const userPoolClient = new UserPoolClient(this, 'WebClient', {
      userPool,
      // ブラウザから使う公開クライアントなのでシークレットなし
      generateSecret: false,
      authFlows: { userPassword: true },
      preventUserExistenceErrors: true,
      enableTokenRevocation: true,
      idTokenValidity: Duration.hours(1),
      accessTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(7),
    })

    // ---- 画面の配信（S3 + CloudFront：標準ドメインを使い、独自ドメインは使わない）----
    const siteBucket = new Bucket(this, 'SiteBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      // 中身は frontend/dist から毎回作り直せるので、スタック削除時に消す
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })

    const securityHeaders = new ResponseHeadersPolicy(this, 'SecurityHeaders', {
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          contentSecurityPolicy: [
            "default-src 'self'",
            "script-src 'self'",
            // React の style 属性（カテゴリ色）のため
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data:",
            `connect-src 'self' https://cognito-idp.${this.region}.amazonaws.com https://*.lambda-url.${this.region}.on.aws`,
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; '),
          override: true,
        },
        strictTransportSecurity: { accessControlMaxAge: Duration.days(365), includeSubdomains: true, override: true },
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: HeadersFrameOption.DENY, override: true },
        referrerPolicy: { referrerPolicy: HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN, override: true },
      },
    })

    const distribution = new Distribution(this, 'Site', {
      defaultRootObject: 'index.html',
      // 日本のエッジを含む価格クラス（無料枠は価格クラスに関係なく適用）
      priceClass: PriceClass.PRICE_CLASS_200,
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
        responseHeadersPolicy: securityHeaders,
      },
    })
    const siteUrl = `https://${distribution.distributionDomainName}`

    // ---- API（Lambda Function URL：API Gateway と違い期限なしで無料）----
    const table = Table.fromTableAttributes(this, 'Table', {
      tableName,
      globalIndexes: ['NotifyIndex', 'BillingIndex'],
    })

    const logGroup = new LogGroup(this, 'ApiLogs', {
      logGroupName: '/subskeeper/api',
      retention: RetentionDays.TWO_WEEKS,
      removalPolicy: RemovalPolicy.DESTROY,
    })

    const apiFn = new NodejsFunction(this, 'ApiFunction', {
      entry: path.join(root, 'backend/src/handler.js'),
      projectRoot: root,
      depsLockFilePath: path.join(root, 'package-lock.json'),
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      memorySize: 256,
      timeout: Duration.seconds(10),
      logGroup,
      environment: {
        TABLE_NAME: tableName,
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      },
      bundling: {
        format: OutputFormat.ESM,
        minify: true,
        // ESM で require を使う依存に備える
        banner: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
      },
    })
    table.grantReadWriteData(apiFn)

    const apiUrl = apiFn.addFunctionUrl({
      authType: FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: [siteUrl, ...devOrigins],
        allowedMethods: [HttpMethod.GET, HttpMethod.POST, HttpMethod.PUT, HttpMethod.DELETE],
        allowedHeaders: ['authorization', 'content-type'],
        maxAge: Duration.hours(1),
      },
    })

    // ---- 画面のアップロード（ビルド済みの frontend/dist ＋ 接続先の config.json）----
    if (!existsSync(path.join(frontendDist, 'index.html'))) {
      throw new Error('frontend/dist がありません。先に npm run build -w frontend を実行してください')
    }
    new BucketDeployment(this, 'DeploySite', {
      destinationBucket: siteBucket,
      sources: [
        Source.asset(frontendDist),
        Source.jsonData('config.json', {
          region: this.region,
          userPoolClientId: userPoolClient.userPoolClientId,
          apiUrl: apiUrl.url,
        }),
      ],
      // デプロイのたびにキャッシュを消す（月1,000パスまで無料）
      distribution,
      distributionPaths: ['/*'],
      memoryLimit: 256,
    })

    new CfnOutput(this, 'SiteUrl', { value: siteUrl })
    new CfnOutput(this, 'Region', { value: this.region })
    new CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId })
    new CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId })
    new CfnOutput(this, 'ApiUrl', { value: apiUrl.url })
  }
}
